/**
 * Migration Manager - Core migration logic for moving servers from project to global config
 *
 * Feature: 003-add-migrate-to
 * Purpose: Atomic server migration operations with conflict resolution
 */

import type {
  MigrationOperation,
  ConflictResolution,
  BackupPaths,
  ServerMigrationResult,
  ResolutionType,
  MCPServerConfig,
  MemoryMigrationResult,
} from '../models/types';

/**
 * Initiate migration operation
 *
 * Creates MigrationOperation, loads configurations, detects conflicts
 *
 * @param projectDir - Absolute path to project directory
 * @param selectedServers - Servers to migrate (hierarchyLevel === 1)
 * @returns MigrationOperation with state 'validating' or 'conflict_resolution'
 * @throws Error if projectDir invalid or no servers selected
 */
export async function initiateMigration(
  projectDir: string,
  selectedServers: any[] // TODO: Replace with MCPServer type
): Promise<MigrationOperation> {
  const fs = require('fs-extra');
  const path = require('path');
  const os = require('os');

  // Validation
  if (!projectDir || projectDir.trim().length === 0) {
    throw new Error('Invalid projectDir: must be non-empty string');
  }

  if (!selectedServers || selectedServers.length === 0) {
    throw new Error('No servers selected for migration');
  }

  // Validate all selected servers are project-local (hierarchyLevel === 1)
  const invalidServers = selectedServers.filter(
    (server: any) => server.hierarchyLevel !== 1
  );
  if (invalidServers.length > 0) {
    throw new Error('All selected servers must be project-local (hierarchyLevel === 1)');
  }

  // Create operation
  const operation: MigrationOperation = {
    id: `migration-${Date.now()}`,
    projectDir,
    state: 'validating',
    selectedServers,
    conflicts: [],
    createdAt: new Date(),
  };

  try {
    // Load global configuration
    const globalConfigPath = path.join(os.homedir(), '.claude.json');
    let globalConfig: any = { mcpServers: {} };

    if (await fs.pathExists(globalConfigPath)) {
      globalConfig = await fs.readJSON(globalConfigPath);
    }

    // Detect conflicts
    const conflicts = detectConflicts(selectedServers, globalConfig);

    operation.conflicts = conflicts;
    operation.state = conflicts.length > 0 ? 'conflict_resolution' : 'ready';

    return operation;
  } catch (error) {
    operation.state = 'error';
    operation.error = error as Error;
    throw error;
  }
}

/**
 * Detect conflicts between project and global configurations
 *
 * Compares server names and configurations to identify collisions
 *
 * @param projectServers - Servers from .mcp.json
 * @param globalConfig - Parsed ~/.claude.json content
 * @returns Array of conflicts requiring resolution (empty if none)
 */
export function detectConflicts(
  projectServers: any[], // TODO: Replace with MCPServer type
  globalConfig: any
): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];
  const globalServerNames = new Set(
    Object.keys(globalConfig?.mcpServers || {})
  );

  for (const server of projectServers) {
    if (globalServerNames.has(server.name)) {
      const globalServer = globalConfig.mcpServers[server.name];

      conflicts.push({
        serverName: server.name,
        projectConfig: {
          command: server.command,
          args: server.args,
          env: server.env,
          _mcpToggleBlocked: server._mcpToggleBlocked,
          _mcpToggleBlockedAt: server._mcpToggleBlockedAt,
          _mcpToggleOriginal: server._mcpToggleOriginal,
        },
        globalConfig: {
          command: globalServer.command,
          args: globalServer.args,
          env: globalServer.env,
          _mcpToggleBlocked: globalServer._mcpToggleBlocked,
          _mcpToggleBlockedAt: globalServer._mcpToggleBlockedAt,
          _mcpToggleOriginal: globalServer._mcpToggleOriginal,
        },
        resolution: 'skip', // default resolution
        configDiff: {
          command: { project: server.command, global: globalServer.command },
          args: server.args && globalServer.args ? {
            project: server.args,
            global: globalServer.args,
          } : undefined,
          env: server.env && globalServer.env ? {
            project: server.env,
            global: globalServer.env,
          } : undefined,
          hasBlockingMetadata: {
            project: !!server._mcpToggleBlocked,
            global: !!globalServer._mcpToggleBlocked,
          },
        },
      });
    }
  }

  return conflicts;
}

/**
 * Execute migration with atomic file operations
 *
 * Performs backup, writes both config files, verifies, and cleans up
 * or rolls back on failure.
 *
 * @param operation - MigrationOperation in 'ready' state
 * @returns Updated operation with state 'complete' or 'error'
 * @throws Error if operation not in 'ready' state
 */
export async function executeMigration(
  operation: MigrationOperation
): Promise<MigrationOperation> {
  const fs = require('fs-extra');
  const path = require('path');
  const os = require('os');
  const { atomicWrite } = require('../utils/file-utils');

  if (operation.state !== 'ready') {
    throw new Error(`Cannot execute migration: operation state is '${operation.state}', expected 'ready'`);
  }

  const startTime = Date.now();
  const updatedOperation: MigrationOperation = {
    ...operation,
    state: 'executing',
  };

  try {
    // Phase 1: Create backups
    const backupPaths = await createBackups(operation.projectDir);
    updatedOperation.backupPaths = backupPaths;

    // Phase 2: Apply resolutions to server list
    const serversToMigrate = applyResolutions(
      operation.selectedServers,
      operation.conflicts
    );

    // Phase 3: Load configurations
    const projectConfigPath = path.join(operation.projectDir, '.mcp.json');
    const globalConfigPath = path.join(os.homedir(), '.claude.json');

    let projectConfig: any = { mcpServers: {} };
    let globalConfig: any = { mcpServers: {} };

    if (await fs.pathExists(projectConfigPath)) {
      projectConfig = await fs.readJSON(projectConfigPath);
    }

    if (await fs.pathExists(globalConfigPath)) {
      globalConfig = await fs.readJSON(globalConfigPath);
    }

    // Phase 4: Merge servers into global config
    for (const server of serversToMigrate) {
      globalConfig.mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        env: server.env,
        _mcpToggleBlocked: server._mcpToggleBlocked,
        _mcpToggleBlockedAt: server._mcpToggleBlockedAt,
        _mcpToggleOriginal: server._mcpToggleOriginal,
      };

      // Remove from project config (set hierarchyLevel = 0)
      delete projectConfig.mcpServers[server.name];
    }

    // Phase 5: Write updated configurations atomically
    await atomicWrite(globalConfigPath, JSON.stringify(globalConfig, null, 2));
    await atomicWrite(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    // Phase 6: Verification
    const verifyGlobal = await fs.readJSON(globalConfigPath);
    const verifyProject = await fs.readJSON(projectConfigPath);

    if (!verifyGlobal || !verifyProject) {
      throw new Error('Verification failed: Unable to read written config files');
    }

    // Phase 7: Success - clean up backups
    await fs.remove(backupPaths.projectBackup).catch(() => {/* ignore */});
    await fs.remove(backupPaths.globalBackup).catch(() => {/* ignore */});

    // Update operation with success result
    const duration = Date.now() - startTime;
    const skippedCount = operation.conflicts.filter(c => c.resolution === 'skip').length;

    updatedOperation.state = 'complete';
    updatedOperation.completedAt = new Date();
    updatedOperation.result = {
      success: true,
      migratedCount: serversToMigrate.length,
      skippedCount,
      backupsRetained: false,
      duration,
    };

    return updatedOperation;
  } catch (error) {
    // Rollback on failure
    if (updatedOperation.backupPaths) {
      try {
        await rollbackMigration(updatedOperation.backupPaths);
      } catch (rollbackError) {
        // Log rollback failure but don't throw
        console.error('Rollback failed:', rollbackError);
      }
    }

    const duration = Date.now() - startTime;

    updatedOperation.state = 'error';
    updatedOperation.completedAt = new Date();
    updatedOperation.error = error as Error;
    updatedOperation.result = {
      success: false,
      migratedCount: 0,
      skippedCount: operation.selectedServers.length,
      errors: [{
        serverName: 'migration',
        phase: 'write',
        message: (error as Error).message,
        code: (error as any).code,
      }],
      backupsRetained: !!updatedOperation.backupPaths,
      duration,
    };

    return updatedOperation;
  }
}

/**
 * Create backups of both configuration files
 *
 * Creates timestamped backup copies before migration begins
 *
 * @param projectDir - Absolute path to project directory
 * @returns BackupPaths object with backup file locations
 * @throws Error if backup creation fails
 */
export async function createBackups(
  projectDir: string
): Promise<BackupPaths> {
  const fs = require('fs-extra');
  const path = require('path');
  const os = require('os');

  const projectConfigPath = path.join(projectDir, '.mcp.json');
  const globalConfigPath = path.join(os.homedir(), '.claude.json');
  const timestamp = Date.now();

  const projectBackup = `${projectConfigPath}.backup.${timestamp}`;
  const globalBackup = `${globalConfigPath}.backup.${timestamp}`;

  try {
    // Backup project config if it exists
    if (await fs.pathExists(projectConfigPath)) {
      await fs.copy(projectConfigPath, projectBackup);
    }

    // Backup global config if it exists
    if (await fs.pathExists(globalConfigPath)) {
      await fs.copy(globalConfigPath, globalBackup);
    }

    return {
      projectBackup,
      globalBackup,
      timestamp,
    };
  } catch (error) {
    // Clean up any partial backups on failure
    try {
      if (await fs.pathExists(projectBackup)) {
        await fs.remove(projectBackup);
      }
      if (await fs.pathExists(globalBackup)) {
        await fs.remove(globalBackup);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw new Error(`Failed to create backups: ${(error as Error).message}`);
  }
}

/**
 * Rollback failed migration
 *
 * Restores both configuration files from backups
 *
 * @param backupPaths - Paths to backup files
 * @throws Error if backup files don't exist or restore fails
 */
export async function rollbackMigration(
  backupPaths: BackupPaths
): Promise<void> {
  const fs = require('fs-extra');
  const path = require('path');

  const { projectBackup, globalBackup } = backupPaths;

  // Extract original paths from backup paths
  const projectConfigPath = projectBackup.replace(/\.backup\.\d+$/, '');
  const globalConfigPath = globalBackup.replace(/\.backup\.\d+$/, '');

  try {
    // Restore project config if backup exists
    if (await fs.pathExists(projectBackup)) {
      await fs.move(projectBackup, projectConfigPath, { overwrite: true });
    }

    // Restore global config if backup exists
    if (await fs.pathExists(globalBackup)) {
      await fs.move(globalBackup, globalConfigPath, { overwrite: true });
    }
  } catch (error) {
    throw new Error(`Failed to rollback migration: ${(error as Error).message}`);
  }
}

/**
 * Validate conflict resolutions
 *
 * Ensures all conflicts have valid resolutions set before execution
 *
 * @param conflicts - Array of conflict resolutions
 * @returns true if all resolutions valid, false otherwise
 */
export function validateResolutions(
  conflicts: ConflictResolution[]
): boolean {
  // Import validation function
  const { isValidServerName } = require('../models/types');

  for (const conflict of conflicts) {
    // Validate resolution type
    if (!['skip', 'overwrite', 'rename'].includes(conflict.resolution)) {
      return false;
    }

    // Validate rename resolution has newName
    if (conflict.resolution === 'rename') {
      if (!conflict.newName) {
        return false;
      }
      // Validate newName is valid format
      if (!isValidServerName(conflict.newName)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Apply conflict resolutions to server list
 *
 * Transforms server list based on user's resolution choices
 * (removes skipped servers, renames renamed servers, etc.)
 *
 * @param servers - Original server list
 * @param conflicts - Resolved conflicts
 * @returns Transformed server list ready for migration
 */
export function applyResolutions(
  servers: any[], // TODO: Replace with MCPServer type
  conflicts: ConflictResolution[]
): any[] { // TODO: Replace with MCPServer type
  const result: any[] = [];

  for (const server of servers) {
    // Check if this server has a conflict
    const conflict = conflicts.find(c => c.serverName === server.name);

    if (!conflict) {
      // No conflict, include server as-is
      result.push(server);
      continue;
    }

    // Handle conflict based on resolution
    if (conflict.resolution === 'skip') {
      // Skip this server (don't add to result)
      continue;
    }

    if (conflict.resolution === 'overwrite') {
      // Keep server as-is (will overwrite global)
      result.push(server);
      continue;
    }

    if (conflict.resolution === 'rename') {
      // Rename server
      result.push({
        ...server,
        name: conflict.newName,
      });
      continue;
    }
  }

  return result;
}

// ============================================================================
// Memory File Migration Functions (Feature: 003-add-migrate-to, Tasks: T013-T014)
// ============================================================================

/**
 * Detect legacy .md.blocked files in .claude/ directory
 *
 * Task: T013
 * Scans for files with .blocked extension in .claude/memories/ directory
 * and extracts original filenames.
 *
 * @param projectDir - Absolute path to project directory
 * @returns Array of original filenames (without .blocked extension)
 */
export async function detectOldBlockedFiles(projectDir: string): Promise<string[]> {
  const fs = require('fs-extra');
  const path = require('path');
  const fg = require('fast-glob');

  const claudeDir = path.join(projectDir, '.claude');

  // Check if .claude directory exists
  if (!(await fs.pathExists(claudeDir))) {
    return [];
  }

  try {
    // Search for .blocked files in .claude directory
    const blockedFiles = await fg('**/*.blocked', {
      cwd: claudeDir,
      absolute: false,
      onlyFiles: true,
    });

    // Extract original filenames (remove .blocked extension)
    const originalNames = blockedFiles.map((file: string) => {
      return file.replace(/\.blocked$/, '');
    });

    return originalNames;
  } catch (error) {
    // If scan fails, return empty array
    console.error('Error scanning for blocked files:', error);
    return [];
  }
}

/**
 * Migrate legacy .md.blocked files to settings.json deny patterns
 *
 * Task: T014
 * For each .blocked file found:
 * 1. Extract original filename
 * 2. Add to settings.json using memory-blocker
 * 3. Delete .blocked file
 * 4. Track success/failures
 *
 * @param projectDir - Absolute path to project directory
 * @returns Migration result with summary
 */
export async function migrateBlockedFiles(projectDir: string): Promise<MemoryMigrationResult> {
  const fs = require('fs-extra');
  const path = require('path');
  const { blockMemoryFile } = require('./memory-blocker');

  const migratedFiles: string[] = [];
  const failedFiles: { file: string; error: string }[] = [];

  try {
    // Detect all .blocked files
    const blockedFiles = await detectOldBlockedFiles(projectDir);

    if (blockedFiles.length === 0) {
      return {
        success: true,
        migratedFiles: [],
        failedFiles: [],
        summary: 'No legacy .blocked files found to migrate',
      };
    }

    // Migrate each file
    for (const originalFile of blockedFiles) {
      const blockedFilePath = path.join(projectDir, '.claude', `${originalFile}.blocked`);

      try {
        // Add to settings.json deny patterns
        await blockMemoryFile(projectDir, originalFile);

        // Delete .blocked file
        await fs.remove(blockedFilePath);

        // Track success
        migratedFiles.push(originalFile);
      } catch (error) {
        // Track failure
        failedFiles.push({
          file: originalFile,
          error: (error as Error).message,
        });
      }
    }

    // Build summary
    const totalFiles = blockedFiles.length;
    const successCount = migratedFiles.length;
    const failureCount = failedFiles.length;

    const success = failureCount === 0;
    const summary = success
      ? `Successfully migrated ${successCount} memory file(s) to settings.json`
      : `Migrated ${successCount}/${totalFiles} memory file(s). ${failureCount} failed.`;

    return {
      success,
      migratedFiles,
      failedFiles,
      summary,
    };
  } catch (error) {
    // Catastrophic failure
    return {
      success: false,
      migratedFiles,
      failedFiles,
      summary: `Migration failed: ${(error as Error).message}`,
    };
  }
}

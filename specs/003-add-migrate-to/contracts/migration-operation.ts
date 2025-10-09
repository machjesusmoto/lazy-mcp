/**
 * TypeScript Interface Contracts for Migration Operations
 *
 * Feature: Migrate to Global (003-add-migrate-to)
 * Purpose: Define type contracts for migration functionality
 *
 * These interfaces will be added to src/models/types.ts
 */

// ============================================================================
// State Machine Types
// ============================================================================

/**
 * Migration workflow state
 *
 * State Flow:
 * idle → validating → conflict_resolution → ready → executing → complete
 *                                                              ↘ error → rollback
 */
export type MigrationState =
  | 'idle'           // No migration in progress
  | 'validating'     // Loading configs and detecting conflicts
  | 'conflict_resolution' // User resolving detected conflicts
  | 'ready'          // Ready to execute (all conflicts resolved)
  | 'executing'      // Performing file operations
  | 'complete'       // Migration succeeded
  | 'error';         // Migration failed, rollback initiated

/**
 * Conflict resolution strategy
 *
 * - skip: Keep global config, don't migrate this server
 * - overwrite: Replace global config with project config
 * - rename: Migrate project server with new name
 */
export type ResolutionType = 'skip' | 'overwrite' | 'rename';

// ============================================================================
// Core Migration Entities
// ============================================================================

/**
 * Complete migration operation state
 *
 * Encapsulates all data required to execute, validate, and rollback
 * a migration from project-local to global configuration.
 *
 * Lifecycle: Created when user initiates migration, persists until
 * completion/cancellation, destroyed on exit (no persistence).
 */
export interface MigrationOperation {
  /** Unique identifier (timestamp-based) */
  id: string;

  /** Absolute path to project directory */
  projectDir: string;

  /** Current workflow state */
  state: MigrationState;

  /** Servers selected for migration (hierarchyLevel === 1 only) */
  selectedServers: MCPServer[];

  /** Detected conflicts requiring resolution (empty if none) */
  conflicts: ConflictResolution[];

  /** Backup file paths (created during execution) */
  backupPaths?: BackupPaths;

  /** Operation outcome (populated on completion) */
  result?: MigrationResult;

  /** Operation start timestamp */
  createdAt: Date;

  /** Operation completion timestamp */
  completedAt?: Date;

  /** Error details if operation failed */
  error?: Error;
}

/**
 * Conflict resolution for a single server name collision
 *
 * Created during validation phase when a server in project config
 * has the same name as a server in global config.
 *
 * User must set resolution before migration can proceed.
 */
export interface ConflictResolution {
  /** Name of conflicting server */
  serverName: string;

  /** Server configuration from .mcp.json */
  projectConfig: MCPServerConfig;

  /** Server configuration from ~/.claude.json */
  globalConfig: MCPServerConfig;

  /** User's chosen resolution strategy */
  resolution: ResolutionType;

  /** New name for server (required if resolution === 'rename') */
  newName?: string;

  /** Differences between project and global configs (for display) */
  configDiff?: ConfigDiff;
}

/**
 * Lightweight MCP server configuration
 *
 * Represents the JSON structure in .mcp.json and ~/.claude.json
 * (subset of full MCPServer type which includes runtime metadata)
 */
export interface MCPServerConfig {
  /** Executable command */
  command: string;

  /** Command arguments */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** v2.0.0 blocking metadata - indicates this is a blocked override */
  _mcpToggleBlocked?: boolean;

  /** ISO timestamp when server was blocked */
  _mcpToggleBlockedAt?: string;

  /** Original server config before blocking (for unblocking) */
  _mcpToggleOriginal?: MCPServerConfig;
}

/**
 * Configuration differences between project and global servers
 *
 * Used to display what will change if user chooses 'overwrite' resolution
 */
export interface ConfigDiff {
  /** Command difference */
  command: { project: string; global: string };

  /** Arguments difference */
  args?: { project: string[]; global: string[] };

  /** Environment variables difference */
  env?: { project: Record<string, string>; global: Record<string, string> };

  /** Whether blocking metadata exists */
  hasBlockingMetadata: { project: boolean; global: boolean };
}

/**
 * Backup file locations for rollback capability
 *
 * Created before any file modifications to enable atomic rollback
 * on failure. Deleted on successful migration.
 */
export interface BackupPaths {
  /** Absolute path to .mcp.json backup */
  projectBackup: string;

  /** Absolute path to ~/.claude.json backup */
  globalBackup: string;

  /** Backup creation timestamp (ms since epoch) */
  timestamp: number;
}

/**
 * Migration operation outcome
 *
 * Provides detailed results for user feedback and logging
 */
export interface MigrationResult {
  /** Overall operation success */
  success: boolean;

  /** Number of servers successfully migrated */
  migratedCount: number;

  /** Number of servers skipped due to conflicts */
  skippedCount: number;

  /** List of errors encountered (if any) */
  errors?: MigrationError[];

  /** Whether backup files were retained (true if errors occurred) */
  backupsRetained: boolean;

  /** Operation duration in milliseconds */
  duration: number;
}

/**
 * Detailed error information for failed migrations
 *
 * Captures which server failed, at which phase, and why
 */
export interface MigrationError {
  /** Name of server that caused error */
  serverName: string;

  /** Migration phase where error occurred */
  phase: 'validation' | 'backup' | 'write' | 'verification' | 'rollback';

  /** Human-readable error message */
  message: string;

  /** System error code (e.g., 'EACCES', 'ENOENT') */
  code?: string;
}

// ============================================================================
// Function Signatures (Migration Manager API)
// ============================================================================

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
export function initiateMigration(
  projectDir: string,
  selectedServers: MCPServer[]
): Promise<MigrationOperation>;

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
  projectServers: MCPServer[],
  globalConfig: any
): ConflictResolution[];

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
export function executeMigration(
  operation: MigrationOperation
): Promise<MigrationOperation>;

/**
 * Rollback failed migration
 *
 * Restores both configuration files from backups
 *
 * @param backupPaths - Paths to backup files
 * @throws Error if backup files don't exist or restore fails
 */
export function rollbackMigration(
  backupPaths: BackupPaths
): Promise<void>;

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
): boolean;

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
  servers: MCPServer[],
  conflicts: ConflictResolution[]
): MCPServer[];

// ============================================================================
// Validation Rules (enforce at runtime)
// ============================================================================

/**
 * Migration operation validation rules
 */
export const MIGRATION_VALIDATION = {
  /** Minimum servers required for migration */
  MIN_SERVERS: 1,

  /** Maximum servers supported in UI */
  MAX_SERVERS: 50,

  /** Server name pattern (alphanumeric, hyphens, underscores) */
  SERVER_NAME_PATTERN: /^[a-zA-Z0-9_-]+$/,

  /** Maximum length for server name */
  MAX_NAME_LENGTH: 64,

  /** Required hierarchy level for migration (project-local) */
  REQUIRED_HIERARCHY_LEVEL: 1,

  /** Backup file retention period (milliseconds) */
  BACKUP_RETENTION_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Validate server name format
 *
 * @param name - Server name to validate
 * @returns true if valid, false otherwise
 */
export function isValidServerName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MIGRATION_VALIDATION.MAX_NAME_LENGTH &&
    MIGRATION_VALIDATION.SERVER_NAME_PATTERN.test(name)
  );
}

/**
 * Validate migration operation readiness
 *
 * @param operation - Migration operation to validate
 * @returns Validation result with errors (if any)
 */
export function validateMigrationOperation(
  operation: MigrationOperation
): { valid: boolean; errors: string[] };

/**
 * Core type definitions for v2.0.0 .mcp.json blocking mechanism.
 * These types represent the actual .mcp.json file structure and blocking metadata.
 */

/**
 * Complete structure of a .mcp.json file as it exists on disk.
 * Represents the project-level MCP configuration file.
 */
export interface McpJsonConfig {
  /** Dictionary of MCP server configurations keyed by server name */
  mcpServers: Record<string, MCPServerConfig>;

  /** Additional properties for future extensions */
  [key: string]: unknown;
}

/**
 * Individual MCP server configuration as stored in .mcp.json.
 * Defines how to launch an MCP server with command, arguments, and environment.
 */
export interface MCPServerConfig {
  /** Executable command (e.g., "npx", "python", "node") */
  command: string;

  /** Command arguments (optional) */
  args?: string[];

  /** Environment variables (optional) */
  env?: Record<string, string>;

  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * MCP server configuration with blocking metadata (extends MCPServerConfig).
 * Represents a dummy override that prevents an inherited server from loading
 * while preserving the original configuration.
 */
export interface BlockedMCPServerConfig extends MCPServerConfig {
  /** Dummy command that does nothing */
  command: 'echo';

  /** Descriptive message about the block */
  args: [string];

  /** Marker for tool recognition (required) */
  _mcpToggleBlocked: true;

  /** ISO 8601 timestamp when blocked */
  _mcpToggleBlockedAt: string;

  /** Original server configuration (required) */
  _mcpToggleOriginal: MCPServerConfig;
}

/**
 * Result of unblocking a local server operation.
 * Communicates to user that manual re-add is required for local servers.
 */
export interface UnblockResult {
  /** Whether unblock operation completed */
  success: boolean;

  /** Whether user must manually re-add config */
  requiresManualAdd: boolean;

  /** User-facing message with instructions */
  message: string;
}

/**
 * Result of migrating from legacy .claude/blocked.md format.
 * Tracks migration success and provides feedback to user.
 */
export interface MigrationResult {
  /** Whether migration was performed */
  migrated: boolean;

  /** Why migration didn't run (if not migrated) */
  reason?: string;

  /** Number of servers migrated */
  serversCount?: number;

  /** Number of memory files migrated */
  memoryCount?: number;

  /** Any non-fatal errors during migration */
  errors?: string[];
}

/**
 * Blocked item summary for ProjectContext backward compatibility.
 * Aggregates blocked state from v2.0.0 .claude.json overrides and .md.blocked files.
 * Note: This is different from the legacy BlockedItem from blocked-item.ts
 */
export interface BlockedItemSummary {
  /** Type of blocked item */
  type: 'mcp' | 'memory';

  /** Server name or memory file path */
  identifier: string;

  /** When the item was blocked */
  blockedAt: Date;

  /** Who/what blocked it (typically "mcp-toggle") */
  blockedBy: string;
}

/**
 * Type guard to check if a server configuration has blocking metadata.
 */
export function isBlockedServer(
  config: MCPServerConfig
): config is BlockedMCPServerConfig {
  return '_mcpToggleBlocked' in config && config._mcpToggleBlocked === true;
}

/**
 * Validates a McpJsonConfig object.
 * @throws Error if validation fails
 */
export function validateMcpJsonConfig(config: McpJsonConfig): void {
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    throw new Error('McpJsonConfig.mcpServers must be an object');
  }

  // Validate each server config
  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    if (!name || name.trim().length === 0) {
      throw new Error('Server name must be non-empty string');
    }
    validateMCPServerConfig(serverConfig);
  }
}

/**
 * Validates an MCPServerConfig object.
 * @throws Error if validation fails
 */
export function validateMCPServerConfig(config: MCPServerConfig): void {
  if (!config.command || typeof config.command !== 'string' || config.command.trim().length === 0) {
    throw new Error('MCPServerConfig.command must be non-empty string');
  }

  if (config.args !== undefined) {
    if (!Array.isArray(config.args)) {
      throw new Error('MCPServerConfig.args must be array of strings');
    }
    if (config.args.some((arg) => typeof arg !== 'string')) {
      throw new Error('MCPServerConfig.args must contain only strings');
    }
  }

  if (config.env !== undefined) {
    if (typeof config.env !== 'object' || config.env === null) {
      throw new Error('MCPServerConfig.env must be object');
    }
    for (const [key, value] of Object.entries(config.env)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new Error('MCPServerConfig.env must be string-to-string dictionary');
      }
    }
  }
}

/**
 * Validates a BlockedMCPServerConfig object.
 * @throws Error if validation fails
 */
export function validateBlockedMCPServerConfig(config: BlockedMCPServerConfig): void {
  // First validate as regular server config
  validateMCPServerConfig(config);

  if (config.command !== 'echo') {
    throw new Error('BlockedMCPServerConfig.command must be "echo"');
  }

  if (!config._mcpToggleBlocked || config._mcpToggleBlocked !== true) {
    throw new Error('BlockedMCPServerConfig._mcpToggleBlocked must be exactly true');
  }

  if (!config._mcpToggleBlockedAt || typeof config._mcpToggleBlockedAt !== 'string') {
    throw new Error('BlockedMCPServerConfig._mcpToggleBlockedAt must be ISO 8601 timestamp string');
  }

  // Validate timestamp is valid ISO 8601
  const timestamp = new Date(config._mcpToggleBlockedAt);
  if (isNaN(timestamp.getTime())) {
    throw new Error('BlockedMCPServerConfig._mcpToggleBlockedAt must be valid ISO 8601 timestamp');
  }

  if (!config._mcpToggleOriginal || typeof config._mcpToggleOriginal !== 'object') {
    throw new Error('BlockedMCPServerConfig._mcpToggleOriginal must be valid MCPServerConfig');
  }

  // Validate original config
  validateMCPServerConfig(config._mcpToggleOriginal);
}

// ============================================================================
// Migration Operation Types (Feature: 003-add-migrate-to)
// ============================================================================

/**
 * Migration workflow state
 *
 * State Flow:
 * idle → validating → conflict_resolution → ready → executing → complete
 *                                                              ↘ error
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
  selectedServers: any[]; // TODO: Replace 'any' with MCPServer type from project-context-builder

  /** Detected conflicts requiring resolution (empty if none) */
  conflicts: ConflictResolution[];

  /** Backup file paths (created during execution) */
  backupPaths?: BackupPaths;

  /** Operation outcome (populated on completion) */
  result?: ServerMigrationResult;

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
 * Migration operation outcome (renamed from MigrationResult to avoid conflict)
 *
 * Provides detailed results for user feedback and logging.
 * Note: Renamed to ServerMigrationResult to distinguish from legacy
 * blocked.md MigrationResult interface.
 */
export interface ServerMigrationResult {
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
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate server count
  if (operation.selectedServers.length < MIGRATION_VALIDATION.MIN_SERVERS) {
    errors.push(`Must select at least ${MIGRATION_VALIDATION.MIN_SERVERS} server(s)`);
  }
  if (operation.selectedServers.length > MIGRATION_VALIDATION.MAX_SERVERS) {
    errors.push(`Cannot migrate more than ${MIGRATION_VALIDATION.MAX_SERVERS} servers`);
  }

  // Validate all selected servers are project-local (hierarchyLevel === 1)
  const invalidServers = operation.selectedServers.filter(
    (server: any) => server.hierarchyLevel !== MIGRATION_VALIDATION.REQUIRED_HIERARCHY_LEVEL
  );
  if (invalidServers.length > 0) {
    errors.push(`All servers must be project-local (hierarchyLevel === 1)`);
  }

  // Validate conflict resolutions if any conflicts exist
  if (operation.conflicts.length > 0) {
    for (const conflict of operation.conflicts) {
      // Validate resolution type
      if (!['skip', 'overwrite', 'rename'].includes(conflict.resolution)) {
        errors.push(`Invalid resolution type for ${conflict.serverName}: ${conflict.resolution}`);
      }

      // Validate rename has newName
      if (conflict.resolution === 'rename') {
        if (!conflict.newName) {
          errors.push(`Rename resolution for ${conflict.serverName} requires newName`);
        } else if (!isValidServerName(conflict.newName)) {
          errors.push(`Invalid newName for ${conflict.serverName}: ${conflict.newName}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Memory File Migration Types (Feature: 003-add-migrate-to, Tasks: T013-T014)
// ============================================================================

/**
 * Result of migrating legacy .md.blocked files to settings.json deny patterns
 *
 * Provides detailed results for user feedback about memory file migration.
 * This is separate from ServerMigrationResult as memory migration is simpler
 * (no conflicts, just file detection and pattern addition).
 */
export interface MemoryMigrationResult {
  /** Overall migration success */
  success: boolean;

  /** List of memory files successfully migrated */
  migratedFiles: string[];

  /** List of files that failed to migrate with error messages */
  failedFiles: { file: string; error: string }[];

  /** Human-readable summary message */
  summary: string;
}

// ============================================================================
// Agent Management Types (Feature: 004-comprehensive-context-management, US2)
// ============================================================================

/**
 * Subagent source location
 */
export type AgentSource = 'project' | 'user';

/**
 * Parsed agent frontmatter metadata
 */
export interface AgentFrontmatter {
  /** Agent name (required) */
  name: string;

  /** Human-readable description (required) */
  description: string;

  /** Display color (optional) */
  color?: string;

  /** Model to use (optional) */
  model?: string;

  /** Comma-separated list of tool names (optional) */
  tools?: string;
}

/**
 * Complete subagent representation
 */
export interface SubAgent {
  /** Agent name from frontmatter */
  name: string;

  /** Description from frontmatter */
  description: string;

  /** Absolute path to agent file */
  filePath: string;

  /** Source location (project or user level) */
  source: AgentSource;

  /** True if this project agent overrides a user agent */
  isOverride: boolean;

  /** True if agent is blocked via permissions.deny */
  isBlocked: boolean;

  /** Model specified in frontmatter (optional) */
  model?: string;

  /** List of tool names from frontmatter (optional) */
  tools?: string[];

  /** Display color from frontmatter (optional) */
  color?: string;

  /** Estimated token count for this agent's markdown file */
  estimatedTokens?: number;
}

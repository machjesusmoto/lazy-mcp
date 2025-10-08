/**
 * Core type definitions for v2.0.0 .claude.json blocking mechanism.
 * These types represent the actual .claude.json file structure and blocking metadata.
 */

/**
 * Complete structure of a .claude.json file as it exists on disk.
 * Represents the entire Claude Code configuration file.
 */
export interface ClaudeJsonConfig {
  /** Dictionary of MCP server configurations keyed by server name */
  mcpServers: Record<string, MCPServerConfig>;

  /** Additional properties for future Claude Code extensions */
  [key: string]: unknown;
}

/**
 * Individual MCP server configuration as stored in .claude.json.
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
 * Type guard to check if a server configuration has blocking metadata.
 */
export function isBlockedServer(
  config: MCPServerConfig
): config is BlockedMCPServerConfig {
  return '_mcpToggleBlocked' in config && config._mcpToggleBlocked === true;
}

/**
 * Validates a ClaudeJsonConfig object.
 * @throws Error if validation fails
 */
export function validateClaudeJsonConfig(config: ClaudeJsonConfig): void {
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    throw new Error('ClaudeJsonConfig.mcpServers must be an object');
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

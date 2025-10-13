/**
 * Represents an MCP (Model Context Protocol) server configuration
 * discovered from .claude.json files.
 */
export interface MCPServer {
  /** Unique identifier for the MCP server (key in mcpServers object) */
  name: string;

  /** Executable command to start the server */
  command: string;

  /** Command-line arguments for the server */
  args?: string[];

  /** Environment variables for the server */
  env?: Record<string, string>;

  /** Absolute path to .claude.json containing this server */
  sourcePath: string;

  /** Whether from current directory or parent */
  sourceType: 'local' | 'inherited';

  /** Directory levels from current (0 = current, 1 = parent, etc.) */
  hierarchyLevel: number;

  /** Current blocked state from blocked.md */
  isBlocked: boolean;

  /** Timestamp when blocked (if isBlocked = true) */
  blockedAt?: Date;

  /** Estimated token count for this server's configuration */
  estimatedTokens?: number;
}

/**
 * Validates an MCPServer object.
 * @throws Error if validation fails
 */
export function validateMCPServer(server: MCPServer): void {
  if (!server.name || server.name.trim().length === 0) {
    throw new Error('MCPServer.name must be non-empty string');
  }
  if (!server.command || server.command.trim().length === 0) {
    throw new Error('MCPServer.command must be non-empty string');
  }
  if (!server.sourcePath || !server.sourcePath.startsWith('/')) {
    throw new Error('MCPServer.sourcePath must be absolute path');
  }
  if (server.hierarchyLevel < 0) {
    throw new Error('MCPServer.hierarchyLevel must be >= 0');
  }
  if (server.isBlocked && !server.blockedAt) {
    throw new Error('MCPServer.blockedAt should be set when isBlocked = true');
  }
}

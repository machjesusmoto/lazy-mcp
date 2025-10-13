/**
 * @mcp-toggle/shared - Core Type Definitions
 * Version: 2.0.0
 *
 * Shared types for MCP Toggle plugin and CLI.
 * Defines the data structures for context enumeration.
 */

/**
 * MCP Server configuration from .claude.json
 */
export interface MCPServer {
  /** Server identifier name */
  name: string;
  /** Command to execute the server */
  command: string;
  /** Optional command-line arguments */
  args?: string[];
  /** Optional environment variables */
  env?: Record<string, string>;
  /** Whether the server is currently enabled (not blocked) */
  enabled: boolean;
  /** Estimated token usage when loaded */
  estimatedTokens: number;
}

/**
 * Memory file in .claude/memories/
 */
export interface MemoryFile {
  /** Absolute path to the memory file */
  path: string;
  /** Relative filename from memories directory */
  name: string;
  /** File size in bytes */
  size: number;
  /** Last modification timestamp */
  lastModified: Date;
  /** Whether the memory is currently enabled (not blocked) */
  enabled: boolean;
  /** Estimated token usage when loaded */
  estimatedTokens: number;
}

/**
 * Claude Code agent
 */
export interface Agent {
  /** Agent identifier name */
  name: string;
  /** Agent category/type */
  type: string;
  /** Optional description of agent capabilities */
  description?: string;
  /** Whether the agent is currently enabled (not blocked) */
  enabled: boolean;
  /** Estimated token usage when loaded */
  estimatedTokens: number;
}

/**
 * Complete context status for a project
 */
export interface ContextStatus {
  /** All configured MCP servers */
  mcpServers: MCPServer[];
  /** All discovered memory files */
  memories: MemoryFile[];
  /** All available agents */
  agents: Agent[];
  /** Total estimated token usage */
  totalTokens: number;
  /** Timestamp when status was generated */
  timestamp: Date;
}

/**
 * Blocking rule from .claude/blocked.md
 */
export interface BlockingRule {
  /** Type of item to block */
  type: 'mcp' | 'memory' | 'agent';
  /** Name/identifier of the item to block */
  name: string;
  /** Optional reason for blocking */
  reason?: string;
}

/**
 * Configuration for blocking manager
 */
export interface BlockingConfig {
  /** Path to blocked.md file */
  blockedPath: string;
  /** Whether to create backup before modifications */
  createBackup: boolean;
}

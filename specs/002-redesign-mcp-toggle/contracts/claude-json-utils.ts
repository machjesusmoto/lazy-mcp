/**
 * Contract: claude-json-utils.ts
 *
 * Core utilities for reading, writing, and manipulating .claude.json files.
 * Implements atomic write operations with backup/restore for zero-corruption guarantee.
 */

import { ClaudeJsonConfig, MCPServerConfig, BlockedMCPServerConfig } from '../types';

/**
 * Read .claude.json from a directory.
 * Returns empty config if file doesn't exist.
 *
 * @param projectDir - Directory containing .claude.json
 * @returns Parsed .claude.json configuration
 * @throws Error if file exists but is malformed
 *
 * @example
 * const config = await readClaudeJson('/path/to/project');
 * // config.mcpServers = { magic: { command: 'npx', args: [...] } }
 */
export function readClaudeJson(projectDir: string): Promise<ClaudeJsonConfig>;

/**
 * Write .claude.json to a directory atomically.
 * Creates backup before writing and restores on failure.
 *
 * @param projectDir - Directory to write .claude.json to
 * @param config - Configuration to write
 * @throws Error if write fails (backup restored automatically)
 *
 * @example
 * await writeClaudeJson('/path/to/project', {
 *   mcpServers: { magic: { command: 'echo', args: ['blocked'] } }
 * });
 */
export function writeClaudeJson(
  projectDir: string,
  config: ClaudeJsonConfig
): Promise<void>;

/**
 * Check if a server configuration has blocking metadata.
 *
 * @param config - Server configuration to check
 * @returns True if server is blocked by mcp-toggle
 *
 * @example
 * const isBlocked = isBlockedServer(serverConfig);
 * if (isBlocked) {
 *   console.log('Server is blocked');
 * }
 */
export function isBlockedServer(config: MCPServerConfig): config is BlockedMCPServerConfig;

/**
 * Create a dummy override configuration for an inherited server.
 * This prevents the inherited server from loading by overriding it with
 * an echo command that does nothing.
 *
 * @param serverName - Name of the server to block
 * @param original - Original server configuration to preserve
 * @returns Blocked server configuration with metadata
 *
 * @example
 * const blocked = createDummyOverride('magic', {
 *   command: 'npx',
 *   args: ['-y', '@21st-dev/cli']
 * });
 * // blocked.command = 'echo'
 * // blocked._mcpToggleOriginal = { command: 'npx', ... }
 */
export function createDummyOverride(
  serverName: string,
  original: MCPServerConfig
): BlockedMCPServerConfig;

/**
 * Extract original configuration from a blocked server.
 *
 * @param blocked - Blocked server configuration
 * @returns Original server configuration
 * @throws Error if server is not blocked or has no original config
 *
 * @example
 * const original = extractOriginalConfig(blockedServer);
 * // original.command = 'npx'
 */
export function extractOriginalConfig(blocked: BlockedMCPServerConfig): MCPServerConfig;

/**
 * Remove blocking metadata from a server configuration.
 * Returns the original configuration or the config as-is if not blocked.
 *
 * @param config - Server configuration (blocked or unblocked)
 * @returns Clean server configuration without blocking metadata
 *
 * @example
 * const clean = removeBlockingMetadata(config);
 * // If blocked: returns _mcpToggleOriginal
 * // If unblocked: returns config unchanged
 */
export function removeBlockingMetadata(config: MCPServerConfig): MCPServerConfig;

/**
 * Ensure project directory has .claude directory structure.
 * Creates .claude/ if it doesn't exist.
 *
 * @param projectDir - Project directory
 *
 * @example
 * await ensureClaudeDirectory('/path/to/project');
 * // Creates /path/to/project/.claude with 755 permissions
 */
export function ensureClaudeDirectory(projectDir: string): Promise<void>;

/**
 * Check if .claude.json exists in a directory.
 *
 * @param projectDir - Directory to check
 * @returns True if .claude.json exists
 *
 * @example
 * if (await claudeJsonExists('/path/to/project')) {
 *   console.log('.claude.json found');
 * }
 */
export function claudeJsonExists(projectDir: string): Promise<boolean>;

/**
 * Create a minimal .claude.json if it doesn't exist.
 *
 * @param projectDir - Directory to create .claude.json in
 *
 * @example
 * await ensureClaudeJson('/path/to/project');
 * // Creates .claude.json with { mcpServers: {} }
 */
export function ensureClaudeJson(projectDir: string): Promise<void>;

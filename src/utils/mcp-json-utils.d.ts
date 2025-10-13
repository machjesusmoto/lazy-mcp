/**
 * Utilities for reading, writing, and manipulating .mcp.json files.
 * Implements Phase 2 (Foundation) of the v2.0.0 architectural redesign.
 * Core utilities for atomic writes with backup/restore for zero-corruption guarantee.
 */
import type { McpJsonConfig, MCPServerConfig, BlockedMCPServerConfig } from '../models/types';
/**
 * Read .mcp.json from a directory.
 * Returns empty config if file doesn't exist.
 *
 * @param projectDir - Directory containing .mcp.json
 * @returns Parsed .mcp.json configuration
 * @throws Error if file exists but is malformed
 */
export declare function readMcpJson(projectDir: string): Promise<McpJsonConfig>;
/**
 * Write .mcp.json to a directory atomically.
 * Creates backup before writing and restores on failure.
 *
 * @param projectDir - Directory to write .mcp.json to
 * @param config - Configuration to write
 * @throws Error if write fails
 */
export declare function writeMcpJson(projectDir: string, config: McpJsonConfig): Promise<void>;
/**
 * Check if a server configuration has blocking metadata.
 *
 * @param config - Server configuration to check
 * @returns True if server is blocked by mcp-toggle
 */
export declare function isBlockedServer(config: MCPServerConfig): config is BlockedMCPServerConfig;
/**
 * Create a dummy override configuration for an inherited server.
 * This prevents the inherited server from loading by overriding it with
 * an echo command that does nothing.
 *
 * @param serverName - Name of the server to block
 * @param original - Original server configuration to preserve
 * @returns Blocked server configuration
 */
export declare function createDummyOverride(serverName: string, original: MCPServerConfig): BlockedMCPServerConfig;
/**
 * Extract original configuration from a blocked server.
 *
 * @param blocked - Blocked server configuration
 * @returns Original server configuration
 * @throws Error if server is not blocked or has no original config
 */
export declare function extractOriginalConfig(blocked: BlockedMCPServerConfig): MCPServerConfig;
/**
 * Remove blocking metadata from a server configuration.
 * Returns the original configuration or the config as-is if not blocked.
 *
 * @param config - Server configuration (blocked or unblocked)
 * @returns Clean server configuration without blocking metadata
 */
export declare function removeBlockingMetadata(config: MCPServerConfig): MCPServerConfig;
/**
 * Ensure project directory has .claude directory structure.
 * Creates .claude/ if it doesn't exist.
 *
 * @param projectDir - Project directory
 */
export declare function ensureClaudeDirectory(projectDir: string): Promise<void>;
/**
 * Check if .mcp.json exists in a directory.
 *
 * @param projectDir - Directory to check
 * @returns True if .mcp.json exists
 */
export declare function mcpJsonExists(projectDir: string): Promise<boolean>;
/**
 * Create a minimal .mcp.json if it doesn't exist.
 *
 * @param projectDir - Directory to create .mcp.json in
 */
export declare function ensureMcpJson(projectDir: string): Promise<void>;
//# sourceMappingURL=mcp-json-utils.d.ts.map
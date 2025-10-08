/**
 * Utilities for reading, writing, and manipulating .claude.json files.
 * Implements Phase 2 (Foundation) of the v2.0.0 architectural redesign.
 * Core utilities for atomic writes with backup/restore for zero-corruption guarantee.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type {
  ClaudeJsonConfig,
  MCPServerConfig,
  BlockedMCPServerConfig,
} from '../models/types';

/**
 * Read .claude.json from a directory.
 * Returns empty config if file doesn't exist.
 *
 * @param projectDir - Directory containing .claude.json
 * @returns Parsed .claude.json configuration
 * @throws Error if file exists but is malformed
 */
export async function readClaudeJson(projectDir: string): Promise<ClaudeJsonConfig> {
  const configPath = path.join(projectDir, '.claude.json');

  if (!(await fs.pathExists(configPath))) {
    return { mcpServers: {} };
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as ClaudeJsonConfig;

    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    return config;
  } catch (error) {
    throw new Error(
      `Failed to read .claude.json from ${projectDir}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Write .claude.json to a directory atomically.
 * Creates backup before writing and restores on failure.
 *
 * @param projectDir - Directory to write .claude.json to
 * @param config - Configuration to write
 * @throws Error if write fails
 */
export async function writeClaudeJson(
  projectDir: string,
  config: ClaudeJsonConfig
): Promise<void> {
  const configPath = path.join(projectDir, '.claude.json');
  const backupPath = `${configPath}.backup`;
  const tempPath = `${configPath}.tmp`;

  // Create backup if file exists
  if (await fs.pathExists(configPath)) {
    await fs.copy(configPath, backupPath);
  }

  try {
    // Write to temporary file first
    const content = JSON.stringify(config, null, 2) + '\n';
    await fs.writeFile(tempPath, content, 'utf-8');

    // Atomic move
    await fs.move(tempPath, configPath, { overwrite: true });
    await fs.chmod(configPath, 0o644);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }
  } catch (error) {
    // Restore from backup on failure
    if (await fs.pathExists(backupPath)) {
      await fs.move(backupPath, configPath, { overwrite: true });
    }

    // Clean up temp file
    await fs.remove(tempPath).catch(() => {});

    throw new Error(
      `Failed to write .claude.json to ${projectDir}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a server configuration has blocking metadata.
 *
 * @param config - Server configuration to check
 * @returns True if server is blocked by mcp-toggle
 */
export function isBlockedServer(config: MCPServerConfig): config is BlockedMCPServerConfig {
  return '_mcpToggleBlocked' in config && config._mcpToggleBlocked === true;
}

/**
 * Create a dummy override configuration for an inherited server.
 * This prevents the inherited server from loading by overriding it with
 * an echo command that does nothing.
 *
 * @param serverName - Name of the server to block
 * @param original - Original server configuration to preserve
 * @returns Blocked server configuration
 */
export function createDummyOverride(
  serverName: string,
  original: MCPServerConfig
): BlockedMCPServerConfig {
  return {
    command: 'echo',
    args: [`[mcp-toggle] Server '${serverName}' is blocked`],
    _mcpToggleBlocked: true,
    _mcpToggleBlockedAt: new Date().toISOString(),
    _mcpToggleOriginal: { ...original },
  };
}

/**
 * Extract original configuration from a blocked server.
 *
 * @param blocked - Blocked server configuration
 * @returns Original server configuration
 * @throws Error if server is not blocked or has no original config
 */
export function extractOriginalConfig(blocked: BlockedMCPServerConfig): MCPServerConfig {
  if (!isBlockedServer(blocked)) {
    throw new Error('Server configuration is not blocked by mcp-toggle');
  }

  if (!blocked._mcpToggleOriginal) {
    throw new Error('Blocked server has no original configuration');
  }

  return { ...blocked._mcpToggleOriginal };
}

/**
 * Remove blocking metadata from a server configuration.
 * Returns the original configuration or the config as-is if not blocked.
 *
 * @param config - Server configuration (blocked or unblocked)
 * @returns Clean server configuration without blocking metadata
 */
export function removeBlockingMetadata(config: MCPServerConfig): MCPServerConfig {
  if (!isBlockedServer(config)) {
    return config;
  }

  return extractOriginalConfig(config);
}

/**
 * Ensure project directory has .claude directory structure.
 * Creates .claude/ if it doesn't exist.
 *
 * @param projectDir - Project directory
 */
export async function ensureClaudeDirectory(projectDir: string): Promise<void> {
  const claudeDir = path.join(projectDir, '.claude');

  if (!(await fs.pathExists(claudeDir))) {
    await fs.mkdir(claudeDir, { mode: 0o755 });
  }
}

/**
 * Check if .claude.json exists in a directory.
 *
 * @param projectDir - Directory to check
 * @returns True if .claude.json exists
 */
export async function claudeJsonExists(projectDir: string): Promise<boolean> {
  const configPath = path.join(projectDir, '.claude.json');
  return fs.pathExists(configPath);
}

/**
 * Create a minimal .claude.json if it doesn't exist.
 *
 * @param projectDir - Directory to create .claude.json in
 */
export async function ensureClaudeJson(projectDir: string): Promise<void> {
  if (!(await claudeJsonExists(projectDir))) {
    await writeClaudeJson(projectDir, { mcpServers: {} });
  }
}

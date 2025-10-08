/**
 * High-level blocking operations for MCP servers and memory files.
 * Implements v2.0.0 core business logic using .claude.json modification.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  readClaudeJson,
  writeClaudeJson,
  isBlockedServer,
  createDummyOverride,
  extractOriginalConfig,
  ensureClaudeJson,
} from '../utils/claude-json-utils';
import type { UnblockResult, MigrationResult } from '../models/types';
import type { MCPServer } from '../models/mcp-server';

/**
 * Block a locally-defined MCP server by removing it from project .claude.json.
 *
 * @param projectDir - Project directory containing .claude.json
 * @param serverName - Name of the server to block
 * @throws Error if server not found in local config or write fails
 */
export async function blockLocalServer(projectDir: string, serverName: string): Promise<void> {
  // Validate inputs
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
    throw new Error('serverName must be a non-empty string');
  }

  // Read current config
  const config = await readClaudeJson(projectDir);

  // Check if server exists in local config
  if (!config.mcpServers[serverName]) {
    throw new Error(`Server '${serverName}' not found in local .claude.json`);
  }

  // Check if server is already a blocked override (shouldn't block inherited servers as local)
  if (isBlockedServer(config.mcpServers[serverName])) {
    throw new Error(
      `Server '${serverName}' is an inherited server with override, cannot block as local`
    );
  }

  // Remove server from config
  delete config.mcpServers[serverName];

  // Write updated config
  await writeClaudeJson(projectDir, config);
}

/**
 * Block an inherited MCP server by creating a dummy override in project .claude.json.
 *
 * @param projectDir - Project directory where override will be created
 * @param server - MCPServer object with full config and metadata
 * @throws Error if write fails or server is not inherited
 */
export async function blockInheritedServer(projectDir: string, server: MCPServer): Promise<void> {
  // Validate inputs
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!server || typeof server !== 'object') {
    throw new Error('server must be a valid MCPServer object');
  }
  if (server.sourceType !== 'inherited') {
    throw new Error(`Server '${server.name}' is not inherited (sourceType: ${server.sourceType})`);
  }

  // Ensure .claude.json exists in project
  await ensureClaudeJson(projectDir);

  // Read current config
  const config = await readClaudeJson(projectDir);

  // Check if server already has an override
  if (config.mcpServers[server.name]) {
    if (isBlockedServer(config.mcpServers[server.name])) {
      throw new Error(`Server '${server.name}' is already blocked`);
    } else {
      throw new Error(
        `Server '${server.name}' already has a local definition, cannot create override`
      );
    }
  }

  // Create dummy override with preserved original config
  const original = {
    command: server.command,
    args: server.args,
    env: server.env,
  };
  config.mcpServers[server.name] = createDummyOverride(server.name, original);

  // Write updated config
  await writeClaudeJson(projectDir, config);
}

/**
 * Unblock a locally-defined MCP server.
 * Returns result indicating manual re-add is required.
 *
 * @param projectDir - Project directory
 * @param serverName - Name of the server to unblock
 * @returns UnblockResult with requiresManualAdd=true and instructions
 */
export async function unblockLocalServer(
  projectDir: string,
  serverName: string
): Promise<UnblockResult> {
  // Validate inputs
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
    throw new Error('serverName must be a non-empty string');
  }

  // For local servers, there's no stored config to restore
  // User must manually re-add the configuration
  return {
    success: true,
    requiresManualAdd: true,
    message: `Local server '${serverName}' has been unblocked.\nYou must manually add its configuration to .claude.json to use it again.\n\nExample configuration:\n{\n  "mcpServers": {\n    "${serverName}": {\n      "command": "npx",\n      "args": ["-y", "@package/name"]\n    }\n  }\n}`,
  };
}

/**
 * Unblock an inherited MCP server by removing the override from project .claude.json.
 *
 * @param projectDir - Project directory containing override
 * @param serverName - Name of the server to unblock
 * @throws Error if override not found or write fails
 */
export async function unblockInheritedServer(
  projectDir: string,
  serverName: string
): Promise<void> {
  // Validate inputs
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!serverName || typeof serverName !== 'string' || serverName.trim().length === 0) {
    throw new Error('serverName must be a non-empty string');
  }

  // Read current config
  const config = await readClaudeJson(projectDir);

  // Check if server exists in config
  if (!config.mcpServers[serverName]) {
    throw new Error(`Server '${serverName}' not found in project .claude.json`);
  }

  // Check if it's a blocked override
  if (!isBlockedServer(config.mcpServers[serverName])) {
    throw new Error(
      `Server '${serverName}' is not blocked by mcp-toggle (no blocking metadata found)`
    );
  }

  // Remove override from config
  delete config.mcpServers[serverName];

  // Write updated config
  await writeClaudeJson(projectDir, config);
}

/**
 * Block a memory file by renaming it with .blocked extension.
 *
 * @param filePath - Absolute path to memory file (.md)
 * @throws Error if file not found or rename fails
 */
export async function blockMemoryFile(filePath: string): Promise<void> {
  // Validate input
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('filePath must be a non-empty string');
  }
  if (!path.isAbsolute(filePath)) {
    throw new Error('filePath must be an absolute path');
  }
  if (!filePath.endsWith('.md')) {
    throw new Error('filePath must end with .md');
  }

  // Check if file exists
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`Memory file not found: ${filePath}`);
  }

  // Check if already blocked
  const blockedPath = `${filePath}.blocked`;
  if (await fs.pathExists(blockedPath)) {
    throw new Error(`Memory file is already blocked: ${filePath}`);
  }

  // Rename file to add .blocked extension
  await fs.move(filePath, blockedPath);
}

/**
 * Unblock a memory file by removing .blocked extension.
 *
 * @param filePath - Absolute path to blocked memory file (.md.blocked)
 * @throws Error if file not found or rename fails
 */
export async function unblockMemoryFile(filePath: string): Promise<void> {
  // Validate input
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('filePath must be a non-empty string');
  }
  if (!path.isAbsolute(filePath)) {
    throw new Error('filePath must be an absolute path');
  }
  if (!filePath.endsWith('.md.blocked')) {
    throw new Error('filePath must end with .md.blocked');
  }

  // Check if file exists
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`Blocked memory file not found: ${filePath}`);
  }

  // Remove .blocked extension
  const unblockedPath = filePath.replace(/\.blocked$/, '');

  // Check if target path already exists
  if (await fs.pathExists(unblockedPath)) {
    throw new Error(`Cannot unblock: file already exists at ${unblockedPath}`);
  }

  // Rename file to remove .blocked extension
  await fs.move(filePath, unblockedPath);
}

/**
 * Migrate from legacy .claude/blocked.md format to new .claude.json mechanism.
 * Automatically called on first run of v2.0.0 if legacy file exists.
 *
 * @param projectDir - Project directory to check for legacy file
 * @returns MigrationResult with counts and status
 */
export async function migrateFromLegacyBlocked(
  projectDir: string
): Promise<MigrationResult> {
  // Validate input
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }

  const legacyPath = path.join(projectDir, '.claude', 'blocked.md');

  // Check if legacy file exists
  if (!(await fs.pathExists(legacyPath))) {
    return {
      migrated: false,
      reason: 'no-legacy-file',
    };
  }

  // TODO: Implement migration logic in Phase 9 (US7)
  // This is a placeholder for now
  return {
    migrated: false,
    reason: 'not-implemented',
  };
}

/**
 * Save all pending blocking changes to disk.
 * Wraps atomic write with user confirmation and error handling.
 *
 * @param projectDir - Project directory
 * @param changes - Description of changes to save
 * @returns True if saved successfully
 */
export async function saveBlockingChanges(
  projectDir: string,
  changes: string[]
): Promise<boolean> {
  // Validate inputs
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!Array.isArray(changes)) {
    throw new Error('changes must be an array');
  }

  // TODO: Implement user confirmation and batch write in TUI integration
  // This is a placeholder for now
  return true;
}

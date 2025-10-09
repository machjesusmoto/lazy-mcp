/**
 * Contract: blocked-manager.ts
 *
 * High-level blocking operations for MCP servers and memory files.
 * Implements the core business logic for blocking/unblocking using .claude.json modification.
 */

import { MCPServer, UnblockResult, MigrationResult } from '../types';

/**
 * Block a locally-defined MCP server by removing it from project .claude.json.
 *
 * @param projectDir - Project directory containing .claude.json
 * @param serverName - Name of the server to block
 * @throws Error if server not found in local config or write fails
 *
 * @example
 * await blockLocalServer('/path/to/project', 'magic');
 * // Removes 'magic' entry from project/.claude.json
 */
export function blockLocalServer(projectDir: string, serverName: string): Promise<void>;

/**
 * Block an inherited MCP server by creating a dummy override in project .claude.json.
 *
 * @param projectDir - Project directory where override will be created
 * @param server - MCPServer object with full config and metadata
 * @throws Error if write fails or server is not inherited
 *
 * @example
 * const inheritedServer = {
 *   name: 'magic',
 *   command: 'npx',
 *   args: ['-y', '@21st-dev/cli'],
 *   sourceType: 'inherited',
 *   hierarchyLevel: 1,
 *   isBlocked: false
 * };
 * await blockInheritedServer('/path/to/project', inheritedServer);
 * // Creates override with echo command in project/.claude.json
 */
export function blockInheritedServer(projectDir: string, server: MCPServer): Promise<void>;

/**
 * Unblock a locally-defined MCP server.
 * Returns result indicating manual re-add is required.
 *
 * @param projectDir - Project directory
 * @param serverName - Name of the server to unblock
 * @returns UnblockResult with requiresManualAdd=true and instructions
 *
 * @example
 * const result = await unblockLocalServer('/path/to/project', 'magic');
 * // result.requiresManualAdd = true
 * // result.message = "You must manually add the configuration..."
 */
export function unblockLocalServer(
  projectDir: string,
  serverName: string
): Promise<UnblockResult>;

/**
 * Unblock an inherited MCP server by removing the override from project .claude.json.
 *
 * @param projectDir - Project directory containing override
 * @param serverName - Name of the server to unblock
 * @throws Error if override not found or write fails
 *
 * @example
 * await unblockInheritedServer('/path/to/project', 'magic');
 * // Removes override from project/.claude.json
 * // Server will load from parent config on next Claude Code launch
 */
export function unblockInheritedServer(projectDir: string, serverName: string): Promise<void>;

/**
 * Block a memory file by renaming it with .blocked extension.
 *
 * @param filePath - Absolute path to memory file (.md)
 * @throws Error if file not found or rename fails
 *
 * @example
 * await blockMemoryFile('/path/to/.claude/memories/context.md');
 * // Renames to /path/to/.claude/memories/context.md.blocked
 */
export function blockMemoryFile(filePath: string): Promise<void>;

/**
 * Unblock a memory file by removing .blocked extension.
 *
 * @param filePath - Absolute path to blocked memory file (.md.blocked)
 * @throws Error if file not found or rename fails
 *
 * @example
 * await unblockMemoryFile('/path/to/.claude/memories/context.md.blocked');
 * // Renames to /path/to/.claude/memories/context.md
 */
export function unblockMemoryFile(filePath: string): Promise<void>;

/**
 * Migrate from legacy .claude/blocked.md format to new .claude.json mechanism.
 * Automatically called on first run of v2.0.0 if legacy file exists.
 *
 * @param projectDir - Project directory to check for legacy file
 * @returns MigrationResult with counts and status
 *
 * @example
 * const result = await migrateFromLegacyBlocked('/path/to/project');
 * if (result.migrated) {
 *   console.log(`Migrated ${result.serversCount} servers, ${result.memoryCount} files`);
 * }
 */
export function migrateFromLegacyBlocked(projectDir: string): Promise<MigrationResult>;

/**
 * Save all pending blocking changes to disk.
 * Wraps atomic write with user confirmation and error handling.
 *
 * @param projectDir - Project directory
 * @param changes - Description of changes to save
 * @returns True if saved successfully
 *
 * @example
 * const saved = await saveBlockingChanges('/path/to/project', [
 *   'Block server: magic',
 *   'Unblock memory: context.md'
 * ]);
 * if (saved) {
 *   console.log('Changes saved successfully');
 * }
 */
export function saveBlockingChanges(
  projectDir: string,
  changes: string[]
): Promise<boolean>;

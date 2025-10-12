/**
 * TypeScript type definitions for .claude/settings.json structure
 * Feature: 003-add-migrate-to
 *
 * These types define the native Claude Code settings format, particularly
 * the permissions.deny mechanism used for blocking agents and memory files.
 */

/**
 * Individual deny pattern with type discrimination
 *
 * Allows blocking agents and memory files independently.
 */
export interface DenyPattern {
  /** Type of resource to deny */
  type: 'agent' | 'memory';

  /** Relative path pattern to match (e.g., "agent-name.md" or "category/memory.md") */
  pattern: string;
}

/**
 * Permissions configuration structure
 *
 * Used when we need to work with just the permissions subset.
 */
export interface PermissionsConfig {
  /** Array of deny patterns for agents and memories */
  deny: DenyPattern[];
}

/**
 * Main settings.json structure
 *
 * Claude Code uses this file to configure global and per-project settings.
 * The permissions.deny array is the key mechanism for blocking files.
 */
export interface SettingsJson {
  /** Permissions configuration including deny patterns */
  permissions: PermissionsConfig;

  /** Allow for other unknown properties that Claude Code may add */
  [key: string]: unknown;
}

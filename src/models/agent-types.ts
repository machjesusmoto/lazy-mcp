/**
 * TypeScript type definitions for agent discovery and management
 * Feature: 003-add-migrate-to
 *
 * These types define the structure for agent files in .claude/agents/
 * and support hierarchical override detection.
 */

/**
 * Agent frontmatter (YAML header) structure
 *
 * Agents can have YAML frontmatter with metadata.
 * This is a flexible structure allowing any properties.
 */
export interface AgentFrontmatter {
  /** Agent display name */
  name?: string;

  /** Agent version */
  version?: string;

  /** Agent description */
  description?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Whether agent is enabled */
  enabled?: boolean;

  /** Any additional custom fields */
  [key: string]: unknown;
}

/**
 * Discovered agent file with metadata
 *
 * Represents an agent file found during discovery phase.
 * Includes path, hierarchy information, and parsed frontmatter.
 */
export interface AgentFile {
  /** Relative filename (e.g., "agent.md" or "category/agent.md") */
  name: string;

  /** Absolute file path on disk */
  path: string;

  /**
   * Hierarchy level:
   * - 0: User-global (from ~/.claude/agents/)
   * - 1: Project-local (from .claude/agents/)
   */
  hierarchyLevel: 0 | 1;

  /** Parsed YAML frontmatter (if present) */
  frontmatter?: AgentFrontmatter;
}

/**
 * Agent discovery options
 *
 * Configuration for agent discovery operations.
 */
export interface AgentDiscoveryOptions {
  /** Include project-local agents */
  includeProject?: boolean;

  /** Include user-global agents */
  includeUser?: boolean;

  /** User home directory path (for user-global agents) */
  userHomePath?: string;

  /** Filter by agent name pattern (regex) */
  namePattern?: RegExp;
}

/**
 * Agent override detection result
 *
 * Indicates when a project-local agent overrides a user-global agent.
 */
export interface AgentOverride {
  /** Agent name being overridden */
  name: string;

  /** User-global agent path */
  userPath: string;

  /** Project-local agent path */
  projectPath: string;

  /** Whether frontmatter differs */
  frontmatterDiffers: boolean;
}

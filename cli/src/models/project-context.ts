import { MCPServer } from './mcp-server';
import { MemoryFile } from './memory-file';
import { ConfigSource } from './config-source';
import { BlockedItem } from './blocked-item';
import type { SubAgent } from './types';

/**
 * Aggregates all discovered configuration and blocked state for the current project.
 */
export interface ProjectContext {
  /** Absolute path to current working directory */
  projectPath: string;

  /** All discovered MCP servers */
  mcpServers: MCPServer[];

  /** All discovered memory files */
  memoryFiles: MemoryFile[];

  /** All discovered subagents (project and user level) */
  agents: SubAgent[];

  /** All configuration sources found */
  configSources: ConfigSource[];

  /** All currently blocked items */
  blockedItems: BlockedItem[];

  /** Path to .claude directory if exists */
  claudeDotClaudePath?: string;

  /** Path to blocked.md if it exists or would be created */
  blockedMdPath?: string;

  /** Path to claude.md if exists or would be created */
  claudeMdPath?: string;

  /** Whether can write to .claude directory */
  hasWritePermission: boolean;

  /** Milliseconds taken to enumerate everything */
  enumerationTime: number;
}

/**
 * Computed properties for ProjectContext (not stored, derived at runtime).
 */
export interface ProjectContextStats {
  totalMcpServers: number;
  totalMemoryFiles: number;
  blockedMcpServers: number;
  blockedMemoryFiles: number;
  localMcpServers: number;
  inheritedMcpServers: number;
  localMemoryFiles: number;
  inheritedMemoryFiles: number;
}

/**
 * Computes statistics from a ProjectContext.
 */
export function computeStats(context: ProjectContext): ProjectContextStats {
  return {
    totalMcpServers: context.mcpServers.length,
    totalMemoryFiles: context.memoryFiles.length,
    blockedMcpServers: context.mcpServers.filter((s) => s.isBlocked).length,
    blockedMemoryFiles: context.memoryFiles.filter((f) => f.isBlocked).length,
    localMcpServers: context.mcpServers.filter((s) => s.sourceType === 'local').length,
    inheritedMcpServers: context.mcpServers.filter((s) => s.sourceType === 'inherited').length,
    localMemoryFiles: context.memoryFiles.filter((f) => f.sourceType === 'local').length,
    inheritedMemoryFiles: context.memoryFiles.filter((f) => f.sourceType === 'inherited').length,
  };
}

/**
 * Context statistics for unified overview (US3)
 *
 * Feature: 004-comprehensive-context-management
 * Task: T034
 */
export interface ContextStats {
  mcpServers: { active: number; blocked: number };
  memoryFiles: { loaded: number; blocked: number };
  agents: { available: number; project: number; user: number };
  estimatedSize: string;
}

/**
 * Calculate context statistics for overview display (T034)
 *
 * @param context - Project context to analyze
 * @returns Statistics for all context types
 */
export function calculateContextStats(context: ProjectContext): ContextStats {
  const activeServers = context.mcpServers.filter((s) => !s.isBlocked).length;
  const blockedServers = context.mcpServers.filter((s) => s.isBlocked).length;

  const loadedMemories = context.memoryFiles.filter((m) => !m.isBlocked).length;
  const blockedMemories = context.memoryFiles.filter((m) => m.isBlocked).length;

  const availableAgents = context.agents.filter((a) => !a.isBlocked).length;
  const projectAgents = context.agents.filter((a) => a.source === 'project').length;
  const userAgents = context.agents.filter((a) => a.source === 'user').length;

  const estimatedSize = estimateContextSize(context);

  return {
    mcpServers: { active: activeServers, blocked: blockedServers },
    memoryFiles: { loaded: loadedMemories, blocked: blockedMemories },
    agents: { available: availableAgents, project: projectAgents, user: userAgents },
    estimatedSize,
  };
}

/**
 * Estimate total context size in human-readable format (T035)
 *
 * Sums:
 * - MCP server config sizes (estimated ~1KB per server)
 * - Memory file sizes (from file system)
 * - Agent file sizes (from file system)
 *
 * @param context - Project context to estimate
 * @returns Human-readable size (e.g., "~45KB")
 */
export function estimateContextSize(context: ProjectContext): string {
  let totalBytes = 0;

  // MCP servers: estimate ~1KB per server config
  totalBytes += context.mcpServers.length * 1024;

  // Memory files: sum actual file sizes
  for (const memory of context.memoryFiles) {
    // MemoryFile should have size property, use 0 if not available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Safe fallback for optional size property
    totalBytes += (memory as any).size || 0;
  }

  // Agent files: estimate ~5KB per agent (typical agent file size)
  totalBytes += context.agents.length * 5 * 1024;

  // Convert to human-readable format
  if (totalBytes < 1024) {
    return `~${totalBytes}B`;
  } else if (totalBytes < 1024 * 1024) {
    const kb = Math.ceil(totalBytes / 1024);
    return `~${kb}KB`;
  } else {
    const mb = (totalBytes / (1024 * 1024)).toFixed(1);
    return `~${mb}MB`;
  }
}

/**
 * Validates a ProjectContext object.
 * @throws Error if validation fails
 */
export function validateProjectContext(context: ProjectContext): void {
  if (!context.projectPath || !context.projectPath.startsWith('/')) {
    throw new Error('ProjectContext.projectPath must be absolute path');
  }
  if (!Array.isArray(context.mcpServers)) {
    throw new Error('ProjectContext.mcpServers must be array');
  }
  if (!Array.isArray(context.memoryFiles)) {
    throw new Error('ProjectContext.memoryFiles must be array');
  }
  if (!Array.isArray(context.configSources)) {
    throw new Error('ProjectContext.configSources must be array');
  }
  if (!Array.isArray(context.blockedItems)) {
    throw new Error('ProjectContext.blockedItems must be array');
  }
  if (context.enumerationTime < 0) {
    throw new Error('ProjectContext.enumerationTime must be >= 0');
  }
}

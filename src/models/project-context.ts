import { MCPServer } from './mcp-server';
import { MemoryFile } from './memory-file';
import { ConfigSource } from './config-source';
import { BlockedItem } from './blocked-item';

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

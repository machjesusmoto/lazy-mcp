/**
 * Unified item type for MCP servers, memory files, and agents.
 * Used in the fixed 2-column layout for consistent display and navigation.
 */

import type { MCPServer } from './mcp-server';
import type { MemoryFile } from './memory-file';
import type { SubAgent } from './types';

export type ItemType = 'server' | 'memory' | 'agent';

export interface UnifiedItem {
  /** Unique identifier for the item */
  id: string;

  /** Type of item */
  type: ItemType;

  /** Display name */
  name: string;

  /** Whether the item is currently blocked/disabled */
  isBlocked: boolean;

  /** Source of the item (for display) */
  source: string; // e.g., "global", "local", "project", "user"

  /** Optional description (full text, may be long) */
  description?: string;

  /** Estimated token count */
  estimatedTokens?: number;

  /** Original data (for type-specific operations) */
  data: MCPServer | MemoryFile | SubAgent;
}

/**
 * Convert MCP server to unified item
 */
export function serverToUnifiedItem(server: MCPServer): UnifiedItem {
  const source = server.hierarchyLevel === 0 ? 'local' :
                 server.hierarchyLevel === 1 ? 'project' : 'global';

  return {
    id: `server-${server.name}`,
    type: 'server',
    name: server.name,
    isBlocked: server.isBlocked,
    source,
    description: `MCP Server (${source})`,
    estimatedTokens: server.estimatedTokens,
    data: server,
  };
}

/**
 * Convert memory file to unified item
 */
export function memoryToUnifiedItem(memory: MemoryFile): UnifiedItem {
  const source = memory.sourceType === 'local' ? 'project' : 'user';

  return {
    id: `memory-${memory.name}`,
    type: 'memory',
    name: memory.name,
    isBlocked: memory.isBlocked,
    source,
    description: memory.contentPreview,
    estimatedTokens: memory.estimatedTokens,
    data: memory,
  };
}

/**
 * Convert agent to unified item
 */
export function agentToUnifiedItem(agent: SubAgent): UnifiedItem {
  const source = agent.source === 'project' ? 'project' : 'user';

  return {
    id: `agent-${agent.name}`,
    type: 'agent',
    name: agent.name,
    isBlocked: agent.isBlocked,
    source,
    description: agent.description,
    estimatedTokens: agent.estimatedTokens,
    data: agent,
  };
}

/**
 * Create unified item list from project context
 */
export function createUnifiedItemList(
  servers: MCPServer[],
  memoryFiles: MemoryFile[],
  agents: SubAgent[]
): UnifiedItem[] {
  const items: UnifiedItem[] = [];

  // Add servers
  servers.forEach(server => items.push(serverToUnifiedItem(server)));

  // Add memory files
  memoryFiles.forEach(memory => items.push(memoryToUnifiedItem(memory)));

  // Add agents
  agents.forEach(agent => items.push(agentToUnifiedItem(agent)));

  return items;
}

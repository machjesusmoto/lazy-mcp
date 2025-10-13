/**
 * @mcp-toggle/shared - Project Context Builder
 * Version: 2.0.0
 *
 * Builds complete context status by integrating all components
 */

import { ConfigLoader } from './config-loader';
import { MemoryLoader } from './memory-loader';
import { AgentLoader } from './agent-loader';
import { ContextStatus, BlockingRule, MCPServer, MemoryFile, Agent } from './types';

/**
 * Builds a complete picture of the project's context status
 *
 * Integrates MCP servers, memory files, and agents with blocking rules
 * to provide a comprehensive view of what context is active and what
 * token budget is being consumed.
 */
export class ProjectContextBuilder {
  private configLoader: ConfigLoader;
  private memoryLoader: MemoryLoader;
  private agentLoader: AgentLoader;

  /**
   * Create a new ProjectContextBuilder
   *
   * @param configPath Optional custom path to .claude.json
   * @param claudeDir Optional custom path to .claude directory
   */
  constructor(configPath?: string, claudeDir?: string) {
    this.configLoader = new ConfigLoader(configPath);
    this.memoryLoader = new MemoryLoader(claudeDir);
    this.agentLoader = new AgentLoader();
  }

  /**
   * Build complete context status
   *
   * Loads all context components (MCP servers, memories, agents) and
   * applies blocking rules to determine what's active. Calculates total
   * token usage for budget planning.
   *
   * This is the main entry point for understanding the current state
   * of a project's Claude Code context.
   *
   * @returns Promise resolving to complete context status
   */
  async buildContextStatus(): Promise<ContextStatus> {
    // Load all components in parallel for efficiency
    const [mcpServers, memories, agents, blockingRules] = await Promise.all([
      this.configLoader.loadMCPServers(),
      this.memoryLoader.loadMemoryFiles(),
      this.agentLoader.loadAgents(),
      this.configLoader.loadBlockingRules()
    ]);

    // Apply blocking rules to mark items as disabled
    this.applyBlockingRules(mcpServers, memories, agents, blockingRules);

    // Calculate total token usage from enabled items only
    const totalTokens = this.calculateTotalTokens(mcpServers, memories, agents);

    return {
      mcpServers,
      memories,
      agents,
      totalTokens,
      timestamp: new Date()
    };
  }

  /**
   * Apply blocking rules to mark items as disabled
   *
   * Iterates through blocking rules and updates the enabled flag on
   * matching items. This allows the system to track what's blocked
   * without actually removing configurations.
   *
   * @param mcpServers Array of MCP servers (modified in place)
   * @param memories Array of memory files (modified in place)
   * @param agents Array of agents (modified in place)
   * @param rules Array of blocking rules to apply
   */
  private applyBlockingRules(
    mcpServers: MCPServer[],
    memories: MemoryFile[],
    agents: Agent[],
    rules: BlockingRule[]
  ): void {
    for (const rule of rules) {
      switch (rule.type) {
        case 'mcp': {
          const server = mcpServers.find(s => s.name === rule.name);
          if (server) {
            server.enabled = false;
          }
          break;
        }

        case 'memory': {
          const memory = memories.find(m => m.name === rule.name);
          if (memory) {
            memory.enabled = false;
          }
          break;
        }

        case 'agent': {
          const agent = agents.find(a => a.name === rule.name);
          if (agent) {
            agent.enabled = false;
          }
          break;
        }
      }
    }
  }

  /**
   * Calculate total token usage from enabled items
   *
   * Sums up estimated token usage for all enabled (not blocked) items.
   * This provides the total context budget being consumed.
   *
   * @param mcpServers Array of MCP servers
   * @param memories Array of memory files
   * @param agents Array of agents
   * @returns Total estimated token count
   */
  private calculateTotalTokens(
    mcpServers: MCPServer[],
    memories: MemoryFile[],
    agents: Agent[]
  ): number {
    let total = 0;

    // Sum tokens from enabled MCP servers
    for (const server of mcpServers) {
      if (server.enabled) {
        total += server.estimatedTokens;
      }
    }

    // Sum tokens from enabled memory files
    for (const memory of memories) {
      if (memory.enabled) {
        total += memory.estimatedTokens;
      }
    }

    // Sum tokens from enabled agents
    for (const agent of agents) {
      if (agent.enabled) {
        total += agent.estimatedTokens;
      }
    }

    return total;
  }

  /**
   * Get summary statistics for context status
   *
   * Provides counts and percentages for enabled/disabled items.
   *
   * @param status Context status to summarize
   * @returns Object with summary statistics
   */
  getSummaryStats(status: ContextStatus): {
    totalItems: number;
    enabledItems: number;
    disabledItems: number;
    enabledPercentage: number;
    mcpServerCount: { total: number; enabled: number; disabled: number };
    memoryCount: { total: number; enabled: number; disabled: number };
    agentCount: { total: number; enabled: number; disabled: number };
  } {
    const mcpEnabled = status.mcpServers.filter(s => s.enabled).length;
    const memoryEnabled = status.memories.filter(m => m.enabled).length;
    const agentEnabled = status.agents.filter(a => a.enabled).length;

    const totalItems = status.mcpServers.length + status.memories.length + status.agents.length;
    const enabledItems = mcpEnabled + memoryEnabled + agentEnabled;
    const disabledItems = totalItems - enabledItems;

    return {
      totalItems,
      enabledItems,
      disabledItems,
      enabledPercentage: totalItems > 0 ? (enabledItems / totalItems) * 100 : 0,
      mcpServerCount: {
        total: status.mcpServers.length,
        enabled: mcpEnabled,
        disabled: status.mcpServers.length - mcpEnabled
      },
      memoryCount: {
        total: status.memories.length,
        enabled: memoryEnabled,
        disabled: status.memories.length - memoryEnabled
      },
      agentCount: {
        total: status.agents.length,
        enabled: agentEnabled,
        disabled: status.agents.length - agentEnabled
      }
    };
  }
}

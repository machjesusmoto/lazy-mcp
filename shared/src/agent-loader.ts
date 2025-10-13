/**
 * @mcp-toggle/shared - Agent Loader
 * Version: 2.0.0
 *
 * Loads available Claude Code agents
 */

import { Agent } from './types';

/**
 * Loads Claude Code agent information
 *
 * Note: This is a Phase 2 implementation based on known agents from
 * Claude Code documentation. Full agent discovery will be implemented
 * in a future phase when we better understand the agent system.
 */
export class AgentLoader {
  /**
   * Load available agents
   *
   * Returns a list of known Claude Code agents with their types and
   * estimated token usage. This is based on the Task tool documentation
   * and known agent capabilities.
   *
   * Future enhancements:
   * - Dynamic agent discovery from Claude Code configuration
   * - Runtime agent capability detection
   * - Custom agent registration
   * - More accurate token estimation based on agent complexity
   *
   * @returns Promise resolving to array of available agents
   */
  async loadAgents(): Promise<Agent[]> {
    // Known Claude Code agents from Task tool documentation
    const knownAgents: Agent[] = [
      {
        name: 'general-purpose',
        type: 'general',
        description: 'General-purpose task execution',
        enabled: true,
        estimatedTokens: 2000
      },
      {
        name: 'backend-architect',
        type: 'development',
        description: 'Backend and API design',
        enabled: true,
        estimatedTokens: 3000
      },
      {
        name: 'frontend-developer',
        type: 'development',
        description: 'UI/UX development',
        enabled: true,
        estimatedTokens: 3000
      },
      {
        name: 'system-architect',
        type: 'architecture',
        description: 'System architecture design',
        enabled: true,
        estimatedTokens: 3000
      },
      {
        name: 'security-engineer',
        type: 'security',
        description: 'Security analysis and vulnerability assessment',
        enabled: true,
        estimatedTokens: 2500
      },
      {
        name: 'performance-engineer',
        type: 'performance',
        description: 'Performance optimization and profiling',
        enabled: true,
        estimatedTokens: 2500
      },
      {
        name: 'quality-engineer',
        type: 'testing',
        description: 'Quality assurance and testing',
        enabled: true,
        estimatedTokens: 2500
      },
      {
        name: 'test-writer-fixer',
        type: 'testing',
        description: 'Test automation and fixing',
        enabled: true,
        estimatedTokens: 2500
      },
      {
        name: 'rapid-prototyper',
        type: 'development',
        description: 'Quick MVP creation and prototyping',
        enabled: true,
        estimatedTokens: 2500
      },
      {
        name: 'documentation-architect',
        type: 'documentation',
        description: 'Documentation creation and organization',
        enabled: true,
        estimatedTokens: 2000
      }
    ];

    return knownAgents;
  }

  /**
   * Get agent by name
   *
   * @param name Name of the agent to retrieve
   * @returns Promise resolving to agent if found, undefined otherwise
   */
  async getAgent(name: string): Promise<Agent | undefined> {
    const agents = await this.loadAgents();
    return agents.find(agent => agent.name === name);
  }

  /**
   * Get agents by type
   *
   * @param type Type of agents to retrieve (e.g., 'development', 'testing')
   * @returns Promise resolving to array of matching agents
   */
  async getAgentsByType(type: string): Promise<Agent[]> {
    const agents = await this.loadAgents();
    return agents.filter(agent => agent.type === type);
  }

  /**
   * Check if an agent exists
   *
   * @param name Name of the agent to check
   * @returns Promise resolving to true if agent exists
   */
  async agentExists(name: string): Promise<boolean> {
    const agent = await this.getAgent(name);
    return agent !== undefined;
  }
}

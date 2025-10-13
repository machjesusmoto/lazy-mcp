/**
 * @mcp-toggle/shared - Configuration Loader
 * Version: 2.0.0
 *
 * Loads MCP server configurations and blocking rules.
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MCPServer, BlockingRule } from './types';

/**
 * Loads configuration from .claude.json and blocking rules from .claude/blocked.md
 */
export class ConfigLoader {
  private claudeConfigPath: string;
  private blockedConfigPath: string;

  constructor(configPath?: string, blockedPath?: string) {
    const homeDir = os.homedir();
    this.claudeConfigPath = configPath || path.join(homeDir, '.claude.json');
    this.blockedConfigPath = blockedPath || path.join(homeDir, '.claude', 'blocked.md');
  }

  /**
   * Load MCP servers from .claude.json
   *
   * Reads the mcpServers section of .claude.json and converts it to MCPServer objects.
   * Handles missing files gracefully by returning an empty array.
   *
   * @returns Promise resolving to array of MCP server configurations
   */
  async loadMCPServers(): Promise<MCPServer[]> {
    try {
      if (!await fs.pathExists(this.claudeConfigPath)) {
        return [];
      }

      const configData = await fs.readJSON(this.claudeConfigPath);
      const mcpConfig = configData.mcpServers || {};

      return Object.entries(mcpConfig).map(([name, config]: [string, any]) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        name,
        command: config.command || '',
        args: config.args || [],
        env: config.env || {},
        enabled: true, // Will be updated based on blocking rules
        estimatedTokens: this.estimateServerTokens(name)
      }));
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      return [];
    }
  }

  /**
   * Load blocking rules from .claude/blocked.md
   *
   * Parses the blocking rules file which uses the format:
   * - mcp: server-name
   * - memory: memory-file.md
   * - agent: agent-name
   *
   * @returns Promise resolving to array of blocking rules
   */
  async loadBlockingRules(): Promise<BlockingRule[]> {
    try {
      if (!await fs.pathExists(this.blockedConfigPath)) {
        return [];
      }

      const content = await fs.readFile(this.blockedConfigPath, 'utf-8');
      const rules: BlockingRule[] = [];

      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        const mcpMatch = trimmedLine.match(/^mcp:\s*(.+)/);
        const memoryMatch = trimmedLine.match(/^memory:\s*(.+)/);
        const agentMatch = trimmedLine.match(/^agent:\s*(.+)/);

        if (mcpMatch) {
          rules.push({ type: 'mcp', name: mcpMatch[1].trim() });
        } else if (memoryMatch) {
          rules.push({ type: 'memory', name: memoryMatch[1].trim() });
        } else if (agentMatch) {
          rules.push({ type: 'agent', name: agentMatch[1].trim() });
        }
      }

      return rules;
    } catch (error) {
      console.error('Error loading blocking rules:', error);
      return [];
    }
  }

  /**
   * Estimate token usage for an MCP server
   *
   * Uses heuristics to estimate token consumption:
   * - Base tokens for server initialization
   * - Additional tokens for known large servers
   * - Tool count estimation if available
   *
   * Note: These are rough estimates. Phase 3 will integrate with lazy-mcp
   * for more accurate token tracking.
   *
   * @param name Server name for lookup in known large servers
   * @returns Estimated token count
   */
  private estimateServerTokens(name: string): number {
    const baseTokens = 5000;

    // Known large servers that consume significant context
    const largeServers: Record<string, number> = {
      'sequential-thinking': 15000,
      'playwright': 12000,
      'context7': 10000,
      'serena': 15000,
      'morphllm': 8000
    };

    if (largeServers[name]) {
      return largeServers[name];
    }

    // Default estimate for unknown servers
    return baseTokens;
  }

  /**
   * Get the current project root directory
   *
   * @returns Current working directory path
   */
  getProjectRoot(): string {
    return process.cwd();
  }

  /**
   * Get the .claude directory path
   *
   * @returns Path to user's .claude configuration directory
   */
  getClaudeDir(): string {
    return path.join(os.homedir(), '.claude');
  }

  /**
   * Get the path to .claude.json
   *
   * @returns Path to Claude configuration file
   */
  getClaudeConfigPath(): string {
    return this.claudeConfigPath;
  }

  /**
   * Get the path to blocked.md
   *
   * @returns Path to blocking rules file
   */
  getBlockedConfigPath(): string {
    return this.blockedConfigPath;
  }
}

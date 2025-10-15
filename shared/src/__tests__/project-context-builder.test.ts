/**
 * @mcp-toggle/shared - ProjectContextBuilder Tests
 */

import { ProjectContextBuilder } from '../project-context-builder';
import { ConfigLoader } from '../config-loader';
import { MemoryLoader } from '../memory-loader';
import { AgentLoader } from '../agent-loader';

// Mock the loaders
jest.mock('../config-loader');
jest.mock('../memory-loader');
jest.mock('../agent-loader');

describe('ProjectContextBuilder', () => {
  let builder: ProjectContextBuilder;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConfigLoader: jest.Mocked<ConfigLoader>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMemoryLoader: jest.Mocked<MemoryLoader>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAgentLoader: jest.Mocked<AgentLoader>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create builder instance
    builder = new ProjectContextBuilder();

    // Get mock instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockConfigLoader = (builder as any).configLoader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockMemoryLoader = (builder as any).memoryLoader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAgentLoader = (builder as any).agentLoader;
  });

  describe('buildContextStatus', () => {
    it('should build complete context status', async () => {
      // Setup mock data
      const mockServers = [
        { name: 'server1', command: 'node', enabled: true, estimatedTokens: 5000, args: [], env: {} }
      ];
      const mockMemories = [
        { path: '/test.md', name: 'test.md', size: 1000, lastModified: new Date(), enabled: true, estimatedTokens: 250 }
      ];
      const mockAgents = [
        { name: 'general-purpose', type: 'general', enabled: true, estimatedTokens: 2000 }
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRules: any[] = [];

      mockConfigLoader.loadMCPServers.mockResolvedValue(mockServers);
      mockMemoryLoader.loadMemoryFiles.mockResolvedValue(mockMemories);
      mockAgentLoader.loadAgents.mockResolvedValue(mockAgents);
      mockConfigLoader.loadBlockingRules.mockResolvedValue(mockRules);

      const status = await builder.buildContextStatus();

      expect(status.mcpServers).toHaveLength(1);
      expect(status.memories).toHaveLength(1);
      expect(status.agents).toHaveLength(1);
      expect(status.totalTokens).toBe(7250); // 5000 + 250 + 2000
      expect(status.timestamp).toBeInstanceOf(Date);
    });

    it('should apply blocking rules', async () => {
      // Setup mock data with blocking rules
      const mockServers = [
        { name: 'server1', command: 'node', enabled: true, estimatedTokens: 5000, args: [], env: {} },
        { name: 'server2', command: 'node', enabled: true, estimatedTokens: 3000, args: [], env: {} }
      ];
      const mockMemories = [
        { path: '/test.md', name: 'test.md', size: 1000, lastModified: new Date(), enabled: true, estimatedTokens: 250 }
      ];
      const mockAgents = [
        { name: 'general-purpose', type: 'general', enabled: true, estimatedTokens: 2000 }
      ];
      const mockRules = [
        { type: 'mcp' as const, name: 'server2' },
        { type: 'agent' as const, name: 'general-purpose' }
      ];

      mockConfigLoader.loadMCPServers.mockResolvedValue(mockServers);
      mockMemoryLoader.loadMemoryFiles.mockResolvedValue(mockMemories);
      mockAgentLoader.loadAgents.mockResolvedValue(mockAgents);
      mockConfigLoader.loadBlockingRules.mockResolvedValue(mockRules);

      const status = await builder.buildContextStatus();

      // Check that blocked items are marked as disabled
      const server2 = status.mcpServers.find(s => s.name === 'server2');
      expect(server2?.enabled).toBe(false);

      const agent = status.agents.find(a => a.name === 'general-purpose');
      expect(agent?.enabled).toBe(false);

      // Total should only include enabled items (server1 + test.md)
      expect(status.totalTokens).toBe(5250); // 5000 + 250
    });

    it('should handle empty context', async () => {
      mockConfigLoader.loadMCPServers.mockResolvedValue([]);
      mockMemoryLoader.loadMemoryFiles.mockResolvedValue([]);
      mockAgentLoader.loadAgents.mockResolvedValue([]);
      mockConfigLoader.loadBlockingRules.mockResolvedValue([]);

      const status = await builder.buildContextStatus();

      expect(status.mcpServers).toHaveLength(0);
      expect(status.memories).toHaveLength(0);
      expect(status.agents).toHaveLength(0);
      expect(status.totalTokens).toBe(0);
    });
  });

  describe('getSummaryStats', () => {
    it('should calculate summary statistics', async () => {
      const mockServers = [
        { name: 'server1', command: 'node', enabled: true, estimatedTokens: 5000, args: [], env: {} },
        { name: 'server2', command: 'node', enabled: false, estimatedTokens: 3000, args: [], env: {} }
      ];
      const mockMemories = [
        { path: '/test.md', name: 'test.md', size: 1000, lastModified: new Date(), enabled: true, estimatedTokens: 250 }
      ];
      const mockAgents = [
        { name: 'agent1', type: 'general', enabled: true, estimatedTokens: 2000 },
        { name: 'agent2', type: 'test', enabled: false, estimatedTokens: 2500 }
      ];

      mockConfigLoader.loadMCPServers.mockResolvedValue(mockServers);
      mockMemoryLoader.loadMemoryFiles.mockResolvedValue(mockMemories);
      mockAgentLoader.loadAgents.mockResolvedValue(mockAgents);
      mockConfigLoader.loadBlockingRules.mockResolvedValue([]);

      const status = await builder.buildContextStatus();
      const stats = builder.getSummaryStats(status);

      expect(stats.totalItems).toBe(5); // 2 servers + 1 memory + 2 agents
      expect(stats.enabledItems).toBe(3); // server1 + test.md + agent1
      expect(stats.disabledItems).toBe(2); // server2 + agent2
      expect(stats.enabledPercentage).toBe(60); // 3/5 * 100

      expect(stats.mcpServerCount).toEqual({ total: 2, enabled: 1, disabled: 1 });
      expect(stats.memoryCount).toEqual({ total: 1, enabled: 1, disabled: 0 });
      expect(stats.agentCount).toEqual({ total: 2, enabled: 1, disabled: 1 });
    });

    it('should handle zero items', async () => {
      mockConfigLoader.loadMCPServers.mockResolvedValue([]);
      mockMemoryLoader.loadMemoryFiles.mockResolvedValue([]);
      mockAgentLoader.loadAgents.mockResolvedValue([]);
      mockConfigLoader.loadBlockingRules.mockResolvedValue([]);

      const status = await builder.buildContextStatus();
      const stats = builder.getSummaryStats(status);

      expect(stats.totalItems).toBe(0);
      expect(stats.enabledItems).toBe(0);
      expect(stats.disabledItems).toBe(0);
      expect(stats.enabledPercentage).toBe(0);
    });
  });
});

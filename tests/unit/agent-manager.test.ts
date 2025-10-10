/**
 * Agent Manager Unit Tests
 *
 * Feature: 004-comprehensive-context-management
 * User Story: US2 (Agent Discovery & Management)
 * Tasks: T021-T024
 *
 * Tests agent discovery, loading, and override detection.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  loadAgentFile,
  loadAgentsFromDir,
  mergeWithOverrides,
  discoverAgents,
} from '../../src/core/agent-manager';
import type { SubAgent } from '../../src/models/types';

// Mock os.homedir at module level with default return value
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => require('os').tmpdir()),
}));

describe('Agent Manager - US2 Agent Discovery', () => {
  let testDir: string;
  let projectAgentsDir: string;
  let userAgentsDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `mcp-toggle-agents-${Date.now()}`);
    await fs.ensureDir(testDir);

    projectAgentsDir = path.join(testDir, '.claude', 'agents');
    userAgentsDir = path.join(os.homedir(), '.claude', 'agents');

    await fs.ensureDir(projectAgentsDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('loadAgentFile (T021)', () => {
    it('should load agent with all frontmatter fields', async () => {
      const agentContent = `---
name: test-agent
description: A comprehensive test agent for validation
color: blue
model: claude-3-5-sonnet-20241022
tools: Read, Write, Bash
---
# Test Agent

This is the agent body with instructions.
`;
      const agentPath = path.join(projectAgentsDir, 'test-agent.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      const agent = await loadAgentFile(agentPath, 'project');

      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('A comprehensive test agent for validation');
      expect(agent.filePath).toBe(agentPath);
      expect(agent.source).toBe('project');
      expect(agent.isOverride).toBe(false);
      expect(agent.isBlocked).toBe(false);
      expect(agent.color).toBe('blue');
      expect(agent.model).toBe('claude-3-5-sonnet-20241022');
      expect(agent.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should load agent with minimal required fields', async () => {
      const agentContent = `---
name: minimal-agent
description: Just the essentials
---
# Minimal Agent
`;
      const agentPath = path.join(projectAgentsDir, 'minimal.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      const agent = await loadAgentFile(agentPath, 'user');

      expect(agent.name).toBe('minimal-agent');
      expect(agent.description).toBe('Just the essentials');
      expect(agent.source).toBe('user');
      expect(agent.model).toBeUndefined();
      expect(agent.tools).toBeUndefined();
      expect(agent.color).toBeUndefined();
    });

    it('should handle multiline description by extracting first substantial line', async () => {
      const agentContent = `---
name: multiline-agent
description: |
  This is the first line of a long description.

  This is additional context that should be ignored.
  And even more details here.
---
`;
      const agentPath = path.join(projectAgentsDir, 'multiline.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      const agent = await loadAgentFile(agentPath, 'project');

      expect(agent.description).toBe('This is the first line of a long description.');
    });

    it('should skip XML tags and examples in description extraction', async () => {
      const agentContent = `---
name: example-agent
description: |
  <example>
  user: "Some example dialogue"
  </example>

  The actual description is here.
  More text follows.
---
`;
      const agentPath = path.join(projectAgentsDir, 'example.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      const agent = await loadAgentFile(agentPath, 'project');

      expect(agent.description).toBe('The actual description is here.');
    });

    it('should throw error for missing name field', async () => {
      const agentContent = `---
description: No name provided
---
`;
      const agentPath = path.join(projectAgentsDir, 'no-name.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      await expect(loadAgentFile(agentPath, 'project')).rejects.toThrow(
        "Agent file missing required 'name' field"
      );
    });

    it('should throw error for missing description field', async () => {
      const agentContent = `---
name: no-description
---
`;
      const agentPath = path.join(projectAgentsDir, 'no-desc.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      await expect(loadAgentFile(agentPath, 'project')).rejects.toThrow(
        "Agent file missing required 'description' field"
      );
    });

    it('should throw error for invalid frontmatter', async () => {
      const agentContent = `---
invalid yaml: [unclosed
---
`;
      const agentPath = path.join(projectAgentsDir, 'invalid.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      await expect(loadAgentFile(agentPath, 'project')).rejects.toThrow();
    });

    it('should throw error for missing frontmatter', async () => {
      const agentContent = `# Just a heading

No frontmatter here.
`;
      const agentPath = path.join(projectAgentsDir, 'no-frontmatter.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      await expect(loadAgentFile(agentPath, 'project')).rejects.toThrow(
        'Invalid frontmatter'
      );
    });

    it('should parse tools from comma-separated string', async () => {
      const agentContent = `---
name: tool-agent
description: Agent with multiple tools
tools: Read, Write, Edit, Bash, Grep
---
`;
      const agentPath = path.join(projectAgentsDir, 'tools.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      const agent = await loadAgentFile(agentPath, 'project');

      expect(agent.tools).toEqual(['Read', 'Write', 'Edit', 'Bash', 'Grep']);
    });

    it('should handle tools string with extra whitespace', async () => {
      const agentContent = `---
name: whitespace-agent
description: Tools with spacing
tools:  Read ,  Write  ,Bash
---
`;
      const agentPath = path.join(projectAgentsDir, 'whitespace.md');
      await fs.writeFile(agentPath, agentContent, 'utf-8');

      const agent = await loadAgentFile(agentPath, 'project');

      expect(agent.tools).toEqual(['Read', 'Write', 'Bash']);
    });
  });

  describe('loadAgentsFromDir (T022)', () => {
    it('should return empty array for non-existent directory', async () => {
      const agents = await loadAgentsFromDir('/path/that/does/not/exist', 'project');

      expect(agents).toEqual([]);
    });

    it('should load multiple agents from directory', async () => {
      await fs.writeFile(
        path.join(projectAgentsDir, 'agent1.md'),
        '---\nname: first\ndescription: First agent\n---\n',
        'utf-8'
      );
      await fs.writeFile(
        path.join(projectAgentsDir, 'agent2.md'),
        '---\nname: second\ndescription: Second agent\n---\n',
        'utf-8'
      );

      const agents = await loadAgentsFromDir(projectAgentsDir, 'project');

      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.name).sort()).toEqual(['first', 'second']);
    });

    it('should discover agents in subdirectories', async () => {
      const subdir = path.join(projectAgentsDir, 'category');
      await fs.ensureDir(subdir);
      await fs.writeFile(
        path.join(subdir, 'nested.md'),
        '---\nname: nested-agent\ndescription: In a subdirectory\n---\n',
        'utf-8'
      );

      const agents = await loadAgentsFromDir(projectAgentsDir, 'project');

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('nested-agent');
    });

    it('should continue loading after encountering invalid agent', async () => {
      await fs.writeFile(
        path.join(projectAgentsDir, 'valid.md'),
        '---\nname: valid\ndescription: Valid agent\n---\n',
        'utf-8'
      );
      await fs.writeFile(
        path.join(projectAgentsDir, 'invalid.md'),
        '---\nno-name: true\n---\n',
        'utf-8'
      );
      await fs.writeFile(
        path.join(projectAgentsDir, 'also-valid.md'),
        '---\nname: also-valid\ndescription: Another valid one\n---\n',
        'utf-8'
      );

      // Spy on console.warn to verify error logging
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const agents = await loadAgentsFromDir(projectAgentsDir, 'project');

      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.name).sort()).toEqual(['also-valid', 'valid']);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load agent file'),
        expect.anything()
      );

      warnSpy.mockRestore();
    });

    it('should only load .md files', async () => {
      await fs.writeFile(
        path.join(projectAgentsDir, 'agent.md'),
        '---\nname: markdown\ndescription: Markdown file\n---\n',
        'utf-8'
      );
      await fs.writeFile(path.join(projectAgentsDir, 'readme.txt'), 'Not an agent', 'utf-8');
      await fs.writeFile(path.join(projectAgentsDir, 'config.json'), '{}', 'utf-8');

      const agents = await loadAgentsFromDir(projectAgentsDir, 'project');

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('markdown');
    });
  });

  describe('mergeWithOverrides (T023)', () => {
    it('should return project agents when no user agents exist', () => {
      const projectAgents: SubAgent[] = [
        {
          name: 'project-only',
          description: 'Project agent',
          filePath: '/path/to/project.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const merged = mergeWithOverrides(projectAgents, []);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual(projectAgents[0]);
    });

    it('should return user agents when no project agents exist', () => {
      const userAgents: SubAgent[] = [
        {
          name: 'user-only',
          description: 'User agent',
          filePath: '/path/to/user.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const merged = mergeWithOverrides([], userAgents);

      expect(merged).toHaveLength(1);
      expect(merged[0].isOverride).toBe(false);
    });

    it('should detect single override (project overrides user)', () => {
      const projectAgents: SubAgent[] = [
        {
          name: 'shared-agent',
          description: 'Project version',
          filePath: '/project/shared.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const userAgents: SubAgent[] = [
        {
          name: 'shared-agent',
          description: 'User version',
          filePath: '/user/shared.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const merged = mergeWithOverrides(projectAgents, userAgents);

      expect(merged).toHaveLength(1);
      expect(merged[0].source).toBe('project');
      expect(merged[0].description).toBe('Project version');
    });

    it('should mark overridden user agents with isOverride: true', () => {
      const projectAgents: SubAgent[] = [
        {
          name: 'override-me',
          description: 'Project',
          filePath: '/project/override.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const userAgents: SubAgent[] = [
        {
          name: 'override-me',
          description: 'User',
          filePath: '/user/override.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const merged = mergeWithOverrides(projectAgents, userAgents);

      // The overridden user agent should not be in final array
      expect(merged.every(a => a.isOverride === false)).toBe(true);
      expect(merged).toHaveLength(1);
    });

    it('should handle multiple overrides correctly', () => {
      const projectAgents: SubAgent[] = [
        {
          name: 'agent-a',
          description: 'Project A',
          filePath: '/project/a.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
        {
          name: 'agent-c',
          description: 'Project C',
          filePath: '/project/c.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const userAgents: SubAgent[] = [
        {
          name: 'agent-a',
          description: 'User A',
          filePath: '/user/a.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
        {
          name: 'agent-b',
          description: 'User B',
          filePath: '/user/b.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
        {
          name: 'agent-c',
          description: 'User C',
          filePath: '/user/c.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const merged = mergeWithOverrides(projectAgents, userAgents);

      expect(merged).toHaveLength(3);

      const agentA = merged.find(a => a.name === 'agent-a');
      expect(agentA?.source).toBe('project');

      const agentB = merged.find(a => a.name === 'agent-b');
      expect(agentB?.source).toBe('user');
      expect(agentB?.isOverride).toBe(false);

      const agentC = merged.find(a => a.name === 'agent-c');
      expect(agentC?.source).toBe('project');
    });

    it('should preserve order: project agents first, then non-overridden user agents', () => {
      const projectAgents: SubAgent[] = [
        {
          name: 'project-1',
          description: 'P1',
          filePath: '/p1.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
        {
          name: 'project-2',
          description: 'P2',
          filePath: '/p2.md',
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const userAgents: SubAgent[] = [
        {
          name: 'user-1',
          description: 'U1',
          filePath: '/u1.md',
          source: 'user',
          isOverride: false,
          isBlocked: false,
        },
      ];

      const merged = mergeWithOverrides(projectAgents, userAgents);

      expect(merged.map(a => a.name)).toEqual(['project-1', 'project-2', 'user-1']);
    });

    it('should handle empty arrays', () => {
      expect(mergeWithOverrides([], [])).toEqual([]);
    });
  });

  describe('discoverAgents (T024)', () => {
    const mockHomedir = os.homedir as jest.Mock;

    afterEach(() => {
      mockHomedir.mockClear();
    });

    it('should discover agents from both project and user directories', async () => {
      // Create project agent
      await fs.writeFile(
        path.join(projectAgentsDir, 'project.md'),
        '---\nname: project-agent\ndescription: From project\n---\n',
        'utf-8'
      );

      // Mock user agents directory (can't write to actual user home in tests)
      const mockUserDir = path.join(testDir, 'mock-user');
      const mockUserAgentsDir = path.join(mockUserDir, '.claude', 'agents');
      await fs.ensureDir(mockUserAgentsDir);
      await fs.writeFile(
        path.join(mockUserAgentsDir, 'user.md'),
        '---\nname: user-agent\ndescription: From user\n---\n',
        'utf-8'
      );

      // Mock os.homedir to return our test directory
      mockHomedir.mockReturnValue(mockUserDir);

      const agents = await discoverAgents(testDir);

      expect(agents).toHaveLength(2);
      expect(agents.some(a => a.name === 'project-agent')).toBe(true);
      expect(agents.some(a => a.name === 'user-agent')).toBe(true);
    });

    it('should detect override when same agent exists in both directories', async () => {
      await fs.writeFile(
        path.join(projectAgentsDir, 'shared.md'),
        '---\nname: shared\ndescription: Project version\nmodel: project-model\n---\n',
        'utf-8'
      );

      const mockUserDir = path.join(testDir, 'mock-user');
      const mockUserAgentsDir = path.join(mockUserDir, '.claude', 'agents');
      await fs.ensureDir(mockUserAgentsDir);
      await fs.writeFile(
        path.join(mockUserAgentsDir, 'shared.md'),
        '---\nname: shared\ndescription: User version\nmodel: user-model\n---\n',
        'utf-8'
      );

      mockHomedir.mockReturnValue(mockUserDir);

      const agents = await discoverAgents(testDir);

      expect(agents).toHaveLength(1);
      expect(agents[0].source).toBe('project');
      expect(agents[0].model).toBe('project-model');
    });

    it('should handle missing project agents directory', async () => {
      await fs.remove(projectAgentsDir);

      const mockUserDir = path.join(testDir, 'mock-user');
      const mockUserAgentsDir = path.join(mockUserDir, '.claude', 'agents');
      await fs.ensureDir(mockUserAgentsDir);
      await fs.writeFile(
        path.join(mockUserAgentsDir, 'user.md'),
        '---\nname: user-only\ndescription: Only in user dir\n---\n',
        'utf-8'
      );

      mockHomedir.mockReturnValue(mockUserDir);

      const agents = await discoverAgents(testDir);

      expect(agents).toHaveLength(1);
      expect(agents[0].source).toBe('user');
    });

    it('should handle missing user agents directory', async () => {
      await fs.writeFile(
        path.join(projectAgentsDir, 'project.md'),
        '---\nname: project-only\ndescription: Only in project\n---\n',
        'utf-8'
      );

      mockHomedir.mockReturnValue('/nonexistent/path');

      const agents = await discoverAgents(testDir);

      expect(agents).toHaveLength(1);
      expect(agents[0].source).toBe('project');
    });

    it('should return empty array when both directories are missing', async () => {
      await fs.remove(projectAgentsDir);
      mockHomedir.mockReturnValue('/nonexistent/path');

      const agents = await discoverAgents(testDir);

      expect(agents).toEqual([]);
    });
  });

  describe('checkAgentBlockedStatus', () => {
    it('should check blocked status for all agents', async () => {
      const { checkAgentBlockedStatus } = await import('../../src/core/agent-manager');

      // Create agents
      const agents: SubAgent[] = [
        {
          name: 'agent1',
          description: 'First agent',
          filePath: path.join(projectAgentsDir, 'agent1.md'),
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
        {
          name: 'agent2',
          description: 'Second agent',
          filePath: path.join(projectAgentsDir, 'agent2.md'),
          source: 'project',
          isOverride: false,
          isBlocked: false,
        },
      ];

      // Block one agent via settings
      const { addDenyPattern } = await import('../../src/core/settings-manager');
      await addDenyPattern(testDir, 'agent', 'agent1.md');

      // Check status
      const checked = await checkAgentBlockedStatus(testDir, agents);

      expect(checked[0].isBlocked).toBe(true);
      expect(checked[1].isBlocked).toBe(false);
    });

    it('should handle empty agent list', async () => {
      const { checkAgentBlockedStatus } = await import('../../src/core/agent-manager');

      const checked = await checkAgentBlockedStatus(testDir, []);

      expect(checked).toEqual([]);
    });

    it('should preserve all agent properties', async () => {
      const { checkAgentBlockedStatus } = await import('../../src/core/agent-manager');

      const agents: SubAgent[] = [
        {
          name: 'test-agent',
          description: 'Test description',
          filePath: path.join(projectAgentsDir, 'test.md'),
          source: 'project',
          isOverride: false,
          isBlocked: false,
          model: 'claude-3-opus',
          tools: ['Read', 'Write'],
          color: 'blue',
        },
      ];

      const checked = await checkAgentBlockedStatus(testDir, agents);

      expect(checked[0].name).toBe('test-agent');
      expect(checked[0].description).toBe('Test description');
      expect(checked[0].model).toBe('claude-3-opus');
      expect(checked[0].tools).toEqual(['Read', 'Write']);
      expect(checked[0].color).toBe('blue');
    });
  });

  describe('blockAgent', () => {
    it('should add deny pattern for agent', async () => {
      const { blockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      await blockAgent(testDir, 'test-agent');

      const isBlocked = await isDenied(testDir, 'agent', 'test-agent.md');
      expect(isBlocked).toBe(true);
    });

    it('should handle agent names without extension', async () => {
      const { blockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      await blockAgent(testDir, 'my-agent');

      const isBlocked = await isDenied(testDir, 'agent', 'my-agent.md');
      expect(isBlocked).toBe(true);
    });

    it('should block multiple agents', async () => {
      const { blockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      await blockAgent(testDir, 'agent1');
      await blockAgent(testDir, 'agent2');
      await blockAgent(testDir, 'agent3');

      const blocked1 = await isDenied(testDir, 'agent', 'agent1.md');
      const blocked2 = await isDenied(testDir, 'agent', 'agent2.md');
      const blocked3 = await isDenied(testDir, 'agent', 'agent3.md');

      expect(blocked1).toBe(true);
      expect(blocked2).toBe(true);
      expect(blocked3).toBe(true);
    });

    it('should be idempotent (blocking twice is safe)', async () => {
      const { blockAgent } = await import('../../src/core/agent-manager');
      const { loadSettings } = await import('../../src/core/settings-manager');

      await blockAgent(testDir, 'agent1');
      await blockAgent(testDir, 'agent1');

      const settings = await loadSettings(testDir);
      const agentPatterns = settings.permissions.deny.filter(
        (d) => d.type === 'agent' && d.pattern === 'agent1.md'
      );

      expect(agentPatterns).toHaveLength(1);
    });
  });

  describe('unblockAgent', () => {
    it('should remove deny pattern for agent', async () => {
      const { blockAgent, unblockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      // Block first
      await blockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(true);

      // Then unblock
      await unblockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(false);
    });

    it('should handle unblocking non-blocked agent', async () => {
      const { unblockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      // Should not throw
      await unblockAgent(testDir, 'never-blocked');

      const isBlocked = await isDenied(testDir, 'agent', 'never-blocked.md');
      expect(isBlocked).toBe(false);
    });

    it('should unblock specific agent among multiple blocked', async () => {
      const { blockAgent, unblockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      // Block three agents
      await blockAgent(testDir, 'agent1');
      await blockAgent(testDir, 'agent2');
      await blockAgent(testDir, 'agent3');

      // Unblock middle one
      await unblockAgent(testDir, 'agent2');

      expect(await isDenied(testDir, 'agent', 'agent1.md')).toBe(true);
      expect(await isDenied(testDir, 'agent', 'agent2.md')).toBe(false);
      expect(await isDenied(testDir, 'agent', 'agent3.md')).toBe(true);
    });

    it('should be idempotent (unblocking twice is safe)', async () => {
      const { blockAgent, unblockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      await blockAgent(testDir, 'agent1');
      await unblockAgent(testDir, 'agent1');
      await unblockAgent(testDir, 'agent1'); // Second time

      expect(await isDenied(testDir, 'agent', 'agent1.md')).toBe(false);
    });
  });

  describe('Block/Unblock Integration', () => {
    it('should support multiple block/unblock cycles', async () => {
      const { blockAgent, unblockAgent } = await import('../../src/core/agent-manager');
      const { isDenied } = await import('../../src/core/settings-manager');

      // Cycle 1
      await blockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(true);

      await unblockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(false);

      // Cycle 2
      await blockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(true);

      await unblockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(false);

      // Cycle 3
      await blockAgent(testDir, 'test-agent');
      expect(await isDenied(testDir, 'agent', 'test-agent.md')).toBe(true);
    });

    it('should work with full discovery and blocking workflow', async () => {
      const { discoverAgents, checkAgentBlockedStatus, blockAgent, unblockAgent } = await import(
        '../../src/core/agent-manager'
      );

      // Create test agents
      await fs.writeFile(
        path.join(projectAgentsDir, 'agent1.md'),
        '---\nname: agent1\ndescription: First agent\n---\n',
        'utf-8'
      );
      await fs.writeFile(
        path.join(projectAgentsDir, 'agent2.md'),
        '---\nname: agent2\ndescription: Second agent\n---\n',
        'utf-8'
      );

      (os.homedir as jest.Mock).mockReturnValue('/nonexistent');

      // Discover
      let agents = await discoverAgents(testDir);
      expect(agents).toHaveLength(2);

      // Check status (none blocked)
      agents = await checkAgentBlockedStatus(testDir, agents);
      expect(agents.every((a) => !a.isBlocked)).toBe(true);

      // Block one
      await blockAgent(testDir, 'agent1');
      agents = await checkAgentBlockedStatus(testDir, agents);
      expect(agents.find((a) => a.name === 'agent1')?.isBlocked).toBe(true);
      expect(agents.find((a) => a.name === 'agent2')?.isBlocked).toBe(false);

      // Unblock
      await unblockAgent(testDir, 'agent1');
      agents = await checkAgentBlockedStatus(testDir, agents);
      expect(agents.every((a) => !a.isBlocked)).toBe(true);
    });
  });
});

/**
 * Integration tests for context management feature
 * Feature: 003-add-migrate-to
 *
 * Tests complete workflows across settings-manager, agent-manager, and memory-blocker.
 * Implements Task T009 from implementation plan.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  createProjectStructure,
  populateWithAgents,
  populateWithMemories,
  verifySettingsJson,
  cleanupTestEnvironment,
} from '../helpers/integration-helpers';

// Mock os.homedir to use test directory
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(),
}));

describe('Context Management Integration', () => {
  let testDir: string;
  let userHomeDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `mcp-toggle-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);

    // Setup user home directory mock
    userHomeDir = path.join(testDir, 'home');
    await fs.ensureDir(userHomeDir);
    (os.homedir as jest.Mock).mockReturnValue(userHomeDir);
  });

  afterEach(async () => {
    await cleanupTestEnvironment(testDir);
  });

  describe('Complete Agent Workflow', () => {
    it('should discover, block, and unblock agents across hierarchies', async () => {
      // Setup
      const { projectDir } = await createProjectStructure(testDir);
      await populateWithAgents(projectDir, ['project-agent.md']);
      await populateWithAgents(userHomeDir, ['user-agent.md', 'shared-agent.md']);
      await populateWithAgents(projectDir, ['shared-agent.md']); // Override

      // Import actual functions
      const { discoverAgents } = await import('../../src/core/agent-manager');
      const { addDenyPattern, isDenied, removeDenyPattern } = await import('../../src/core/settings-manager');

      // Discovery (discoverAgents handles both project and user dirs internally)
      const merged = await discoverAgents(projectDir);

      expect(merged).toHaveLength(3); // shared-agent overridden, user-agent, project-agent

      // Block project agent
      await addDenyPattern(projectDir, 'agent', 'project-agent.md');

      // Verify blocked
      const blocked = await isDenied(projectDir, 'agent', 'project-agent.md');
      expect(blocked).toBe(true);

      // Unblock
      await removeDenyPattern(projectDir, 'agent', 'project-agent.md');

      // Verify unblocked
      const unblocked = await isDenied(projectDir, 'agent', 'project-agent.md');
      expect(unblocked).toBe(false);
    });

    it('should handle agent override detection and blocking', async () => {
      const { projectDir } = await createProjectStructure(testDir);

      // User has base agent
      await populateWithAgents(userHomeDir, ['base-agent.md']);

      // Project overrides it
      await populateWithAgents(projectDir, ['base-agent.md']);

      const { discoverAgents } = await import('../../src/core/agent-manager');
      const { addDenyPattern, isDenied } = await import('../../src/core/settings-manager');

      const merged = await discoverAgents(projectDir);

      // Should have 1 agent (project overrides user)
      expect(merged).toHaveLength(1);
      expect(merged[0].source).toBe('project'); // project override

      // Block the override
      await addDenyPattern(projectDir, 'agent', 'base-agent.md');

      const blocked = await isDenied(projectDir, 'agent', 'base-agent.md');
      expect(blocked).toBe(true);
    });
  });

  describe('Complete Memory Workflow', () => {
    it('should discover, block, and unblock memory files', async () => {
      const { projectDir } = await createProjectStructure(testDir);
      await populateWithMemories(projectDir, {
        'memory1.md': '# Memory 1 content',
        'memory2.md': '# Memory 2 content',
        'category/memory3.md': '# Nested memory',
      });

      const { blockMemoryFile, isMemoryBlocked, unblockMemoryFile, listBlockedMemories } = await import(
        '../../src/core/memory-blocker'
      );

      // Block memory files
      await blockMemoryFile(projectDir, 'memory1.md');
      await blockMemoryFile(projectDir, 'category/memory3.md');

      // Verify blocked
      const mem1Blocked = await isMemoryBlocked(projectDir, 'memory1.md');
      const mem2Blocked = await isMemoryBlocked(projectDir, 'memory2.md');
      const mem3Blocked = await isMemoryBlocked(projectDir, 'category/memory3.md');

      expect(mem1Blocked).toBe(true);
      expect(mem2Blocked).toBe(false);
      expect(mem3Blocked).toBe(true);

      // List blocked
      const blockedList = await listBlockedMemories(projectDir);
      expect(blockedList).toContain('memory1.md');
      expect(blockedList).toContain('category/memory3.md');
      expect(blockedList).not.toContain('memory2.md');

      // Unblock one
      await unblockMemoryFile(projectDir, 'memory1.md');

      const mem1AfterUnblock = await isMemoryBlocked(projectDir, 'memory1.md');
      expect(mem1AfterUnblock).toBe(false);
    });

    it('should handle blocking multiple memory files atomically', async () => {
      const { projectDir } = await createProjectStructure(testDir);

      const { blockMemoryFile, listBlockedMemories } = await import('../../src/core/memory-blocker');

      // Block multiple files
      await Promise.all([
        blockMemoryFile(projectDir, 'mem1.md'),
        blockMemoryFile(projectDir, 'mem2.md'),
        blockMemoryFile(projectDir, 'mem3.md'),
      ]);

      const blocked = await listBlockedMemories(projectDir);
      expect(blocked).toHaveLength(3);
    });
  });

  describe('Mixed Agent and Memory Blocking', () => {
    it('should independently manage agent and memory deny patterns', async () => {
      const { projectDir } = await createProjectStructure(testDir);
      await populateWithAgents(projectDir, ['agent.md']);
      await populateWithMemories(projectDir, { 'memory.md': '# Memory' });

      const { addDenyPattern, isDenied, loadSettings } = await import('../../src/core/settings-manager');

      // Block both
      await addDenyPattern(projectDir, 'agent', 'agent.md');
      await addDenyPattern(projectDir, 'memory', 'memory.md');

      // Verify both blocked
      const agentBlocked = await isDenied(projectDir, 'agent', 'agent.md');
      const memoryBlocked = await isDenied(projectDir, 'memory', 'memory.md');

      expect(agentBlocked).toBe(true);
      expect(memoryBlocked).toBe(true);

      // Verify settings structure
      const settings = await loadSettings(projectDir);
      expect(settings.permissions.deny).toHaveLength(2);

      const agentDeny = settings.permissions.deny.find((d) => d.type === 'agent');
      const memoryDeny = settings.permissions.deny.find((d) => d.type === 'memory');

      expect(agentDeny?.pattern).toBe('agent.md');
      expect(memoryDeny?.pattern).toBe('memory.md');
    });

    it('should allow same filename for agent and memory with different types', async () => {
      const { projectDir } = await createProjectStructure(testDir);

      const { addDenyPattern, isDenied } = await import('../../src/core/settings-manager');

      // Block agent and memory with same name
      await addDenyPattern(projectDir, 'agent', 'same-name.md');
      await addDenyPattern(projectDir, 'memory', 'same-name.md');

      // Verify both are independently blocked
      const agentBlocked = await isDenied(projectDir, 'agent', 'same-name.md');
      const memoryBlocked = await isDenied(projectDir, 'memory', 'same-name.md');

      expect(agentBlocked).toBe(true);
      expect(memoryBlocked).toBe(true);

      // Remove agent block
      const { removeDenyPattern } = await import('../../src/core/settings-manager');
      await removeDenyPattern(projectDir, 'agent', 'same-name.md');

      // Agent unblocked, memory still blocked
      const agentAfter = await isDenied(projectDir, 'agent', 'same-name.md');
      const memoryAfter = await isDenied(projectDir, 'memory', 'same-name.md');

      expect(agentAfter).toBe(false);
      expect(memoryAfter).toBe(true);
    });
  });

  describe('Settings.json Integrity', () => {
    it('should maintain valid JSON structure across operations', async () => {
      const { projectDir } = await createProjectStructure(testDir);

      const { addDenyPattern, removeDenyPattern } = await import('../../src/core/settings-manager');

      // Perform many operations
      await addDenyPattern(projectDir, 'agent', 'agent1.md');
      await addDenyPattern(projectDir, 'memory', 'memory1.md');
      await addDenyPattern(projectDir, 'agent', 'agent2.md');
      await removeDenyPattern(projectDir, 'agent', 'agent1.md');
      await addDenyPattern(projectDir, 'memory', 'memory2.md');

      // Verify JSON is valid
      const settingsPath = path.join(projectDir, '.claude', 'settings.json');
      await verifySettingsJson(settingsPath);

      // Verify structure
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions).toBeDefined();
      expect(Array.isArray(settings.permissions.deny)).toBe(true);
      expect(settings.permissions.deny).toHaveLength(3);
    });

    it('should recover from corrupted settings.json', async () => {
      const { projectDir } = await createProjectStructure(testDir);
      const settingsPath = path.join(projectDir, '.claude', 'settings.json');

      // Create corrupted settings
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, '{ invalid json }', 'utf-8');

      const { loadSettings } = await import('../../src/core/settings-manager');

      // Should handle gracefully
      await expect(loadSettings(projectDir)).rejects.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent agent blocking operations', async () => {
      const { projectDir } = await createProjectStructure(testDir);

      const { addDenyPattern, isDenied } = await import('../../src/core/settings-manager');

      // Block multiple agents concurrently
      await Promise.all([
        addDenyPattern(projectDir, 'agent', 'agent1.md'),
        addDenyPattern(projectDir, 'agent', 'agent2.md'),
        addDenyPattern(projectDir, 'agent', 'agent3.md'),
      ]);

      // Verify all blocked
      const results = await Promise.all([
        isDenied(projectDir, 'agent', 'agent1.md'),
        isDenied(projectDir, 'agent', 'agent2.md'),
        isDenied(projectDir, 'agent', 'agent3.md'),
      ]);

      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should handle concurrent memory blocking operations', async () => {
      const { projectDir } = await createProjectStructure(testDir);

      const { blockMemoryFile, isMemoryBlocked } = await import('../../src/core/memory-blocker');

      await Promise.all([
        blockMemoryFile(projectDir, 'mem1.md'),
        blockMemoryFile(projectDir, 'mem2.md'),
        blockMemoryFile(projectDir, 'mem3.md'),
      ]);

      const results = await Promise.all([
        isMemoryBlocked(projectDir, 'mem1.md'),
        isMemoryBlocked(projectDir, 'mem2.md'),
        isMemoryBlocked(projectDir, 'mem3.md'),
      ]);

      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should rollback failed operations without corrupting settings', async () => {
      const { projectDir } = await createProjectStructure(testDir);
      const settingsPath = path.join(projectDir, '.claude', 'settings.json');

      const { addDenyPattern } = await import('../../src/core/settings-manager');

      // Add initial pattern
      await addDenyPattern(projectDir, 'agent', 'initial.md');

      // Make directory read-only
      await fs.chmod(path.dirname(settingsPath), 0o444);

      // Attempt to add pattern (should fail)
      try {
        await addDenyPattern(projectDir, 'agent', 'should-fail.md');
      } catch (error) {
        // Expected
      }

      // Restore permissions
      await fs.chmod(path.dirname(settingsPath), 0o755);

      // Settings should still be valid with only initial pattern
      await verifySettingsJson(settingsPath);

      const { loadSettings } = await import('../../src/core/settings-manager');
      const settings = await loadSettings(projectDir);

      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('initial.md');
    });
  });
});

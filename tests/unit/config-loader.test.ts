import { loadMCPServers } from '../../src/core/config-loader';
import { createTempDir, cleanupTempDir, createMockClaudeJson } from '../helpers/test-utils';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('config-loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('loadMCPServers', () => {
    it('should parse .claude.json files correctly', async () => {
      await createMockClaudeJson(tempDir, {
        filesystem: {
          command: 'node',
          args: ['./fs.js'],
        },
      });

      const servers = await loadMCPServers(tempDir);

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('filesystem');
      expect(servers[0].command).toBe('node');
      expect(servers[0].args).toEqual(['./fs.js']);
      expect(servers[0].hierarchyLevel).toBe(0);
      expect(servers[0].sourceType).toBe('local');
    });

    it('should traverse hierarchy (current → parent → home)', async () => {
      // Create nested directory structure
      const parentDir = tempDir;
      const childDir = path.join(tempDir, 'child');
      const grandchildDir = path.join(childDir, 'grandchild');

      await createMockClaudeJson(parentDir, {
        'parent-server': { command: 'parent' },
      });
      await createMockClaudeJson(childDir, {
        'child-server': { command: 'child' },
      });
      await createMockClaudeJson(grandchildDir, {
        'grandchild-server': { command: 'grandchild' },
      });

      const servers = await loadMCPServers(grandchildDir);

      expect(servers).toHaveLength(3);
      expect(servers.find((s) => s.name === 'grandchild-server')?.hierarchyLevel).toBe(0);
      expect(servers.find((s) => s.name === 'child-server')?.hierarchyLevel).toBe(1);
      expect(servers.find((s) => s.name === 'parent-server')?.hierarchyLevel).toBe(2);
    });

    it('should merge configurations with child overriding parent', async () => {
      const parentDir = tempDir;
      const childDir = path.join(tempDir, 'child');

      await createMockClaudeJson(parentDir, {
        server1: { command: 'parent-cmd' },
        server2: { command: 'parent-only' },
      });
      await createMockClaudeJson(childDir, {
        server1: { command: 'child-cmd' }, // Override
        server3: { command: 'child-only' },
      });

      const servers = await loadMCPServers(childDir);

      // Should have 3 unique servers
      expect(servers).toHaveLength(3);

      // server1 should be from child (override)
      const server1 = servers.find((s) => s.name === 'server1');
      expect(server1?.command).toBe('child-cmd');
      expect(server1?.hierarchyLevel).toBe(0);

      // server2 from parent
      expect(servers.find((s) => s.name === 'server2')?.command).toBe('parent-only');

      // server3 from child
      expect(servers.find((s) => s.name === 'server3')?.command).toBe('child-only');
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidPath = path.join(tempDir, '.claude.json');
      await fs.writeFile(invalidPath, '{invalid json}', 'utf-8');

      const servers = await loadMCPServers(tempDir);

      // Should return empty array, not throw
      expect(servers).toEqual([]);
    });

    it('should handle missing files gracefully', async () => {
      // No .claude.json created
      const servers = await loadMCPServers(tempDir);

      expect(servers).toEqual([]);
    });

    it('should handle missing mcpServers key', async () => {
      await fs.writeFile(path.join(tempDir, '.claude.json'), '{"other": "data"}', 'utf-8');

      const servers = await loadMCPServers(tempDir);

      expect(servers).toEqual([]);
    });

    it('should set isBlocked to false by default', async () => {
      await createMockClaudeJson(tempDir, {
        filesystem: { command: 'node' },
      });

      const servers = await loadMCPServers(tempDir);

      expect(servers[0].isBlocked).toBe(false);
      expect(servers[0].blockedAt).toBeUndefined();
    });
  });
});

/**
 * Tests for memory-blocker.ts
 * Feature: 003-add-migrate-to
 *
 * Tests memory file blocking via settings.json deny patterns.
 * Implements Task T007 from implementation plan.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  blockMemoryFile,
  unblockMemoryFile,
  isMemoryBlocked,
  listBlockedMemories,
} from '../../src/core/memory-blocker';

describe('memory-blocker', () => {
  let testDir: string;
  let memoriesDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-toggle-memory-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);

    memoriesDir = path.join(testDir, '.claude', 'memories');
    settingsPath = path.join(testDir, '.claude', 'settings.json');

    await fs.ensureDir(memoriesDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('blockMemoryFile', () => {
    it('should add deny pattern to settings.json', async () => {
      await blockMemoryFile(testDir, 'test-memory.md');

      const settingsExists = await fs.pathExists(settingsPath);
      expect(settingsExists).toBe(true);

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0]).toEqual({
        type: 'memory',
        pattern: 'test-memory.md',
      });
    });

    it('should block memory file with nested path', async () => {
      await blockMemoryFile(testDir, 'category/subcategory/memory.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny[0].pattern).toBe('category/subcategory/memory.md');
    });

    it('should not duplicate existing deny patterns', async () => {
      await blockMemoryFile(testDir, 'duplicate.md');
      await blockMemoryFile(testDir, 'duplicate.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(1);
    });

    it('should preserve existing deny patterns', async () => {
      await blockMemoryFile(testDir, 'memory1.md');
      await blockMemoryFile(testDir, 'memory2.md');
      await blockMemoryFile(testDir, 'memory3.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(3);

      const patterns = settings.permissions.deny.map((d: any) => d.pattern);
      expect(patterns).toContain('memory1.md');
      expect(patterns).toContain('memory2.md');
      expect(patterns).toContain('memory3.md');
    });

    it('should handle blocking when settings.json does not exist', async () => {
      const settingsExists = await fs.pathExists(settingsPath);
      expect(settingsExists).toBe(false);

      await blockMemoryFile(testDir, 'new-memory.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('new-memory.md');
    });

    it('should create .claude directory if missing', async () => {
      await fs.remove(path.join(testDir, '.claude'));

      await blockMemoryFile(testDir, 'memory.md');

      const claudeDirExists = await fs.pathExists(path.join(testDir, '.claude'));
      expect(claudeDirExists).toBe(true);

      const settingsExists = await fs.pathExists(settingsPath);
      expect(settingsExists).toBe(true);
    });
  });

  describe('unblockMemoryFile', () => {
    it('should remove deny pattern from settings.json', async () => {
      await blockMemoryFile(testDir, 'blocked.md');
      await blockMemoryFile(testDir, 'keep-blocked.md');

      await unblockMemoryFile(testDir, 'blocked.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('keep-blocked.md');
    });

    it('should handle unblocking non-existent pattern gracefully', async () => {
      await blockMemoryFile(testDir, 'exists.md');

      await unblockMemoryFile(testDir, 'does-not-exist.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('exists.md');
    });

    it('should handle missing settings.json gracefully', async () => {
      // Should not throw error
      await expect(unblockMemoryFile(testDir, 'anything.md')).resolves.not.toThrow();
    });

    it('should handle empty deny list', async () => {
      // Create settings with empty deny list
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(
        settingsPath,
        JSON.stringify({ permissions: { deny: [] } }),
        'utf-8'
      );

      await unblockMemoryFile(testDir, 'anything.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(0);
    });

    it('should only remove memory patterns, not agent patterns', async () => {
      // Manually create settings with both agent and memory deny patterns
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(
        settingsPath,
        JSON.stringify({
          permissions: {
            deny: [
              { type: 'agent', pattern: 'agent.md' },
              { type: 'memory', pattern: 'memory.md' },
            ],
          },
        }),
        'utf-8'
      );

      await unblockMemoryFile(testDir, 'memory.md');

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].type).toBe('agent');
      expect(settings.permissions.deny[0].pattern).toBe('agent.md');
    });
  });

  describe('isMemoryBlocked', () => {
    it('should return true for blocked memory file', async () => {
      await blockMemoryFile(testDir, 'blocked.md');

      const blocked = await isMemoryBlocked(testDir, 'blocked.md');
      expect(blocked).toBe(true);
    });

    it('should return false for allowed memory file', async () => {
      await blockMemoryFile(testDir, 'other.md');

      const blocked = await isMemoryBlocked(testDir, 'allowed.md');
      expect(blocked).toBe(false);
    });

    it('should return false when settings.json does not exist', async () => {
      const blocked = await isMemoryBlocked(testDir, 'any-memory.md');
      expect(blocked).toBe(false);
    });

    it('should handle nested memory paths', async () => {
      await blockMemoryFile(testDir, 'category/subcategory/blocked.md');

      const blocked = await isMemoryBlocked(testDir, 'category/subcategory/blocked.md');
      expect(blocked).toBe(true);

      const notBlocked = await isMemoryBlocked(testDir, 'category/subcategory/allowed.md');
      expect(notBlocked).toBe(false);
    });

    it('should check exact pattern match', async () => {
      await blockMemoryFile(testDir, 'exact-name.md');

      const exactMatch = await isMemoryBlocked(testDir, 'exact-name.md');
      expect(exactMatch).toBe(true);

      const partialMatch = await isMemoryBlocked(testDir, 'exact-name-extended.md');
      expect(partialMatch).toBe(false);
    });

    it('should handle empty deny list', async () => {
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(
        settingsPath,
        JSON.stringify({ permissions: { deny: [] } }),
        'utf-8'
      );

      const blocked = await isMemoryBlocked(testDir, 'anything.md');
      expect(blocked).toBe(false);
    });

    it('should not be affected by agent deny patterns', async () => {
      // Create settings with agent deny pattern
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(
        settingsPath,
        JSON.stringify({
          permissions: {
            deny: [{ type: 'agent', pattern: 'same-name.md' }],
          },
        }),
        'utf-8'
      );

      const blocked = await isMemoryBlocked(testDir, 'same-name.md');
      expect(blocked).toBe(false); // Only memory type should match
    });
  });

  describe('listBlockedMemories', () => {
    it('should return list of blocked memory patterns', async () => {
      await blockMemoryFile(testDir, 'memory1.md');
      await blockMemoryFile(testDir, 'memory2.md');
      await blockMemoryFile(testDir, 'category/memory3.md');

      const blocked = await listBlockedMemories(testDir);

      expect(blocked).toHaveLength(3);
      expect(blocked).toContain('memory1.md');
      expect(blocked).toContain('memory2.md');
      expect(blocked).toContain('category/memory3.md');
    });

    it('should return empty array when no memories are blocked', async () => {
      const blocked = await listBlockedMemories(testDir);
      expect(blocked).toHaveLength(0);
    });

    it('should return empty array when settings.json does not exist', async () => {
      const blocked = await listBlockedMemories(testDir);
      expect(blocked).toEqual([]);
    });

    it('should only return memory patterns, not agent patterns', async () => {
      // Create settings with mixed patterns
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(
        settingsPath,
        JSON.stringify({
          permissions: {
            deny: [
              { type: 'agent', pattern: 'agent1.md' },
              { type: 'memory', pattern: 'memory1.md' },
              { type: 'agent', pattern: 'agent2.md' },
              { type: 'memory', pattern: 'memory2.md' },
            ],
          },
        }),
        'utf-8'
      );

      const blocked = await listBlockedMemories(testDir);

      expect(blocked).toHaveLength(2);
      expect(blocked).toContain('memory1.md');
      expect(blocked).toContain('memory2.md');
      expect(blocked).not.toContain('agent1.md');
      expect(blocked).not.toContain('agent2.md');
    });

    it('should handle empty deny list', async () => {
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(
        settingsPath,
        JSON.stringify({ permissions: { deny: [] } }),
        'utf-8'
      );

      const blocked = await listBlockedMemories(testDir);
      expect(blocked).toEqual([]);
    });
  });

  describe('Atomic Write Pattern Integration', () => {
    it('should rollback on failure during blockMemoryFile', async () => {
      await blockMemoryFile(testDir, 'initial.md');

      // Make directory read-only
      await fs.chmod(path.dirname(settingsPath), 0o444);

      try {
        await blockMemoryFile(testDir, 'should-fail.md');
      } catch (error) {
        // Expected
      }

      // Restore permissions
      await fs.chmod(path.dirname(settingsPath), 0o755);

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      // Should only have initial pattern
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('initial.md');
    });

    it('should rollback on failure during unblockMemoryFile', async () => {
      await blockMemoryFile(testDir, 'keep.md');
      await blockMemoryFile(testDir, 'remove.md');

      // Make directory read-only
      await fs.chmod(path.dirname(settingsPath), 0o444);

      try {
        await unblockMemoryFile(testDir, 'remove.md');
      } catch (error) {
        // Expected
      }

      // Restore permissions
      await fs.chmod(path.dirname(settingsPath), 0o755);

      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      // Both patterns should still exist
      expect(settings.permissions.deny).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle memory files with special characters in name', async () => {
      await blockMemoryFile(testDir, 'memory-with-dashes.md');
      await blockMemoryFile(testDir, 'memory_with_underscores.md');
      await blockMemoryFile(testDir, 'memory.with.dots.md');

      const blocked = await listBlockedMemories(testDir);

      expect(blocked).toContain('memory-with-dashes.md');
      expect(blocked).toContain('memory_with_underscores.md');
      expect(blocked).toContain('memory.with.dots.md');
    });

    it('should handle very long memory file paths', async () => {
      const longPath = 'a'.repeat(200) + '.md';
      await blockMemoryFile(testDir, longPath);

      const blocked = await isMemoryBlocked(testDir, longPath);
      expect(blocked).toBe(true);
    });

    it('should handle blocking and unblocking in rapid succession', async () => {
      await blockMemoryFile(testDir, 'rapid.md');
      await unblockMemoryFile(testDir, 'rapid.md');
      await blockMemoryFile(testDir, 'rapid.md');
      await unblockMemoryFile(testDir, 'rapid.md');

      const blocked = await isMemoryBlocked(testDir, 'rapid.md');
      expect(blocked).toBe(false);
    });

    it('should handle concurrent block operations on different files', async () => {
      // Test concurrent operations (though actual concurrency depends on implementation)
      await Promise.all([
        blockMemoryFile(testDir, 'concurrent1.md'),
        blockMemoryFile(testDir, 'concurrent2.md'),
        blockMemoryFile(testDir, 'concurrent3.md'),
      ]);

      const blocked = await listBlockedMemories(testDir);
      expect(blocked).toHaveLength(3);
    });
  });
});

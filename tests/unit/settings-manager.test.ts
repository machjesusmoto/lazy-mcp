/**
 * Tests for settings-manager.ts
 * Feature: 003-add-migrate-to
 *
 * Tests settings.json management including deny patterns for agent/memory blocking.
 * Implements Task T003 from implementation plan.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  loadSettings,
  updateSettings,
  addDenyPattern,
  removeDenyPattern,
  isDenied,
} from '../../src/core/settings-manager';
import type { SettingsJson, PermissionsConfig } from '../../src/models/settings-types';

describe('settings-manager', () => {
  let testDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-toggle-settings-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
    settingsPath = path.join(testDir, '.claude', 'settings.json');
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('loadSettings', () => {
    it('should create settings file with defaults if missing', async () => {
      const settings = await loadSettings(testDir);

      expect(settings).toBeDefined();
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.deny).toEqual([]);

      // Verify file was created on disk
      const exists = await fs.pathExists(settingsPath);
      expect(exists).toBe(true);
    });

    it('should parse existing JSON settings file', async () => {
      const existingSettings: SettingsJson = {
        permissions: {
          deny: [
            { type: 'agent', pattern: 'test-agent-1.md' },
            { type: 'memory', pattern: 'blocked-memory.md' },
          ],
        },
      };

      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf-8');

      const settings = await loadSettings(testDir);

      expect(settings.permissions.deny).toHaveLength(2);
      expect(settings.permissions.deny[0]).toEqual({
        type: 'agent',
        pattern: 'test-agent-1.md',
      });
      expect(settings.permissions.deny[1]).toEqual({
        type: 'memory',
        pattern: 'blocked-memory.md',
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, '{ invalid json }', 'utf-8');

      await expect(loadSettings(testDir)).rejects.toThrow();
    });

    it('should handle missing permissions field', async () => {
      const partialSettings = { someOtherField: 'value' };
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, JSON.stringify(partialSettings), 'utf-8');

      const settings = await loadSettings(testDir);

      // Should initialize with default permissions
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.deny).toEqual([]);
    });

    it('should create parent directory if it does not exist', async () => {
      const settings = await loadSettings(testDir);

      expect(settings).toBeDefined();
      const dirExists = await fs.pathExists(path.dirname(settingsPath));
      expect(dirExists).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('should merge new settings with existing ones', async () => {
      // Create initial settings
      const initial: SettingsJson = {
        permissions: {
          deny: [{ type: 'agent', pattern: 'agent1.md' }],
        },
      };
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, JSON.stringify(initial), 'utf-8');

      // Update with additional deny pattern
      const updates: Partial<SettingsJson> = {
        permissions: {
          deny: [
            { type: 'agent', pattern: 'agent1.md' },
            { type: 'memory', pattern: 'memory1.md' },
          ],
        },
      };

      await updateSettings(testDir, updates);

      const result = await loadSettings(testDir);
      expect(result.permissions.deny).toHaveLength(2);
    });

    it('should write valid JSON to disk', async () => {
      const updates: Partial<SettingsJson> = {
        permissions: {
          deny: [{ type: 'agent', pattern: 'test.md' }],
        },
      };

      await updateSettings(testDir, updates);

      const content = await fs.readFile(settingsPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();

      const parsed = JSON.parse(content);
      expect(parsed.permissions.deny).toHaveLength(1);
    });

    it('should use atomic write pattern', async () => {
      // Pre-populate with initial settings
      const initial: SettingsJson = {
        permissions: {
          deny: [{ type: 'agent', pattern: 'original.md' }],
        },
      };
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, JSON.stringify(initial), 'utf-8');

      const updates: Partial<SettingsJson> = {
        permissions: {
          deny: [{ type: 'agent', pattern: 'updated.md' }],
        },
      };

      await updateSettings(testDir, updates);

      // Verify no temp or backup files remain
      const tempPath = `${settingsPath}.tmp`;
      const backupPath = `${settingsPath}.backup`;

      const tempExists = await fs.pathExists(tempPath);
      const backupExists = await fs.pathExists(backupPath);

      expect(tempExists).toBe(false);
      expect(backupExists).toBe(false);
    });

    it('should preserve file on write failure', async () => {
      // Pre-populate
      const initial: SettingsJson = {
        permissions: {
          deny: [{ type: 'agent', pattern: 'original.md' }],
        },
      };
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeFile(settingsPath, JSON.stringify(initial), 'utf-8');

      // Make directory read-only to simulate failure
      await fs.chmod(path.dirname(settingsPath), 0o444);

      const updates: Partial<SettingsJson> = {
        permissions: {
          deny: [{ type: 'agent', pattern: 'should-not-write.md' }],
        },
      };

      try {
        await updateSettings(testDir, updates);
      } catch (error) {
        // Expected failure
      }

      // Restore permissions
      await fs.chmod(path.dirname(settingsPath), 0o755);

      // Original settings should still be intact
      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny[0].pattern).toBe('original.md');
    });
  });

  describe('addDenyPattern', () => {
    it('should add new agent deny pattern', async () => {
      await addDenyPattern(testDir, 'agent', 'blocked-agent.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0]).toEqual({
        type: 'agent',
        pattern: 'blocked-agent.md',
      });
    });

    it('should add new memory deny pattern', async () => {
      await addDenyPattern(testDir, 'memory', 'blocked-memory.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0]).toEqual({
        type: 'memory',
        pattern: 'blocked-memory.md',
      });
    });

    it('should not duplicate existing patterns', async () => {
      await addDenyPattern(testDir, 'agent', 'duplicate.md');
      await addDenyPattern(testDir, 'agent', 'duplicate.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
    });

    it('should allow same pattern with different type', async () => {
      await addDenyPattern(testDir, 'agent', 'same-name.md');
      await addDenyPattern(testDir, 'memory', 'same-name.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(2);
    });

    it('should preserve existing deny patterns when adding new ones', async () => {
      await addDenyPattern(testDir, 'agent', 'agent1.md');
      await addDenyPattern(testDir, 'memory', 'memory1.md');
      await addDenyPattern(testDir, 'agent', 'agent2.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(3);

      const patterns = settings.permissions.deny.map((d) => d.pattern);
      expect(patterns).toContain('agent1.md');
      expect(patterns).toContain('memory1.md');
      expect(patterns).toContain('agent2.md');
    });
  });

  describe('removeDenyPattern', () => {
    it('should remove specific agent pattern', async () => {
      await addDenyPattern(testDir, 'agent', 'to-remove.md');
      await addDenyPattern(testDir, 'agent', 'to-keep.md');

      await removeDenyPattern(testDir, 'agent', 'to-remove.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('to-keep.md');
    });

    it('should remove specific memory pattern', async () => {
      await addDenyPattern(testDir, 'memory', 'mem1.md');
      await addDenyPattern(testDir, 'memory', 'mem2.md');

      await removeDenyPattern(testDir, 'memory', 'mem1.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('mem2.md');
    });

    it('should only remove pattern with matching type', async () => {
      await addDenyPattern(testDir, 'agent', 'same-name.md');
      await addDenyPattern(testDir, 'memory', 'same-name.md');

      await removeDenyPattern(testDir, 'agent', 'same-name.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].type).toBe('memory');
    });

    it('should handle removing non-existent pattern gracefully', async () => {
      await addDenyPattern(testDir, 'agent', 'exists.md');

      await removeDenyPattern(testDir, 'agent', 'does-not-exist.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('exists.md');
    });

    it('should handle empty deny list', async () => {
      await removeDenyPattern(testDir, 'agent', 'anything.md');

      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(0);
    });
  });

  describe('isDenied', () => {
    it('should return true for denied agent', async () => {
      await addDenyPattern(testDir, 'agent', 'blocked-agent.md');

      const denied = await isDenied(testDir, 'agent', 'blocked-agent.md');
      expect(denied).toBe(true);
    });

    it('should return true for denied memory', async () => {
      await addDenyPattern(testDir, 'memory', 'blocked-memory.md');

      const denied = await isDenied(testDir, 'memory', 'blocked-memory.md');
      expect(denied).toBe(true);
    });

    it('should return false for allowed agent', async () => {
      await addDenyPattern(testDir, 'agent', 'other-agent.md');

      const denied = await isDenied(testDir, 'agent', 'allowed-agent.md');
      expect(denied).toBe(false);
    });

    it('should return false for allowed memory', async () => {
      await addDenyPattern(testDir, 'memory', 'other-memory.md');

      const denied = await isDenied(testDir, 'memory', 'allowed-memory.md');
      expect(denied).toBe(false);
    });

    it('should return false when settings file does not exist', async () => {
      const denied = await isDenied(testDir, 'agent', 'any-agent.md');
      expect(denied).toBe(false);
    });

    it('should check type specificity', async () => {
      await addDenyPattern(testDir, 'agent', 'same-name.md');

      const agentDenied = await isDenied(testDir, 'agent', 'same-name.md');
      const memoryDenied = await isDenied(testDir, 'memory', 'same-name.md');

      expect(agentDenied).toBe(true);
      expect(memoryDenied).toBe(false);
    });
  });

  describe('Atomic Write Pattern Integration', () => {
    it('should rollback on failure during addDenyPattern', async () => {
      // Add initial pattern
      await addDenyPattern(testDir, 'agent', 'initial.md');

      // Make directory read-only
      await fs.chmod(path.dirname(settingsPath), 0o444);

      try {
        await addDenyPattern(testDir, 'agent', 'should-fail.md');
      } catch (error) {
        // Expected
      }

      // Restore permissions
      await fs.chmod(path.dirname(settingsPath), 0o755);

      // Only initial pattern should exist
      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(1);
      expect(settings.permissions.deny[0].pattern).toBe('initial.md');
    });

    it('should rollback on failure during removeDenyPattern', async () => {
      // Add patterns
      await addDenyPattern(testDir, 'agent', 'keep.md');
      await addDenyPattern(testDir, 'agent', 'remove.md');

      // Make directory read-only
      await fs.chmod(path.dirname(settingsPath), 0o444);

      try {
        await removeDenyPattern(testDir, 'agent', 'remove.md');
      } catch (error) {
        // Expected
      }

      // Restore permissions
      await fs.chmod(path.dirname(settingsPath), 0o755);

      // Both patterns should still exist
      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(2);
    });
  });
});

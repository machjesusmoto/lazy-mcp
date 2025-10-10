/**
 * Memory Migration Integration Tests
 *
 * Feature: 004-comprehensive-context-management
 * User Story: US1 (Memory Blocking Fix)
 * Task: T019 - End-to-end migration testing
 *
 * Tests complete workflow from detection through execution to verification
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  detectOldBlockedFiles,
  migrateBlockedFiles,
} from '../../src/core/migration-manager';
import { isMemoryBlocked, listBlockedMemories } from '../../src/core/memory-blocker';
import { loadSettings } from '../../src/core/settings-manager';

describe('Memory Migration Integration', () => {
  let testDir: string;
  let claudeDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `mcp-toggle-migration-int-${Date.now()}`);
    await fs.ensureDir(testDir);
    claudeDir = path.join(testDir, '.claude');
    await fs.ensureDir(claudeDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Complete Migration Workflow', () => {
    it('should detect → migrate → verify legacy files', async () => {
      // Setup: Create legacy .blocked files
      await fs.writeFile(path.join(claudeDir, 'memory1.md.blocked'), 'content1', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'memory2.md.blocked'), 'content2', 'utf-8');
      await fs.ensureDir(path.join(claudeDir, 'subdir'));
      await fs.writeFile(path.join(claudeDir, 'subdir', 'memory3.md.blocked'), 'content3', 'utf-8');

      // Step 1: Detection
      const detected = await detectOldBlockedFiles(testDir);
      expect(detected).toHaveLength(3);
      expect(detected).toContain('memory1.md');
      expect(detected).toContain('memory2.md');
      expect(detected).toContain('subdir/memory3.md');

      // Step 2: Migration
      const result = await migrateBlockedFiles(testDir);
      expect(result.success).toBe(true);
      expect(result.migratedFiles).toHaveLength(3);
      expect(result.failedFiles).toHaveLength(0);

      // Step 3: Verification - .blocked files deleted
      expect(await fs.pathExists(path.join(claudeDir, 'memory1.md.blocked'))).toBe(false);
      expect(await fs.pathExists(path.join(claudeDir, 'memory2.md.blocked'))).toBe(false);
      expect(await fs.pathExists(path.join(claudeDir, 'subdir', 'memory3.md.blocked'))).toBe(false);

      // Step 4: Verification - added to settings.json
      expect(await isMemoryBlocked(testDir, 'memory1.md')).toBe(true);
      expect(await isMemoryBlocked(testDir, 'memory2.md')).toBe(true);
      expect(await isMemoryBlocked(testDir, 'subdir/memory3.md')).toBe(true);

      // Step 5: Verification - settings.json structure
      const settings = await loadSettings(testDir);
      expect(settings.permissions.deny).toHaveLength(3);
      expect(settings.permissions.deny).toContainEqual({
        type: 'memory',
        pattern: 'memory1.md',
      });
      expect(settings.permissions.deny).toContainEqual({
        type: 'memory',
        pattern: 'memory2.md',
      });
      expect(settings.permissions.deny).toContainEqual({
        type: 'memory',
        pattern: 'subdir/memory3.md',
      });
    });

    it('should handle mixed legacy and modern blocked files', async () => {
      // Setup: Mix of .blocked files and settings.json patterns
      await fs.writeFile(path.join(claudeDir, 'legacy.md.blocked'), 'legacy content', 'utf-8');

      const settingsPath = path.join(claudeDir, 'settings.json');
      await fs.writeJson(settingsPath, {
        permissions: {
          deny: [
            { type: 'memory', pattern: 'modern.md' },
          ],
        },
      });

      // Detect only legacy
      const detected = await detectOldBlockedFiles(testDir);
      expect(detected).toHaveLength(1);
      expect(detected).toContain('legacy.md');

      // Migrate
      const result = await migrateBlockedFiles(testDir);
      expect(result.success).toBe(true);
      expect(result.migratedFiles).toContain('legacy.md');

      // Verify both exist
      const blocked = await listBlockedMemories(testDir);
      expect(blocked).toHaveLength(2);
      expect(blocked).toContain('modern.md');
      expect(blocked).toContain('legacy.md');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle corrupted .blocked files gracefully', async () => {
      // Create .blocked file with invalid content
      const blockedPath = path.join(claudeDir, 'invalid.md.blocked');
      await fs.writeFile(blockedPath, '', 'utf-8');

      // Should still detect
      const detected = await detectOldBlockedFiles(testDir);
      expect(detected).toContain('invalid.md');

      // Should still migrate (content doesn't matter)
      const result = await migrateBlockedFiles(testDir);
      expect(result.success).toBe(true);

      // Verify cleanup
      expect(await fs.pathExists(blockedPath)).toBe(false);
      expect(await isMemoryBlocked(testDir, 'invalid.md')).toBe(true);
    });

    it('should handle very long file paths', async () => {
      const longPath = 'a'.repeat(50) + '/' + 'b'.repeat(50) + '/' + 'c'.repeat(50) + '.md';
      const blockedPath = path.join(claudeDir, `${longPath}.blocked`);
      await fs.ensureDir(path.dirname(blockedPath));
      await fs.writeFile(blockedPath, 'content', 'utf-8');

      const detected = await detectOldBlockedFiles(testDir);
      expect(detected).toContain(longPath);

      const result = await migrateBlockedFiles(testDir);
      expect(result.success).toBe(true);
      expect(result.migratedFiles).toContain(longPath);

      expect(await isMemoryBlocked(testDir, longPath)).toBe(true);
    });

    it('should preserve settings.json structure during migration', async () => {
      // Setup: Existing settings with other properties
      const settingsPath = path.join(claudeDir, 'settings.json');
      await fs.writeJson(settingsPath, {
        permissions: {
          deny: [
            { type: 'agent', pattern: 'test-agent.md' },
          ],
        },
        otherSetting: 'value',
        nestedSetting: {
          key: 'data',
        },
      });

      // Add .blocked file
      await fs.writeFile(path.join(claudeDir, 'memory.md.blocked'), 'content', 'utf-8');

      // Migrate
      await migrateBlockedFiles(testDir);

      // Verify structure preserved
      const settings = await loadSettings(testDir);
      expect(settings.otherSetting).toBe('value');
      expect(settings.nestedSetting).toEqual({ key: 'data' });
      expect(settings.permissions.deny).toHaveLength(2);

      // Verify both patterns exist
      expect(settings.permissions.deny).toContainEqual({
        type: 'agent',
        pattern: 'test-agent.md',
      });
      expect(settings.permissions.deny).toContainEqual({
        type: 'memory',
        pattern: 'memory.md',
      });
    });

    it('should handle concurrent migration attempts safely', async () => {
      // Create .blocked files
      await fs.writeFile(path.join(claudeDir, 'file1.md.blocked'), 'content1', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'file2.md.blocked'), 'content2', 'utf-8');

      // Attempt concurrent migrations
      const [result1, result2] = await Promise.all([
        migrateBlockedFiles(testDir),
        migrateBlockedFiles(testDir),
      ]);

      // At least one should succeed fully
      const totalMigrated = result1.migratedFiles.length + result2.migratedFiles.length;
      expect(totalMigrated).toBeGreaterThanOrEqual(2);

      // Both files should be blocked
      expect(await isMemoryBlocked(testDir, 'file1.md')).toBe(true);
      expect(await isMemoryBlocked(testDir, 'file2.md')).toBe(true);

      // No .blocked files should remain
      expect(await fs.pathExists(path.join(claudeDir, 'file1.md.blocked'))).toBe(false);
      expect(await fs.pathExists(path.join(claudeDir, 'file2.md.blocked'))).toBe(false);
    });
  });

  describe('Real-World Migration Scenarios', () => {
    it('should migrate typical v0.3.0 blocked files', async () => {
      // Simulate v0.3.0 usage pattern
      const v030Files = [
        'COMMANDS.md',
        'PROJECT_NOTES.md',
        'memories/troubleshooting.md',
        'memories/decisions.md',
      ];

      for (const file of v030Files) {
        const blockedPath = path.join(claudeDir, `${file}.blocked`);
        await fs.ensureDir(path.dirname(blockedPath));
        await fs.writeFile(blockedPath, `v0.3.0 blocked: ${file}`, 'utf-8');
      }

      // Detect
      const detected = await detectOldBlockedFiles(testDir);
      expect(detected).toHaveLength(4);

      // Migrate
      const result = await migrateBlockedFiles(testDir);
      expect(result.success).toBe(true);
      expect(result.summary).toBe('Successfully migrated 4 memory file(s) to settings.json');

      // Verify all migrated
      for (const file of v030Files) {
        expect(await isMemoryBlocked(testDir, file)).toBe(true);
      }
    });

    it('should provide accurate migration summary', async () => {
      await fs.writeFile(path.join(claudeDir, 'file1.md.blocked'), 'content1', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'file2.md.blocked'), 'content2', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'file3.md.blocked'), 'content3', 'utf-8');

      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toHaveLength(3);
      expect(result.failedFiles).toHaveLength(0);
      expect(result.summary).toBe('Successfully migrated 3 memory file(s) to settings.json');
    });

    it('should handle no legacy files gracefully', async () => {
      // No .blocked files, only normal .md files
      await fs.writeFile(path.join(claudeDir, 'CLAUDE.md'), 'project context', 'utf-8');
      await fs.ensureDir(path.join(claudeDir, 'memories'));
      await fs.writeFile(path.join(claudeDir, 'memories', 'notes.md'), 'notes', 'utf-8');

      const detected = await detectOldBlockedFiles(testDir);
      expect(detected).toHaveLength(0);

      const result = await migrateBlockedFiles(testDir);
      expect(result.success).toBe(true);
      expect(result.summary).toBe('No legacy .blocked files found to migrate');
    });
  });

  describe('Post-Migration State', () => {
    it('should allow unblocking after migration', async () => {
      // Migrate
      await fs.writeFile(path.join(claudeDir, 'memory.md.blocked'), 'content', 'utf-8');
      await migrateBlockedFiles(testDir);

      // Verify blocked
      expect(await isMemoryBlocked(testDir, 'memory.md')).toBe(true);

      // Unblock using new system
      const { unblockMemoryFile } = require('../../src/core/memory-blocker');
      await unblockMemoryFile(testDir, 'memory.md');

      // Verify unblocked
      expect(await isMemoryBlocked(testDir, 'memory.md')).toBe(false);
    });

    it('should allow re-blocking after migration', async () => {
      // Migrate
      await fs.writeFile(path.join(claudeDir, 'memory.md.blocked'), 'content', 'utf-8');
      await migrateBlockedFiles(testDir);

      // Unblock
      const { unblockMemoryFile, blockMemoryFile } = require('../../src/core/memory-blocker');
      await unblockMemoryFile(testDir, 'memory.md');
      expect(await isMemoryBlocked(testDir, 'memory.md')).toBe(false);

      // Re-block
      await blockMemoryFile(testDir, 'memory.md');
      expect(await isMemoryBlocked(testDir, 'memory.md')).toBe(true);
    });
  });
});

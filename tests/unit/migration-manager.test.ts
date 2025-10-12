/**
 * Migration Manager Tests
 *
 * Tests for memory file migration from legacy .blocked files to settings.json permissions.deny
 * Feature: 004-comprehensive-context-management
 * User Stories: US1 (Memory Blocking Fix)
 * Tasks: T013 (detectOldBlockedFiles), T014 (migrateBlockedFiles)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  detectOldBlockedFiles,
  migrateBlockedFiles,
} from '../../src/core/migration-manager';
import { isMemoryBlocked } from '../../src/core/memory-blocker';

describe('Migration Manager - Memory File Migration', () => {
  describe('detectOldBlockedFiles (T013)', () => {
    let testDir: string;
    let claudeDir: string;

    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), `mcp-toggle-mem-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.ensureDir(testDir);
      claudeDir = path.join(testDir, '.claude');
      await fs.ensureDir(claudeDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should return empty array when no .blocked files exist', async () => {
      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toEqual([]);
    });

    it('should detect single .blocked file', async () => {
      await fs.writeFile(path.join(claudeDir, 'memory.md.blocked'), 'blocked content', 'utf-8');
      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toHaveLength(1);
      expect(blockedFiles).toContain('memory.md');
    });

    it('should detect multiple .blocked files', async () => {
      await fs.writeFile(path.join(claudeDir, 'memory1.md.blocked'), 'content1', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'memory2.md.blocked'), 'content2', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'memory3.md.blocked'), 'content3', 'utf-8');

      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toHaveLength(3);
      expect(blockedFiles).toContain('memory1.md');
      expect(blockedFiles).toContain('memory2.md');
      expect(blockedFiles).toContain('memory3.md');
    });

    it('should detect .blocked files in subdirectories', async () => {
      const subDir = path.join(claudeDir, 'memories');
      await fs.ensureDir(subDir);
      await fs.writeFile(path.join(subDir, 'project.md.blocked'), 'content', 'utf-8');

      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toHaveLength(1);
      expect(blockedFiles).toContain('memories/project.md');
    });

    it('should ignore non-.blocked files', async () => {
      await fs.writeFile(path.join(claudeDir, 'memory.md'), 'active content', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'memory.md.blocked'), 'blocked content', 'utf-8');

      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toHaveLength(1);
      expect(blockedFiles).toContain('memory.md');
    });

    it('should return empty array when .claude directory does not exist', async () => {
      await fs.remove(claudeDir);
      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toEqual([]);
    });

    it('should handle .blocked files with complex paths', async () => {
      const deepDir = path.join(claudeDir, 'categories', 'security');
      await fs.ensureDir(deepDir);
      await fs.writeFile(path.join(deepDir, 'audit.md.blocked'), 'content', 'utf-8');

      const blockedFiles = await detectOldBlockedFiles(testDir);
      expect(blockedFiles).toHaveLength(1);
      expect(blockedFiles).toContain('categories/security/audit.md');
    });
  });

  describe('migrateBlockedFiles (T014)', () => {
    let testDir: string;
    let claudeDir: string;

    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), `mcp-toggle-mig-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.ensureDir(testDir);
      claudeDir = path.join(testDir, '.claude');
      await fs.ensureDir(claudeDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should return success with empty arrays when no .blocked files exist', async () => {
      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toEqual([]);
      expect(result.failedFiles).toEqual([]);
      expect(result.summary).toBe('No legacy .blocked files found to migrate');
    });

    it('should migrate single .blocked file to settings.json', async () => {
      const blockedFile = path.join(claudeDir, 'memory.md.blocked');
      await fs.writeFile(blockedFile, 'blocked content', 'utf-8');

      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toHaveLength(1);
      expect(result.migratedFiles).toContain('memory.md');
      expect(result.failedFiles).toHaveLength(0);
      expect(result.summary).toBe('Successfully migrated 1 memory file(s) to settings.json');

      // Verify .blocked file deleted
      const blockedExists = await fs.pathExists(blockedFile);
      expect(blockedExists).toBe(false);

      // Verify added to settings.json
      const isBlocked = await isMemoryBlocked(testDir, 'memory.md');
      expect(isBlocked).toBe(true);
    });

    it('should migrate multiple .blocked files', async () => {
      await fs.writeFile(path.join(claudeDir, 'memory1.md.blocked'), 'content1', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'memory2.md.blocked'), 'content2', 'utf-8');
      await fs.writeFile(path.join(claudeDir, 'memory3.md.blocked'), 'content3', 'utf-8');

      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toHaveLength(3);
      expect(result.migratedFiles).toContain('memory1.md');
      expect(result.migratedFiles).toContain('memory2.md');
      expect(result.migratedFiles).toContain('memory3.md');
      expect(result.failedFiles).toHaveLength(0);
      expect(result.summary).toBe('Successfully migrated 3 memory file(s) to settings.json');

      // Verify all .blocked files deleted
      expect(await fs.pathExists(path.join(claudeDir, 'memory1.md.blocked'))).toBe(false);
      expect(await fs.pathExists(path.join(claudeDir, 'memory2.md.blocked'))).toBe(false);
      expect(await fs.pathExists(path.join(claudeDir, 'memory3.md.blocked'))).toBe(false);

      // Verify all added to settings.json
      expect(await isMemoryBlocked(testDir, 'memory1.md')).toBe(true);
      expect(await isMemoryBlocked(testDir, 'memory2.md')).toBe(true);
      expect(await isMemoryBlocked(testDir, 'memory3.md')).toBe(true);
    });

    it('should migrate .blocked files in subdirectories', async () => {
      const subDir = path.join(claudeDir, 'memories');
      await fs.ensureDir(subDir);
      const blockedFile = path.join(subDir, 'project.md.blocked');
      await fs.writeFile(blockedFile, 'content', 'utf-8');

      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toHaveLength(1);
      expect(result.migratedFiles).toContain('memories/project.md');
      expect(result.failedFiles).toHaveLength(0);

      // Verify .blocked file deleted
      expect(await fs.pathExists(blockedFile)).toBe(false);

      // Verify added to settings.json
      expect(await isMemoryBlocked(testDir, 'memories/project.md')).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      await fs.writeFile(path.join(claudeDir, 'good.md.blocked'), 'good content', 'utf-8');

      // Create a .blocked file in a read-only directory to force failure
      const readOnlyDir = path.join(claudeDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      const badFile = path.join(readOnlyDir, 'bad.md.blocked');
      await fs.writeFile(badFile, 'bad content', 'utf-8');
      await fs.chmod(readOnlyDir, 0o444); // Read-only

      const result = await migrateBlockedFiles(testDir);

      // Should have 1 success and 1 failure
      expect(result.success).toBe(false);
      expect(result.migratedFiles).toHaveLength(1);
      expect(result.migratedFiles).toContain('good.md');
      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0].file).toBe('readonly/bad.md');
      expect(result.summary).toBe('Migrated 1/2 memory file(s). 1 failed.');

      // Cleanup: restore permissions
      await fs.chmod(readOnlyDir, 0o755);
    });

    it('should be idempotent - safe to run multiple times', async () => {
      await fs.writeFile(path.join(claudeDir, 'memory.md.blocked'), 'content', 'utf-8');

      // First migration
      const result1 = await migrateBlockedFiles(testDir);
      expect(result1.success).toBe(true);
      expect(result1.migratedFiles).toHaveLength(1);

      // Second migration (no .blocked files should exist)
      const result2 = await migrateBlockedFiles(testDir);
      expect(result2.success).toBe(true);
      expect(result2.migratedFiles).toHaveLength(0);
      expect(result2.summary).toBe('No legacy .blocked files found to migrate');

      // Verify still blocked
      expect(await isMemoryBlocked(testDir, 'memory.md')).toBe(true);
    });

    it('should preserve existing deny patterns when migrating', async () => {
      // Pre-existing deny pattern
      const settingsPath = path.join(claudeDir, 'settings.json');
      await fs.writeJson(settingsPath, {
        permissions: {
          deny: [
            { type: 'memory', pattern: 'existing.md' },
          ],
        },
      });

      // Add .blocked file
      await fs.writeFile(path.join(claudeDir, 'new.md.blocked'), 'content', 'utf-8');

      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toContain('new.md');

      // Verify both patterns exist
      expect(await isMemoryBlocked(testDir, 'existing.md')).toBe(true);
      expect(await isMemoryBlocked(testDir, 'new.md')).toBe(true);
    });

    it('should handle .blocked files with special characters in names', async () => {
      const specialFile = 'memory-with-dashes_and_underscores.md.blocked';
      await fs.writeFile(path.join(claudeDir, specialFile), 'content', 'utf-8');

      const result = await migrateBlockedFiles(testDir);

      expect(result.success).toBe(true);
      expect(result.migratedFiles).toHaveLength(1);
      expect(result.migratedFiles).toContain('memory-with-dashes_and_underscores.md');

      // Verify migration successful
      expect(await fs.pathExists(path.join(claudeDir, specialFile))).toBe(false);
      expect(await isMemoryBlocked(testDir, 'memory-with-dashes_and_underscores.md')).toBe(true);
    });
  });
});

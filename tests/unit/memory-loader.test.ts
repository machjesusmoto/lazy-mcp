import { loadMemoryFiles } from '../../src/core/memory-loader';
import { createTempDir, cleanupTempDir, createMockMemoryFiles } from '../helpers/test-utils';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('memory-loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('loadMemoryFiles', () => {
    it('should enumerate .md files in .claude/memories/', async () => {
      await createMockMemoryFiles(tempDir, {
        'test1.md': '# Test 1\n\nContent here.',
        'test2.md': '# Test 2\n\nMore content.',
      });

      const files = await loadMemoryFiles(tempDir);

      expect(files).toHaveLength(2);
      expect(files.map((f) => f.name).sort()).toEqual(['test1.md', 'test2.md']);
    });

    it('should enumerate files recursively in subdirectories', async () => {
      await createMockMemoryFiles(tempDir, {
        'root.md': 'Root file',
        'subdir/nested.md': 'Nested file',
        'subdir/deep/deeper.md': 'Deep file',
      });

      const files = await loadMemoryFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files.find((f) => f.relativePath === 'root.md')).toBeDefined();
      expect(files.find((f) => f.relativePath === 'subdir/nested.md')).toBeDefined();
      expect(files.find((f) => f.relativePath === 'subdir/deep/deeper.md')).toBeDefined();
    });

    it('should handle symlinks correctly', async () => {
      const targetPath = path.join(tempDir, 'target.md');
      await fs.writeFile(targetPath, '# Target file', 'utf-8');

      const memoriesDir = path.join(tempDir, '.claude', 'memories');
      await fs.ensureDir(memoriesDir);

      const linkPath = path.join(memoriesDir, 'link.md');
      await fs.symlink(targetPath, linkPath);

      const files = await loadMemoryFiles(tempDir);

      const linkedFile = files.find((f) => f.name === 'link.md');
      expect(linkedFile).toBeDefined();
      expect(linkedFile?.isSymlink).toBe(true);
      expect(linkedFile?.symlinkTarget).toBeTruthy();
    });

    it('should load from 2 fixed scopes (project + user)', async () => {
      // Memory loader uses 2 fixed scopes, not directory hierarchy walk
      // Scope 1: Project directory (hierarchyLevel 0)
      // Scope 2: User home directory (hierarchyLevel 1)

      await createMockMemoryFiles(tempDir, {
        'project.md': 'Project memory',
      });

      const files = await loadMemoryFiles(tempDir);

      // Should have at least 1 project memory (may have user memories too)
      const projectMemories = files.filter((f) => f.hierarchyLevel === 0);
      expect(projectMemories.length).toBeGreaterThanOrEqual(1);
      expect(projectMemories.find((f) => f.name === 'project.md')).toBeDefined();
    });

    it('should get content preview (first 200 chars)', async () => {
      const longContent = '# Title\n\n' + 'A'.repeat(300);
      await createMockMemoryFiles(tempDir, {
        'long.md': longContent,
      });

      const files = await loadMemoryFiles(tempDir);

      expect(files[0].contentPreview).toBeDefined();
      expect(files[0].contentPreview!.length).toBeLessThanOrEqual(200);
    });

    it('should handle missing .claude/memories/ directory', async () => {
      // No memories directory created
      const files = await loadMemoryFiles(tempDir);

      expect(files).toEqual([]);
    });

    it('should set isBlocked to false by default', async () => {
      await createMockMemoryFiles(tempDir, {
        'test.md': 'Test content',
      });

      const files = await loadMemoryFiles(tempDir);

      expect(files[0].isBlocked).toBe(false);
      expect(files[0].blockedAt).toBeUndefined();
    });

    it('should get file size correctly', async () => {
      await createMockMemoryFiles(tempDir, {
        'sized.md': 'Content with specific size',
      });

      const files = await loadMemoryFiles(tempDir);

      expect(files[0].size).toBeGreaterThan(0);
    });

    it('should only include .md files', async () => {
      const memoriesDir = path.join(tempDir, '.claude', 'memories');
      await fs.ensureDir(memoriesDir);
      await fs.writeFile(path.join(memoriesDir, 'valid.md'), 'Valid', 'utf-8');
      await fs.writeFile(path.join(memoriesDir, 'invalid.txt'), 'Invalid', 'utf-8');
      await fs.writeFile(path.join(memoriesDir, 'no-extension'), 'No ext', 'utf-8');

      const files = await loadMemoryFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('valid.md');
    });
  });
});

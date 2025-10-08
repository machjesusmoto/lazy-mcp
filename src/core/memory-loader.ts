/**
 * Memory file loader for .claude/memories/ directories.
 * Recursively scans for .md files in the hierarchy.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import glob from 'fast-glob';
import { MemoryFile } from '../models';
import { walkHierarchy, getHierarchyLevel } from '../utils/path-utils';

/**
 * Load all memory files from .claude/memories/ directories in the hierarchy.
 * @param startDir - Starting directory (absolute path)
 * @returns Array of memory files with hierarchy metadata
 */
export async function loadMemoryFiles(startDir: string): Promise<MemoryFile[]> {
  // Validate input
  if (!startDir || typeof startDir !== 'string') {
    throw new Error('startDir must be a non-empty string');
  }
  if (!path.isAbsolute(startDir)) {
    throw new Error('startDir must be an absolute path');
  }

  const files: MemoryFile[] = [];

  for (const dir of walkHierarchy(startDir)) {
    const memoriesDir = path.join(dir, '.claude', 'memories');

    if (!(await fs.pathExists(memoriesDir))) {
      continue;
    }

    const hierarchyLevel = getHierarchyLevel(startDir, dir);

    // Find all .md files recursively
    // Note: followSymbolicLinks should be true to find symlinked .md files
    // but not traverse into symlinked directories (handled by onlyFiles: true)
    const mdFiles = await glob('**/*.md', {
      cwd: memoriesDir,
      absolute: false,
      onlyFiles: true,
      followSymbolicLinks: true,
    });

    for (const relativePath of mdFiles) {
      const absolutePath = path.join(memoriesDir, relativePath);
      const stats = await fs.lstat(absolutePath);

      const memoryFile: MemoryFile = {
        name: path.basename(relativePath),
        path: absolutePath,
        relativePath,
        sourcePath: path.join(dir, '.claude'),
        sourceType: hierarchyLevel === 0 ? 'local' : 'inherited',
        hierarchyLevel,
        size: stats.size,
        isBlocked: false,
        isSymlink: stats.isSymbolicLink(),
      };

      // Get symlink target if it's a symlink
      if (memoryFile.isSymlink) {
        try {
          memoryFile.symlinkTarget = await fs.readlink(absolutePath);
        } catch {
          // Ignore errors reading symlink target
        }
      }

      // Get content preview (first 200 characters)
      try {
        const content = await fs.readFile(absolutePath, 'utf-8');
        memoryFile.contentPreview = content.substring(0, 200);
      } catch {
        // Ignore errors reading content
      }

      files.push(memoryFile);
    }
  }

  return files;
}

/**
 * Memory file loader using Claude Code's 2-scope hierarchy.
 *
 * IMPORTANT: This loader specifically handles Claude Code memory files, NOT Serena memories.
 *
 * Directory Structure:
 * - Claude Code memories: .claude/memories/*.md
 * - Serena memories: .serena/memories/*.md (NOT loaded by this tool)
 *
 * Scopes:
 * 1. Project (local): <project>/.claude/memories/
 * 2. User (global): ~/.claude/memories/
 *
 * Note: There is no "shared" scope for memory files - they are either
 * project-specific or user-global.
 *
 * Serena Memory System:
 * - Serena uses its own memory system in .serena/memories/
 * - Serena memories are managed via the Serena MCP server tools (write_memory, read_memory, etc.)
 * - This loader does NOT scan or load Serena memories
 * - Serena memories contain architectural knowledge managed by the Serena agent
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import glob from 'fast-glob';
import { MemoryFile } from '../models';
import { estimateMarkdownTokens } from '../utils/token-estimator';

/**
 * Load all memory files from the 2-scope hierarchy.
 * @param projectDir - Project directory (absolute path)
 * @returns Array of memory files with scope metadata
 */
export async function loadMemoryFiles(projectDir: string): Promise<MemoryFile[]> {
  // Validate input
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!path.isAbsolute(projectDir)) {
    throw new Error('projectDir must be an absolute path');
  }

  const files: MemoryFile[] = [];
  const homeDir = os.homedir();

  // Helper function to load memory files from a directory
  async function loadFromDirectory(
    baseDir: string,
    sourceType: 'local' | 'inherited',
    hierarchyLevel: number
  ): Promise<void> {
    const memoriesDir = path.join(baseDir, '.claude', 'memories');

    if (!(await fs.pathExists(memoriesDir))) {
      return;
    }

    // Find all .md and .md.blocked files recursively (v2.0.0 blocking mechanism)
    const mdFiles = await glob('**/*.{md,md.blocked}', {
      cwd: memoriesDir,
      absolute: false,
      onlyFiles: true,
      followSymbolicLinks: true,
    });

    for (const relativePath of mdFiles) {
      const absolutePath = path.join(memoriesDir, relativePath);
      const stats = await fs.lstat(absolutePath);

      // Check if this is a blocked file (v2.0.0: .md.blocked extension)
      const isBlocked = relativePath.endsWith('.md.blocked');

      const memoryFile: MemoryFile = {
        name: path.basename(relativePath),
        path: absolutePath,
        relativePath,
        sourcePath: path.join(baseDir, '.claude'),
        sourceType,
        hierarchyLevel,
        size: stats.size,
        isBlocked,
        isSymlink: stats.isSymbolicLink(),
      };

      // Set blockedAt timestamp for blocked files
      if (isBlocked) {
        memoryFile.blockedAt = stats.mtime;
      }

      // Get symlink target if it's a symlink
      if (memoryFile.isSymlink) {
        try {
          memoryFile.symlinkTarget = await fs.readlink(absolutePath);
        } catch {
          // Ignore errors reading symlink target
        }
      }

      // Get content preview (first 200 characters) and estimate tokens
      try {
        const content = await fs.readFile(absolutePath, 'utf-8');
        memoryFile.contentPreview = content.substring(0, 200);
        memoryFile.estimatedTokens = estimateMarkdownTokens(content);
      } catch {
        // Ignore errors reading content
      }

      files.push(memoryFile);
    }
  }

  // Scope 1: Project (local) - <project>/.claude/memories/
  await loadFromDirectory(projectDir, 'local', 0);

  // Scope 2: User (global) - ~/.claude/memories/
  await loadFromDirectory(homeDir, 'inherited', 1);

  return files;
}

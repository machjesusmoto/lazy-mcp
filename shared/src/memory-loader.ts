/**
 * @mcp-toggle/shared - Memory File Loader
 * Version: 2.0.0
 *
 * Scans and loads memory files from .claude/memories/
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import glob from 'fast-glob';
import { MemoryFile } from './types';

/**
 * Loads memory files from the .claude/memories/ directory
 */
export class MemoryLoader {
  private memoriesPath: string;

  /**
   * Create a new MemoryLoader
   *
   * @param claudeDir Optional path to .claude directory (defaults to ~/.claude)
   */
  constructor(claudeDir?: string) {
    const homeDir = os.homedir();
    this.memoriesPath = path.join(claudeDir || path.join(homeDir, '.claude'), 'memories');
  }

  /**
   * Scan for all memory files in .claude/memories/
   *
   * Recursively searches for .md files in the memories directory and
   * collects metadata including file size and modification time.
   *
   * Token estimation uses a heuristic of ~4 characters per token,
   * which is a reasonable approximation for English text.
   *
   * @returns Promise resolving to array of memory file metadata
   */
  async loadMemoryFiles(): Promise<MemoryFile[]> {
    try {
      if (!await fs.pathExists(this.memoriesPath)) {
        return [];
      }

      const files = await glob('**/*.md', {
        cwd: this.memoriesPath,
        absolute: false
      });

      const memories: MemoryFile[] = [];

      for (const file of files) {
        const fullPath = path.join(this.memoriesPath, file);

        try {
          const stats = await fs.stat(fullPath);

          memories.push({
            path: fullPath,
            name: file,
            size: stats.size,
            lastModified: stats.mtime,
            enabled: true, // Will be updated based on blocking rules
            estimatedTokens: this.estimateMemoryTokens(stats.size)
          });
        } catch (fileError) {
          // Skip files that can't be read (permissions, etc.)
          console.warn(`Skipping inaccessible memory file: ${file}`);
          continue;
        }
      }

      return memories;
    } catch (error) {
      console.error('Error loading memory files:', error);
      return [];
    }
  }

  /**
   * Estimate tokens for a memory file based on size
   *
   * Uses a heuristic of approximately 4 characters per token.
   * This is a reasonable estimate for English text with markdown formatting.
   *
   * The actual token count will vary based on:
   * - Language (non-English text may have different ratios)
   * - Content type (code vs prose)
   * - Formatting (markdown, whitespace, etc.)
   *
   * @param sizeInBytes File size in bytes
   * @returns Estimated token count
   */
  private estimateMemoryTokens(sizeInBytes: number): number {
    const charsPerToken = 4;
    return Math.ceil(sizeInBytes / charsPerToken);
  }

  /**
   * Get the memories directory path
   *
   * @returns Path to memories directory
   */
  getMemoriesPath(): string {
    return this.memoriesPath;
  }

  /**
   * Check if a memory file exists
   *
   * @param filename Name of the memory file to check
   * @returns Promise resolving to true if file exists
   */
  async memoryExists(filename: string): Promise<boolean> {
    const fullPath = path.join(this.memoriesPath, filename);
    return fs.pathExists(fullPath);
  }

  /**
   * Get the full path for a memory file
   *
   * @param filename Name of the memory file
   * @returns Full path to the memory file
   */
  getMemoryPath(filename: string): string {
    return path.join(this.memoriesPath, filename);
  }
}

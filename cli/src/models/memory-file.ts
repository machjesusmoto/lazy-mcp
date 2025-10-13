/**
 * Represents a Claude Code memory file (.md file in .claude/memories/).
 */
export interface MemoryFile {
  /** File name (e.g., "project-context.md") */
  name: string;

  /** Absolute path to the memory file */
  path: string;

  /** Path relative to .claude/memories/ directory */
  relativePath: string;

  /** Absolute path to .claude directory containing this file */
  sourcePath: string;

  /** Whether from current directory or parent */
  sourceType: 'local' | 'inherited';

  /** Directory levels from current (0 = current, 1 = parent, etc.) */
  hierarchyLevel: number;

  /** File size in bytes */
  size: number;

  /** First 200 characters of file content */
  contentPreview?: string;

  /** Whether the file is a symlink */
  isSymlink: boolean;

  /** Target path if isSymlink = true */
  symlinkTarget?: string;

  /** Current blocked state from blocked.md */
  isBlocked: boolean;

  /** Timestamp when blocked (if isBlocked = true) */
  blockedAt?: Date;

  /** Estimated token count for this memory file's content */
  estimatedTokens?: number;
}

/**
 * Validates a MemoryFile object.
 * @throws Error if validation fails
 */
export function validateMemoryFile(file: MemoryFile): void {
  if (!file.name || !file.name.endsWith('.md')) {
    throw new Error('MemoryFile.name must end with .md');
  }
  if (!file.path || !file.path.startsWith('/')) {
    throw new Error('MemoryFile.path must be absolute path');
  }
  if (!file.sourcePath || !file.sourcePath.startsWith('/')) {
    throw new Error('MemoryFile.sourcePath must be absolute path');
  }
  if (file.relativePath && file.relativePath.startsWith('/')) {
    throw new Error('MemoryFile.relativePath must be relative (no leading slash)');
  }
  if (file.hierarchyLevel < 0) {
    throw new Error('MemoryFile.hierarchyLevel must be >= 0');
  }
  if (file.isSymlink && !file.symlinkTarget) {
    throw new Error('MemoryFile.symlinkTarget must be set when isSymlink = true');
  }
  if (file.isBlocked && !file.blockedAt) {
    throw new Error('MemoryFile.blockedAt should be set when isBlocked = true');
  }
}

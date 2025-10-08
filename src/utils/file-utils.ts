import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Atomically writes content to a file using temp file + rename pattern.
 * Creates parent directories if needed.
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.ensureDir(dir);

  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
    await fs.chmod(filePath, 0o644);
  } catch (error) {
    // Clean up temp file if rename failed
    await fs.remove(tempPath).catch(() => {
      /* ignore */
    });
    throw error;
  }
}

/**
 * Reads a file and returns its content as a string.
 * Returns null if file doesn't exist or is not readable.
 */
export async function safeRead(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Checks if a file or directory exists and is readable.
 */
export async function isReadable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a directory exists and is writable.
 */
export async function isWritable(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a directory exists, creating it if necessary with specified permissions.
 */
export async function ensureDir(dirPath: string, mode = 0o755): Promise<void> {
  await fs.ensureDir(dirPath);
  await fs.chmod(dirPath, mode);
}

/**
 * Gets file stats (size, modified time, etc.).
 * Returns null if file doesn't exist.
 */
export async function getFileStats(
  filePath: string
): Promise<{ size: number; mtime: Date; isSymlink: boolean } | null> {
  try {
    const lstat = await fs.lstat(filePath);
    return {
      size: lstat.size,
      mtime: lstat.mtime,
      isSymlink: lstat.isSymbolicLink(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Reads symlink target if file is a symlink.
 * Returns null if file is not a symlink or doesn't exist.
 */
export async function readSymlink(filePath: string): Promise<string | null> {
  try {
    const lstat = await fs.lstat(filePath);
    if (!lstat.isSymbolicLink()) {
      return null;
    }
    return await fs.readlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Simple file-based locking mechanism for concurrent access control
 * Feature: 003-add-migrate-to
 *
 * Provides exclusive access to critical sections during concurrent operations.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

const LOCK_TIMEOUT_MS = 5000; // 5 seconds
const RETRY_DELAY_MS = 10; // 10ms between retries

/**
 * Acquire a lock on a file
 * @param filePath - Path to the file to lock
 * @returns Lock file path
 */
async function acquireLock(filePath: string): Promise<string> {
  const lockPath = `${filePath}.lock`;
  const startTime = Date.now();

  // Ensure parent directory exists
  await fs.ensureDir(path.dirname(lockPath));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // Try to create lock file exclusively
      await fs.writeFile(lockPath, process.pid.toString(), { flag: 'wx' });
      return lockPath;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'EEXIST') {
        throw error;
      }

      // Lock file exists - check if it's stale
      if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
        // Force remove stale lock
        try {
          await fs.remove(lockPath);
          continue;
        } catch {
          // Ignore errors removing stale lock
        }
      }

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Release a lock on a file
 * @param lockPath - Path to the lock file
 */
async function releaseLock(lockPath: string): Promise<void> {
  try {
    await fs.remove(lockPath);
  } catch {
    // Ignore errors releasing lock
  }
}

/**
 * Execute a function with exclusive file access
 * @param filePath - Path to the file to lock
 * @param fn - Function to execute while holding the lock
 */
export async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = await acquireLock(filePath);

  try {
    return await fn();
  } finally {
    await releaseLock(lockPath);
  }
}

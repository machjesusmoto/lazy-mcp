/**
 * Memory file blocking via settings.json
 * Feature: 003-add-migrate-to
 * Task: T006
 *
 * Manages memory file blocking by adding/removing deny patterns in settings.json.
 * Leverages settings-manager functions for atomic operations.
 */

import { addDenyPattern, removeDenyPattern, isDenied, loadSettings } from './settings-manager';

/**
 * Block memory file by adding deny pattern
 *
 * @param projectDir - Project directory path
 * @param memoryPath - Relative path to memory file (e.g., "memory.md" or "category/memory.md")
 */
export async function blockMemoryFile(projectDir: string, memoryPath: string): Promise<void> {
  await addDenyPattern(projectDir, 'memory', memoryPath);
}

/**
 * Unblock memory file by removing deny pattern
 *
 * @param projectDir - Project directory path
 * @param memoryPath - Relative path to memory file
 */
export async function unblockMemoryFile(projectDir: string, memoryPath: string): Promise<void> {
  await removeDenyPattern(projectDir, 'memory', memoryPath);
}

/**
 * Check if memory file is blocked
 *
 * @param projectDir - Project directory path
 * @param memoryPath - Relative path to memory file
 * @returns True if memory file is blocked
 */
export async function isMemoryBlocked(projectDir: string, memoryPath: string): Promise<boolean> {
  return await isDenied(projectDir, 'memory', memoryPath);
}

/**
 * List all blocked memory files
 *
 * @param projectDir - Project directory path
 * @returns Array of blocked memory file patterns
 */
export async function listBlockedMemories(projectDir: string): Promise<string[]> {
  try {
    const settings = await loadSettings(projectDir);

    // Filter for memory type deny patterns
    return settings.permissions.deny
      .filter((d) => d.type === 'memory')
      .map((d) => d.pattern);
  } catch {
    // Settings don't exist or can't be loaded
    return [];
  }
}

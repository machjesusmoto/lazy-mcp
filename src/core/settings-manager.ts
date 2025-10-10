/**
 * Settings manager for .claude/settings.json
 * Feature: 003-add-migrate-to
 * Task: T002
 *
 * Manages settings.json using atomic write pattern for safe updates.
 * Includes file locking for concurrent access protection.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import type { SettingsJson, DenyPattern } from '../models/settings-types';
import { atomicWrite, safeRead } from '../utils/file-utils';
import { withFileLock } from '../utils/file-lock';

/**
 * Get path to settings.json for a project directory
 */
function getSettingsPath(projectDir: string): string {
  return path.join(projectDir, '.claude', 'settings.json');
}

/**
 * Create default settings structure
 */
function createDefaultSettings(): SettingsJson {
  return {
    permissions: {
      deny: [],
    },
  };
}

/**
 * Load settings from .claude/settings.json (internal, no locking)
 * Creates file with defaults if it doesn't exist.
 *
 * @param projectDir - Project directory path
 * @returns Parsed settings object
 */
async function loadSettingsInternal(projectDir: string): Promise<SettingsJson> {
  const settingsPath = getSettingsPath(projectDir);

  // Try to read existing file
  const content = await safeRead(settingsPath);

  if (content === null) {
    // File doesn't exist - create with defaults
    const defaults = createDefaultSettings();
    await atomicWrite(settingsPath, JSON.stringify(defaults, null, 2));
    return defaults;
  }

  // Parse existing content
  try {
    const parsed = JSON.parse(content);

    // Ensure permissions structure exists
    if (!parsed.permissions) {
      parsed.permissions = { deny: [] };
    }

    // Ensure deny array exists
    if (!Array.isArray(parsed.permissions.deny)) {
      parsed.permissions.deny = [];
    }

    return parsed as SettingsJson;
  } catch (error) {
    // Invalid JSON - throw error
    throw new Error(`Failed to parse settings.json: ${(error as Error).message}`);
  }
}

/**
 * Load settings from .claude/settings.json
 * Creates file with defaults if it doesn't exist.
 *
 * @param projectDir - Project directory path
 * @returns Parsed settings object
 */
export async function loadSettings(projectDir: string): Promise<SettingsJson> {
  const settingsPath = getSettingsPath(projectDir);
  return withFileLock(settingsPath, () => loadSettingsInternal(projectDir));
}

/**
 * Update settings.json with partial updates
 * Uses atomic write pattern for safe updates with file locking.
 *
 * @param projectDir - Project directory path
 * @param updates - Partial settings to merge
 */
export async function updateSettings(
  projectDir: string,
  updates: Partial<SettingsJson>
): Promise<void> {
  const settingsPath = getSettingsPath(projectDir);

  await withFileLock(settingsPath, async () => {
    // Load current settings
    const current = await loadSettingsInternal(projectDir);

    // Merge updates with current settings
    const merged: SettingsJson = {
      ...current,
      ...updates,
      permissions: {
        ...current.permissions,
        ...(updates.permissions || {}),
      },
    };

    // Write atomically
    await atomicWrite(settingsPath, JSON.stringify(merged, null, 2));
  });
}

/**
 * Add deny pattern to settings
 * Prevents duplicates by checking existing patterns.
 *
 * @param projectDir - Project directory path
 * @param type - Type of resource ('agent' or 'memory')
 * @param pattern - Pattern to deny
 */
export async function addDenyPattern(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<void> {
  const settingsPath = getSettingsPath(projectDir);

  await withFileLock(settingsPath, async () => {
    const settings = await loadSettingsInternal(projectDir);

    // Check if pattern already exists
    const exists = settings.permissions.deny.some(
      (d) => d.type === type && d.pattern === pattern
    );

    if (!exists) {
      // Add new pattern
      const newDenyPattern: DenyPattern = { type, pattern };
      settings.permissions.deny.push(newDenyPattern);

      // Write atomically
      await atomicWrite(settingsPath, JSON.stringify(settings, null, 2));
    }
  });
}

/**
 * Remove deny pattern from settings
 * Only removes patterns that match both type and pattern.
 *
 * @param projectDir - Project directory path
 * @param type - Type of resource ('agent' or 'memory')
 * @param pattern - Pattern to remove
 */
export async function removeDenyPattern(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<void> {
  const settingsPath = getSettingsPath(projectDir);

  await withFileLock(settingsPath, async () => {
    const settings = await loadSettingsInternal(projectDir);

    // Filter out matching pattern
    settings.permissions.deny = settings.permissions.deny.filter(
      (d) => !(d.type === type && d.pattern === pattern)
    );

    // Write atomically
    await atomicWrite(settingsPath, JSON.stringify(settings, null, 2));
  });
}

/**
 * Check if a resource is denied
 *
 * @param projectDir - Project directory path
 * @param type - Type of resource ('agent' or 'memory')
 * @param pattern - Pattern to check
 * @returns True if pattern is denied
 */
export async function isDenied(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<boolean> {
  try {
    const settings = await loadSettings(projectDir);
    return settings.permissions.deny.some(
      (d) => d.type === type && d.pattern === pattern
    );
  } catch {
    // If settings don't exist or can't be loaded, nothing is denied
    return false;
  }
}

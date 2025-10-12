/**
 * React hook for memory file migration state management
 *
 * Feature: 003-add-migrate-to
 * Tasks: T015-T018
 * Purpose: Manage memory file migration workflow in TUI
 */

import { useState, useCallback, useEffect } from 'react';
import {
  detectOldBlockedFiles,
  migrateBlockedFiles,
} from '../../core/migration-manager';
import type { MemoryMigrationResult } from '../../models/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Memory migration workflow state
 *
 * State Flow:
 * idle → checking → prompt → migrating → complete
 *                         ↘ skipped
 */
export type MemoryMigrationState =
  | 'idle'        // No migration check performed
  | 'checking'    // Detecting .blocked files
  | 'prompt'      // User prompted to migrate
  | 'migrating'   // Performing migration
  | 'complete'    // Migration succeeded
  | 'skipped'     // User skipped migration
  | 'error';      // Migration failed

/**
 * Migration preference file location
 */
const getPreferenceFilePath = (): string => {
  return path.join(os.homedir(), '.mcp-toggle-memory-migration');
};

/**
 * Load migration preference from file
 */
const loadPreference = async (): Promise<boolean> => {
  try {
    const prefPath = getPreferenceFilePath();
    if (await fs.pathExists(prefPath)) {
      const content = await fs.readFile(prefPath, 'utf-8');
      return content.trim() === 'never';
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Save migration preference to file
 */
const savePreference = async (neverAsk: boolean): Promise<void> => {
  try {
    const prefPath = getPreferenceFilePath();
    if (neverAsk) {
      await fs.writeFile(prefPath, 'never', 'utf-8');
    } else {
      await fs.remove(prefPath);
    }
  } catch {
    // Ignore errors
  }
};

export interface UseMemoryMigrationResult {
  // State
  state: MemoryMigrationState;
  filesToMigrate: string[];
  result: MemoryMigrationResult | null;
  error: Error | null;
  isProcessing: boolean;
  neverAskAgain: boolean;

  // Actions
  checkForMigration: (projectDir: string) => Promise<void>;
  confirmMigration: (projectDir: string) => Promise<void>;
  skipMigration: (permanent?: boolean) => void;
  resetMigration: () => void;

  // Computed properties
  hasMigration: boolean;
  canMigrate: boolean;
}

/**
 * Custom hook for managing memory file migration workflow
 *
 * Provides state management and actions for migrating legacy .md.blocked files
 * to settings.json deny patterns.
 *
 * @returns UseMemoryMigrationResult with state and actions
 */
export function useMemoryMigration(): UseMemoryMigrationResult {
  const [state, setState] = useState<MemoryMigrationState>('idle');
  const [filesToMigrate, setFilesToMigrate] = useState<string[]>([]);
  const [result, setResult] = useState<MemoryMigrationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [neverAskAgain, setNeverAskAgain] = useState(false);

  // Load preference from file on mount
  useEffect(() => {
    const loadPref = async () => {
      const never = await loadPreference();
      setNeverAskAgain(never);
    };
    loadPref();
  }, []);

  /**
   * Check for legacy .blocked files
   *
   * Scans project directory for .md.blocked files and sets state accordingly
   */
  const checkForMigration = useCallback(async (projectDir: string) => {
    // Skip check if user selected "never ask again"
    if (neverAskAgain) {
      setState('idle');
      return;
    }

    try {
      setState('checking');
      setIsProcessing(true);
      setError(null);

      const files = await detectOldBlockedFiles(projectDir);

      if (files.length > 0) {
        setFilesToMigrate(files);
        setState('prompt');
      } else {
        setState('idle');
      }

      setIsProcessing(false);
    } catch (err) {
      setError(err as Error);
      setState('error');
      setIsProcessing(false);
    }
  }, [neverAskAgain]);

  /**
   * Execute migration
   *
   * Migrates all detected .blocked files to settings.json deny patterns
   */
  const confirmMigration = useCallback(async (projectDir: string) => {
    if (state !== 'prompt') {
      throw new Error('Cannot migrate: not in prompt state');
    }

    try {
      setState('migrating');
      setIsProcessing(true);
      setError(null);

      const migrationResult = await migrateBlockedFiles(projectDir);
      setResult(migrationResult);

      if (migrationResult.success) {
        setState('complete');
      } else {
        setState('error');
        setError(new Error(migrationResult.summary));
      }

      setIsProcessing(false);
    } catch (err) {
      setError(err as Error);
      setState('error');
      setIsProcessing(false);
    }
  }, [state]);

  /**
   * Skip migration
   *
   * User chooses not to migrate (optionally permanently)
   */
  const skipMigration = useCallback((permanent: boolean = false) => {
    if (permanent) {
      savePreference(true);
      setNeverAskAgain(true);
    }

    setState('skipped');
    setFilesToMigrate([]);
    setResult(null);
    setError(null);
  }, []);

  /**
   * Reset migration state
   *
   * Used to clear state after viewing results
   */
  const resetMigration = useCallback(() => {
    setState('idle');
    setFilesToMigrate([]);
    setResult(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  // Computed properties
  const hasMigration = filesToMigrate.length > 0;
  const canMigrate = state === 'prompt' && !isProcessing;

  return {
    // State
    state,
    filesToMigrate,
    result,
    error,
    isProcessing,
    neverAskAgain,

    // Actions
    checkForMigration,
    confirmMigration,
    skipMigration,
    resetMigration,

    // Computed properties
    hasMigration,
    canMigrate,
  };
}

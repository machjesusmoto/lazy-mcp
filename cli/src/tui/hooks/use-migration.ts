/**
 * React hook for migration state management
 *
 * Feature: 003-add-migrate-to
 * Purpose: Manage migration workflow state in TUI
 */

import { useState, useCallback } from 'react';
import {
  initiateMigration,
  executeMigration,
  validateResolutions,
} from '../../core/migration-manager';
import type {
  MigrationOperation,
  MigrationState,
  ConflictResolution,
} from '../../models/types';
import type { MCPServer } from '../../models';

export interface UseMigrationResult {
  // State
  operation: MigrationOperation | null;
  isProcessing: boolean;
  error: Error | null;

  // Actions
  initializeMigration: (serverNames: string[], projectDir: string) => Promise<void>;
  startValidation: () => Promise<void>;
  startMigration: (projectDir: string, selectedServers: MCPServer[]) => Promise<void>;
  updateResolution: (serverName: string, resolution: ConflictResolution) => void;
  proceedToReady: () => boolean;
  confirmMigration: () => Promise<void>;
  cancelMigration: () => void;
  resetMigration: () => void;

  // Computed properties
  hasConflicts: boolean;
  canProceed: boolean;
  migrationState: MigrationState;
}

/**
 * Custom hook for managing migration workflow
 *
 * Provides state management and actions for the migration process
 *
 * @returns UseMigrationResult with state and actions
 */
export function useMigration(): UseMigrationResult {
  const [operation, setOperation] = useState<MigrationOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize migration with idle state (initial prompt)
   */
  const initializeMigration = useCallback(async (serverNames: string[], projectDir: string) => {
    const initialOperation: MigrationOperation = {
      id: `migration-${Date.now()}`,
      projectDir,
      state: 'idle',
      selectedServers: serverNames,
      conflicts: [],
      createdAt: new Date(),
    };
    setOperation(initialOperation);
  }, []);

  /**
   * Start validation (transition from idle to validating/conflict_resolution/ready)
   */
  const startValidation = useCallback(async () => {
    if (!operation || operation.state !== 'idle') return;

    try {
      setIsProcessing(true);
      setError(null);

      // Transition to validating state
      setOperation({ ...operation, state: 'validating' });

      // For now, we'll need the actual MCPServer objects to call initiateMigration
      // This is a simplified version - we'd need to pass projectDir and rebuild servers
      // For the prototype, we'll move directly to ready state with no conflicts
      // TODO: Implement proper validation with conflict detection

      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setOperation({
        ...operation,
        state: 'ready',
        conflicts: [], // No conflicts for now
      });
      setIsProcessing(false);
    } catch (err) {
      setError(err as Error);
      setIsProcessing(false);
    }
  }, [operation]);

  /**
   * Start migration process
   *
   * Creates MigrationOperation and detects conflicts
   */
  const startMigration = useCallback(async (projectDir: string, selectedServers: MCPServer[]) => {
    try {
      setIsProcessing(true);
      setError(null);

      const newOperation = await initiateMigration(projectDir, selectedServers);
      setOperation(newOperation);
      setIsProcessing(false);
    } catch (err) {
      setError(err as Error);
      setIsProcessing(false);
    }
  }, []);

  /**
   * Update conflict resolution for a specific server
   * Stays in conflict_resolution state - user must press Enter to proceed
   */
  const updateResolution = useCallback((serverName: string, resolution: ConflictResolution) => {
    if (!operation) return;

    const updatedConflicts = operation.conflicts.map((conflict) =>
      conflict.serverName === serverName ? resolution : conflict
    );

    setOperation({
      ...operation,
      conflicts: updatedConflicts,
      // Stay in conflict_resolution state - don't auto-transition
      state: 'conflict_resolution',
    });
  }, [operation]);

  /**
   * Proceed to ready state if all conflicts are resolved
   * Called when user presses Enter in conflict_resolution state
   */
  const proceedToReady = useCallback(() => {
    if (!operation || operation.state !== 'conflict_resolution') return false;

    const isValid = validateResolutions(operation.conflicts);
    if (isValid) {
      setOperation({
        ...operation,
        state: 'ready',
      });
      return true;
    }
    return false;
  }, [operation]);

  /**
   * Execute migration with current resolutions
   */
  const confirmMigration = useCallback(async () => {
    if (!operation || operation.state !== 'ready') {
      throw new Error('Cannot execute migration: operation not ready');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const result = await executeMigration(operation);
      setOperation(result);
      setIsProcessing(false);
    } catch (err) {
      setError(err as Error);
      setIsProcessing(false);
    }
  }, [operation]);

  /**
   * Cancel migration and reset state
   */
  const cancelMigration = useCallback(() => {
    setOperation(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  /**
   * Reset migration state (for starting new migration)
   */
  const resetMigration = useCallback(() => {
    setOperation(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  // Computed properties
  const hasConflicts = operation ? operation.conflicts.length > 0 : false;
  const canProceed = operation ? operation.state === 'ready' : false;
  const migrationState: MigrationState = operation ? operation.state : 'idle';

  return {
    // State
    operation,
    isProcessing,
    error,

    // Actions
    initializeMigration,
    startValidation,
    startMigration,
    updateResolution,
    proceedToReady,
    confirmMigration,
    cancelMigration,
    resetMigration,

    // Computed properties
    hasConflicts,
    canProceed,
    migrationState,
  };
}

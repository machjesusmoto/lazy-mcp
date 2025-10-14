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
  initializeMigration: (serverNames: string[], projectLocalPath: string) => Promise<void>;
  startValidation: () => Promise<void>;
  startMigration: (projectDir: string, selectedServers: MCPServer[]) => Promise<void>;
  updateResolution: (serverName: string, resolution: ConflictResolution) => void;
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
  const initializeMigration = useCallback(async (serverNames: string[], projectLocalPath: string) => {
    const initialOperation: MigrationOperation = {
      state: 'idle',
      selectedServers: serverNames,
      conflicts: [],
      timestamp: Date.now(),
      projectLocalPath,
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
   */
  const updateResolution = useCallback((serverName: string, resolution: ConflictResolution) => {
    if (!operation) return;

    const updatedConflicts = operation.conflicts.map((conflict) =>
      conflict.serverName === serverName ? resolution : conflict
    );

    // Validate all resolutions
    const isValid = validateResolutions(updatedConflicts);

    setOperation({
      ...operation,
      conflicts: updatedConflicts,
      state: isValid ? 'ready' : 'conflict_resolution',
    });
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
    confirmMigration,
    cancelMigration,
    resetMigration,

    // Computed properties
    hasConflicts,
    canProceed,
    migrationState,
  };
}

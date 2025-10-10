/**
 * React hook for agent state management
 *
 * Feature: 004-comprehensive-context-management
 * Tasks: T028
 * Purpose: Manage agent list navigation and blocking state
 */

import { useState, useCallback } from 'react';
import { blockAgent, unblockAgent } from '../../core/agent-manager';
import type { SubAgent } from '../../models/types';

export interface UseAgentsResult {
  // State
  selectedIndex: number;
  isProcessing: boolean;
  error: Error | null;
  expandedIndexes: Set<number>;

  // Actions
  selectNext: () => void;
  selectPrevious: () => void;
  toggleBlocked: (projectDir: string, agents: SubAgent[]) => Promise<void>;
  toggleExpanded: () => void;
  setSelectedIndex: (index: number) => void;
  resetSelection: () => void;

  // Computed properties
  hasSelection: boolean;
  canToggle: boolean;
}

/**
 * Custom hook for managing agent list interactions
 *
 * Provides state management and actions for:
 * - Agent selection and navigation (up/down arrows)
 * - Block/unblock toggling (space key)
 * - Error handling during block operations
 *
 * @returns UseAgentsResult with state and actions
 */
export function useAgents(agentCount: number = 0): UseAgentsResult {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());

  /**
   * Select next agent (down arrow)
   *
   * Wraps around to first agent when reaching the end
   */
  const selectNext = useCallback(() => {
    if (agentCount === 0) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((current) => {
      if (current === -1) return 0;
      return (current + 1) % agentCount;
    });
  }, [agentCount]);

  /**
   * Select previous agent (up arrow)
   *
   * Wraps around to last agent when reaching the start
   */
  const selectPrevious = useCallback(() => {
    if (agentCount === 0) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((current) => {
      if (current === -1) return agentCount - 1;
      if (current === 0) return agentCount - 1;
      return current - 1;
    });
  }, [agentCount]);

  /**
   * Toggle blocked status of selected agent (space key)
   *
   * Calls blockAgent or unblockAgent based on current status,
   * then context should be reloaded by parent component
   */
  const toggleBlocked = useCallback(
    async (projectDir: string, agents: SubAgent[]) => {
      if (selectedIndex < 0 || selectedIndex >= agents.length) {
        return;
      }

      const agent = agents[selectedIndex];
      if (!agent) {
        return;
      }

      try {
        setIsProcessing(true);
        setError(null);

        if (agent.isBlocked) {
          await unblockAgent(projectDir, agent.name);
        } else {
          await blockAgent(projectDir, agent.name);
        }

        setIsProcessing(false);
        // Parent component should reload context after this completes
      } catch (err) {
        setError(err as Error);
        setIsProcessing(false);
      }
    },
    [selectedIndex]
  );

  /**
   * Toggle expanded state for selected agent
   *
   * Adds or removes the selected index from the expanded set
   */
  const toggleExpanded = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= agentCount) {
      return;
    }

    setExpandedIndexes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(selectedIndex)) {
        newSet.delete(selectedIndex);
      } else {
        newSet.add(selectedIndex);
      }
      return newSet;
    });
  }, [selectedIndex, agentCount]);

  /**
   * Reset selection to none (-1)
   *
   * Called when switching panels or exiting focus
   */
  const resetSelection = useCallback(() => {
    setSelectedIndex(-1);
    setError(null);
  }, []);

  // Computed properties
  const hasSelection = selectedIndex >= 0 && selectedIndex < agentCount;
  const canToggle = hasSelection && !isProcessing;

  return {
    // State
    selectedIndex,
    isProcessing,
    error,
    expandedIndexes,

    // Actions
    selectNext,
    selectPrevious,
    toggleBlocked,
    toggleExpanded,
    setSelectedIndex,
    resetSelection,

    // Computed properties
    hasSelection,
    canToggle,
  };
}

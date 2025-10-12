import React from 'react';
import { Box, Text } from 'ink';
import type { SubAgent } from '../../models/types';
import { formatTokenCount } from '../../utils/token-estimator';

export interface AgentListProps {
  /**
   * Array of agents to display
   */
  agents: SubAgent[];

  /**
   * Currently selected agent index (-1 if none selected)
   */
  selectedIndex?: number;

  /**
   * Whether this list is currently focused for keyboard input
   */
  isFocused?: boolean;

  /**
   * Set of indexes that are expanded (for multi-line descriptions)
   */
  expandedIndexes?: Set<number>;
}

/**
 * Displays a list of Claude Code subagents with their metadata.
 *
 * Task: T027
 *
 * Shows:
 * - Agent name
 * - Description
 * - Source type (project/user/override)
 * - Blocked status
 * - Optional: model, tools
 * - Selection indicator when focused
 */
export const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedIndex = -1,
  isFocused = false,
  expandedIndexes = new Set(),
}) => {
  if (agents.length === 0) {
    return (
      <Box paddingLeft={2} paddingY={1}>
        <Text dimColor>No agents found</Text>
      </Box>
    );
  }

  const selectedAgent = selectedIndex >= 0 && selectedIndex < agents.length
    ? agents[selectedIndex]
    : null;

  // Get source badge
  const getSourceBadge = (agent: SubAgent): string => {
    if (agent.source === 'project') return 'P';
    if (agent.isOverride) return 'O';
    return 'U';
  };

  // Get source label for display
  const getSourceLabel = (agent: SubAgent): string => {
    if (agent.source === 'project') return 'project';
    if (agent.isOverride) return 'override';
    return 'user';
  };

  // Truncate description with visual indicator
  const getDisplayDescription = (description: string, index: number, maxLen: number = 100): string => {
    const isExpanded = expandedIndexes.has(index);

    if (isExpanded) {
      return description; // Show full description
    }

    if (description.length > maxLen) {
      return description.substring(0, maxLen) + '...';
    }

    return description;
  };

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1} paddingY={1}>
        <Text bold>Subagents ({agents.length})</Text>
      </Box>

      {agents.map((agent, index) => {
        const isSelected = isFocused && index === selectedIndex;
        const prefix = isSelected ? '> ' : '  ';
        const sourceBadge = getSourceBadge(agent);
        const displayDescription = getDisplayDescription(agent.description, index);
        const isExpandable = agent.description.length > 100;
        const isExpanded = expandedIndexes.has(index);

        return (
          <Box key={agent.name} paddingLeft={1}>
            <Text>
              {prefix}
              {agent.isBlocked ? (
                <Text color="red">✗ </Text>
              ) : (
                <Text color="green">✓ </Text>
              )}
              <Text dimColor>[{sourceBadge}] </Text>
              <Text bold={isSelected}>{agent.name.padEnd(20)}</Text>
              {' '}
              <Text dimColor>{displayDescription}</Text>
              {isExpandable && !isExpanded && (
                <Text color="cyan"> [→/e to expand]</Text>
              )}
              {isExpanded && (
                <Text color="cyan"> [←/c to collapse]</Text>
              )}
              {agent.estimatedTokens && agent.estimatedTokens > 0 && (
                <>
                  {' '}
                  <Text color="cyan">{formatTokenCount(agent.estimatedTokens)} tokens</Text>
                </>
              )}
            </Text>
          </Box>
        );
      })}

      {/* Agent details panel when focused and selected */}
      {isFocused && selectedAgent && (
        <Box
          paddingLeft={2}
          paddingTop={1}
          paddingRight={2}
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
        >
          <Text dimColor>Agent Details:</Text>
          <Text>
            <Text bold>Name:</Text> {selectedAgent.name}
          </Text>
          <Text>
            <Text bold>Description:</Text> {selectedAgent.description}
          </Text>
          <Text>
            <Text bold>Source:</Text> {getSourceLabel(selectedAgent)}
          </Text>
          <Text>
            <Text bold>File:</Text> {selectedAgent.filePath}
          </Text>
          {selectedAgent.model && (
            <Text>
              <Text bold>Model:</Text> {selectedAgent.model}
            </Text>
          )}
          {selectedAgent.tools && selectedAgent.tools.length > 0 && (
            <Text>
              <Text bold>Tools:</Text> {selectedAgent.tools.join(', ')}
            </Text>
          )}
          <Text>
            <Text bold>Status:</Text>{' '}
            {selectedAgent.isBlocked ? (
              <Text color="red">Blocked</Text>
            ) : (
              <Text color="green">Active</Text>
            )}
          </Text>
        </Box>
      )}
    </Box>
  );
};

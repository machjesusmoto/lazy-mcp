import React from 'react';
import { Box, Text } from 'ink';
import type { ContextStats } from '../../models/project-context';

/**
 * Context Summary Component (US3 - T036)
 *
 * Displays unified overview of all context sources:
 * - MCP servers (active/blocked counts)
 * - Memory files (loaded/blocked counts)
 * - Subagents (available/project/user counts)
 * - Estimated context size
 *
 * Feature: 004-comprehensive-context-management
 * Task: T036
 */
export interface ContextSummaryProps {
  /** Calculated context statistics */
  stats: ContextStats;
  /** Whether this component is focused/highlighted */
  isFocused?: boolean;
}

export const ContextSummary: React.FC<ContextSummaryProps> = ({ stats, isFocused = false }) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isFocused ? 'cyan' : 'gray'} paddingX={1}>
      <Text bold color={isFocused ? 'cyan' : 'white'}>
        📊 Context Summary
      </Text>
      <Text>
        <Text color="green">MCP Servers:</Text> {stats.mcpServers.active} active
        {stats.mcpServers.blocked > 0 && (
          <Text color="red"> • {stats.mcpServers.blocked} blocked</Text>
        )}
      </Text>
      <Text>
        <Text color="green">Memory Files:</Text> {stats.memoryFiles.loaded} loaded
        {stats.memoryFiles.blocked > 0 && (
          <Text color="red"> • {stats.memoryFiles.blocked} blocked</Text>
        )}
      </Text>
      <Text>
        <Text color="green">Subagents:</Text> {stats.agents.available} available{' '}
        <Text color="gray">
          ({stats.agents.project} project, {stats.agents.user} user)
        </Text>
      </Text>
      <Text>
        <Text color="green">Est. Context:</Text> <Text color="cyan">{stats.estimatedSize}</Text>
      </Text>
    </Box>
  );
};

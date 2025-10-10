import React from 'react';
import { Box, Text } from 'ink';
import type { MCPServer } from '../../models';
import { formatTokenCount } from '../../utils/token-estimator';

export interface ServerListProps {
  /**
   * Array of MCP servers to display
   */
  servers: MCPServer[];

  /**
   * Currently selected server index (-1 if none selected)
   */
  selectedIndex?: number;

  /**
   * Whether this list is currently focused for keyboard input
   */
  isFocused?: boolean;
}

/**
 * Displays a list of MCP servers with their status and source information.
 * Shows:
 * - Server name
 * - Command/executable
 * - Source path (which .claude.json)
 * - Blocked status
 * - Selection indicator when focused
 */
export const ServerList: React.FC<ServerListProps> = ({
  servers,
  selectedIndex = -1,
  isFocused = false,
}) => {
  if (servers.length === 0) {
    return (
      <Box paddingLeft={2} paddingY={1}>
        <Text dimColor>No MCP servers found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1} paddingY={1}>
        <Text bold>MCP Servers ({servers.length})</Text>
      </Box>

      {servers.map((server, index) => {
        const isSelected = isFocused && index === selectedIndex;
        const prefix = isSelected ? '> ' : '  ';

        return (
          <Box key={`${server.name}-${server.sourcePath}`} paddingLeft={1}>
            <Text>
              {prefix}
              {server.isBlocked ? (
                <Text color="red">✗ </Text>
              ) : (
                <Text color="green">✓ </Text>
              )}
              <Text bold={isSelected}>{server.name}</Text>
              {' '}
              <Text dimColor>({server.command})</Text>
              {' '}
              <Text dimColor italic>
                [{server.hierarchyLevel === 0 ? 'private' : server.hierarchyLevel === 1 ? 'project' : 'global'}]
              </Text>
              {server.estimatedTokens && server.estimatedTokens > 0 && (
                <>
                  {' '}
                  <Text color="cyan">{formatTokenCount(server.estimatedTokens)} tokens</Text>
                </>
              )}
            </Text>
          </Box>
        );
      })}

      {isFocused && servers.length > 0 && (
        <Box paddingLeft={2}>
          <Text dimColor>
            ↑/↓: Navigate • Space: Toggle • Enter: Save • Q: Quit
          </Text>
        </Box>
      )}
    </Box>
  );
};

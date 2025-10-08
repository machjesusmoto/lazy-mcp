import React from 'react';
import { Box, Text } from 'ink';
import type { ProjectContextStats } from '../../models';

export interface StatusBarProps {
  /**
   * Project context statistics to display
   */
  stats: ProjectContextStats;

  /**
   * Project directory path
   */
  projectPath: string;

  /**
   * Whether changes have been made but not saved
   */
  hasUnsavedChanges?: boolean;

  /**
   * Whether write permission is available
   */
  hasWritePermission?: boolean;
}

/**
 * Displays summary statistics and status information.
 * Shows:
 * - Total servers and memory files
 * - Currently blocked count
 * - Project directory
 * - Unsaved changes indicator
 * - Write permission status
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  projectPath,
  hasUnsavedChanges = false,
  hasWritePermission = true,
}) => {
  const activeServers = stats.totalMcpServers - stats.blockedMcpServers;
  const activeMemory = stats.totalMemoryFiles - stats.blockedMemoryFiles;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Box>
          <Text bold>MCP Toggle</Text>
          <Text dimColor> - {projectPath}</Text>
        </Box>
        <Box>
          {hasUnsavedChanges && (
            <Text color="yellow" bold>
              * UNSAVED CHANGES *
            </Text>
          )}
          {!hasWritePermission && (
            <Text color="red" bold>
              ! NO WRITE PERMISSION !
            </Text>
          )}
        </Box>
      </Box>

      <Box justifyContent="space-between">
        <Box>
          <Box>
            <Text>
              Servers:{' '}
              <Text color="green">{activeServers}</Text>
              <Text dimColor> active</Text>
              {stats.blockedMcpServers > 0 && (
                <>
                  <Text dimColor> / </Text>
                  <Text color="red">{stats.blockedMcpServers}</Text>
                  <Text dimColor> blocked</Text>
                </>
              )}
              <Text dimColor> / {stats.totalMcpServers} total</Text>
            </Text>
          </Box>

          <Box>
            <Text>
              Memory:{' '}
              <Text color="green">{activeMemory}</Text>
              <Text dimColor> active</Text>
              {stats.blockedMemoryFiles > 0 && (
                <>
                  <Text dimColor> / </Text>
                  <Text color="red">{stats.blockedMemoryFiles}</Text>
                  <Text dimColor> blocked</Text>
                </>
              )}
              <Text dimColor> / {stats.totalMemoryFiles} total</Text>
            </Text>
          </Box>
        </Box>

        <Box>
          <Text dimColor>Tab: Switch Panel • Space: Toggle • Enter: Save • Q: Quit</Text>
        </Box>
      </Box>
    </Box>
  );
};

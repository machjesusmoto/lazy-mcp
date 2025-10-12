/**
 * Memory Migration Prompt Component
 *
 * Feature: 003-add-migrate-to
 * Tasks: T015, T017
 * Purpose: Initial prompt for migrating legacy .md.blocked files
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface MemoryMigrationPromptProps {
  /** List of files to be migrated */
  filesToMigrate: string[];

  /** Whether migration is currently in progress */
  isProcessing: boolean;

  /** Callback when user confirms migration */
  onConfirm: () => void;

  /** Callback when user skips migration (this time) */
  onSkip: () => void;

  /** Callback when user chooses "never ask again" */
  onNeverAsk: () => void;
}

/**
 * Memory migration prompt component
 *
 * Displays a confirmation dialog asking user if they want to migrate
 * legacy .md.blocked files to the new settings.json format.
 *
 * Shows:
 * - Number of files to migrate
 * - What will happen (add to settings.json, delete .blocked files)
 * - Three options: Migrate Now, Skip This Time, Never Ask Again
 */
export const MemoryMigrationPrompt: React.FC<MemoryMigrationPromptProps> = ({
  filesToMigrate,
  isProcessing,
  onConfirm: _onConfirm,
  onSkip: _onSkip,
  onNeverAsk: _onNeverAsk,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      padding={1}
      width="80%"
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ⚠️  Legacy Blocked Files Detected
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          Found {filesToMigrate.length} legacy .blocked file{filesToMigrate.length !== 1 ? 's' : ''} in .claude/ directory.
        </Text>
        <Box marginTop={1}>
          <Text dimColor>
            These files use the old blocking format and should be migrated
            to the new settings.json format.
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1} marginLeft={2}>
        <Text bold>What will happen:</Text>
        <Box marginTop={0} marginLeft={1}>
          <Text>• Add deny patterns to .claude/settings.json</Text>
        </Box>
        <Box marginLeft={1}>
          <Text>• Delete .blocked files</Text>
        </Box>
        <Box marginLeft={1}>
          <Text>• Memory files will remain blocked</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Files to migrate:</Text>
        {filesToMigrate.slice(0, 5).map((file, index) => (
          <Box key={index} marginLeft={1}>
            <Text dimColor>• {file}</Text>
          </Box>
        ))}
        {filesToMigrate.length > 5 && (
          <Box marginLeft={1}>
            <Text dimColor>... and {filesToMigrate.length - 5} more</Text>
          </Box>
        )}
      </Box>

      {isProcessing ? (
        <Box marginTop={1}>
          <Text color="cyan">⏳ Processing migration...</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold>Choose an option:</Text>
          </Box>
          <Box marginLeft={1}>
            <Text color="green">Y - Migrate Now</Text>
          </Box>
          <Box marginLeft={1}>
            <Text color="yellow">S - Skip This Time</Text>
          </Box>
          <Box marginLeft={1}>
            <Text color="red">N - Never Ask Again</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press Y, S, or N to continue...</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

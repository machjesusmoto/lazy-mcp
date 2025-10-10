/**
 * Memory Migration Status Component
 *
 * Feature: 003-add-migrate-to
 * Tasks: T016
 * Purpose: Display migration progress and results
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { MemoryMigrationResult } from '../../models/types';
import type { MemoryMigrationState } from '../hooks/use-memory-migration';

export interface MemoryMigrationStatusProps {
  /** Current migration state */
  state: MemoryMigrationState;

  /** Migration result (populated on completion or error) */
  result: MemoryMigrationResult | null;

  /** Error details if migration failed */
  error: Error | null;

  /** Callback to close the status panel */
  onClose: () => void;
}

/**
 * Memory migration status component
 *
 * Displays migration progress and results based on current state.
 *
 * Shows:
 * - Progress indicator during migration
 * - Success summary with migrated file count
 * - Failure details with error messages
 * - Option to close and continue
 */
export const MemoryMigrationStatus: React.FC<MemoryMigrationStatusProps> = ({
  state,
  result,
  error,
  onClose,
}) => {
  // Migrating state
  if (state === 'migrating') {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        width="80%"
      >
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Migrating Memory Files...
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text>⏳ Adding deny patterns to settings.json</Text>
          <Text>⏳ Deleting .blocked files</Text>
          <Text>⏳ Verifying migration</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Please wait...</Text>
        </Box>
      </Box>
    );
  }

  // Complete state
  if (state === 'complete' && result) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="green"
        padding={1}
        width="80%"
      >
        <Box marginBottom={1}>
          <Text bold color="green">
            ✓ Migration Complete
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>{result.summary}</Text>
        </Box>

        {result.migratedFiles.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Migrated files:</Text>
            {result.migratedFiles.slice(0, 5).map((file, index) => (
              <Box key={index} marginLeft={1}>
                <Text color="green">✓ {file}</Text>
              </Box>
            ))}
            {result.migratedFiles.length > 5 && (
              <Box marginLeft={1}>
                <Text dimColor>... and {result.migratedFiles.length - 5} more</Text>
              </Box>
            )}
          </Box>
        )}

        {result.failedFiles.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="red">
              Failed files:
            </Text>
            {result.failedFiles.slice(0, 3).map((failure, index) => (
              <Box key={index} marginLeft={1} flexDirection="column">
                <Text color="red">✗ {failure.file}</Text>
                <Text dimColor>  {failure.error}</Text>
              </Box>
            ))}
            {result.failedFiles.length > 3 && (
              <Box marginLeft={1}>
                <Text dimColor>... and {result.failedFiles.length - 3} more</Text>
              </Box>
            )}
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="red"
        padding={1}
        width="80%"
      >
        <Box marginBottom={1}>
          <Text bold color="red">
            ✗ Migration Failed
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="red">
            {error?.message || result?.summary || 'Unknown error occurred'}
          </Text>
        </Box>

        {result?.failedFiles && result.failedFiles.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Failed files:</Text>
            {result.failedFiles.map((failure, index) => (
              <Box key={index} marginLeft={1} flexDirection="column">
                <Text color="red">✗ {failure.file}</Text>
                <Text dimColor>  {failure.error}</Text>
              </Box>
            ))}
          </Box>
        )}

        {result?.migratedFiles && result.migratedFiles.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow">
              ⚠️  {result.migratedFiles.length} file(s) were migrated before failure
            </Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  // Skipped state
  if (state === 'skipped') {
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
            Migration Skipped
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>
            Legacy .blocked files remain in place. You can migrate them later
            by running this tool again.
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  // Default: shouldn't reach here
  return null;
};

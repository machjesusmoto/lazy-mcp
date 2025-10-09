/**
 * Migration Menu Component
 *
 * Feature: 003-add-migrate-to
 * Purpose: UI for server migration workflow
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { MigrationOperation, ConflictResolution } from '../../models/types';

export interface MigrationMenuProps {
  operation: MigrationOperation;
  selectedConflictIndex?: number;
  onClose: () => void;
}

/**
 * Migration menu component
 *
 * Displays migration workflow UI based on operation state
 */
export const MigrationMenu: React.FC<MigrationMenuProps> = ({
  operation,
  selectedConflictIndex = 0,
  onClose,
}) => {
  const { state, selectedServers, conflicts, result } = operation;

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
          Migrate to Global
        </Text>
      </Box>

      {state === 'validating' && (
        <Box flexDirection="column">
          <Text>Validating migration...</Text>
        </Box>
      )}

      {state === 'conflict_resolution' && (
        <Box flexDirection="column">
          <Text color="yellow">⚠️  Conflicts Detected</Text>
          <Box marginY={1}>
            <Text dimColor>
              The following servers already exist in global config:
            </Text>
          </Box>

          {conflicts.map((conflict, index) => (
            <Box key={conflict.serverName} marginLeft={2} marginY={0}>
              <Text color={index === selectedConflictIndex ? 'cyan' : 'white'}>
                {index === selectedConflictIndex ? '▶ ' : '  '}
                {conflict.serverName}
              </Text>
              <Text dimColor> - </Text>
              <Text color="yellow">{conflict.resolution}</Text>
            </Box>
          ))}

          <Box marginTop={1}>
            <Text dimColor>
              Navigate: ↑/↓ | Change resolution: s(kip) / o(verwrite) / r(ename) | Continue: Enter
            </Text>
          </Box>
        </Box>
      )}

      {state === 'ready' && (
        <Box flexDirection="column">
          <Text color="green">✓ Ready to migrate</Text>
          <Box marginY={1}>
            <Text>
              Will migrate {selectedServers.length} server(s) to global config
            </Text>
          </Box>

          {conflicts.length > 0 && (
            <Box flexDirection="column" marginY={1}>
              <Text dimColor>Resolutions:</Text>
              {conflicts.map((conflict) => (
                <Box key={conflict.serverName} marginLeft={2}>
                  <Text>
                    {conflict.serverName}: {conflict.resolution}
                    {conflict.resolution === 'rename' && conflict.newName && ` → ${conflict.newName}`}
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          <Box marginTop={1}>
            <Text dimColor>Press Enter to confirm | Esc to cancel</Text>
          </Box>
        </Box>
      )}

      {state === 'executing' && (
        <Box flexDirection="column">
          <Text>Executing migration...</Text>
          <Box marginTop={1}>
            <Text dimColor>
              Creating backups, writing configs, verifying...
            </Text>
          </Box>
        </Box>
      )}

      {state === 'complete' && result && (
        <Box flexDirection="column">
          <Text color="green">✓ Migration complete!</Text>
          <Box marginY={1}>
            <Text>
              Migrated: {result.migratedCount} | Skipped: {result.skippedCount}
            </Text>
          </Box>
          <Text dimColor>Duration: {result.duration}ms</Text>
          <Box marginTop={1}>
            <Text dimColor>Press any key to close</Text>
          </Box>
        </Box>
      )}

      {state === 'error' && operation.error && (
        <Box flexDirection="column">
          <Text color="red">✗ Migration failed</Text>
          <Box marginY={1} flexDirection="column">
            <Text color="red">{operation.error.message}</Text>
            {result?.errors && result.errors.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                {result.errors.map((err, index) => (
                  <Text key={index} dimColor>
                    • {err.serverName} ({err.phase}): {err.message}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
          {result?.backupsRetained && (
            <Box marginY={1}>
              <Text color="yellow">
                ⚠️  Backups retained for manual recovery
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>Press any key to close</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

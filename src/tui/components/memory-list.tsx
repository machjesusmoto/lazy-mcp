import React from 'react';
import { Box, Text } from 'ink';
import type { MemoryFile } from '../../models';

export interface MemoryListProps {
  /**
   * Array of memory files to display
   */
  files: MemoryFile[];

  /**
   * Currently selected file index (-1 if none selected)
   */
  selectedIndex?: number;

  /**
   * Whether this list is currently focused for keyboard input
   */
  isFocused?: boolean;
}

/**
 * Displays a list of Claude Code memory files with their status and source information.
 * Shows:
 * - File name (or relative path for nested files)
 * - File size
 * - Source type (local/inherited)
 * - Blocked status
 * - Content preview on selection
 * - Selection indicator when focused
 */
export const MemoryList: React.FC<MemoryListProps> = ({
  files,
  selectedIndex = -1,
  isFocused = false,
}) => {
  if (files.length === 0) {
    return (
      <Box paddingLeft={2} paddingY={1}>
        <Text dimColor>No memory files found</Text>
      </Box>
    );
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const selectedFile = selectedIndex >= 0 && selectedIndex < files.length
    ? files[selectedIndex]
    : null;

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1} paddingY={1}>
        <Text bold>Memory Files ({files.length})</Text>
      </Box>

      {files.map((file, index) => {
        const isSelected = isFocused && index === selectedIndex;
        const prefix = isSelected ? '> ' : '  ';
        const displayPath = file.relativePath || file.name;

        return (
          <Box key={file.path} paddingLeft={1}>
            <Text>
              {prefix}
              {file.isBlocked ? (
                <Text color="red">✗ </Text>
              ) : (
                <Text color="green">✓ </Text>
              )}
              <Text bold={isSelected}>{displayPath}</Text>
              {' '}
              <Text dimColor>({formatSize(file.size)})</Text>
              {' '}
              {file.isSymlink && <Text dimColor>→ symlink </Text>}
              <Text dimColor italic>
                [{file.sourceType === 'local' ? 'local' : 'inherited'}]
              </Text>
            </Text>
          </Box>
        );
      })}

      {isFocused && selectedFile && selectedFile.contentPreview && (
        <Box
          paddingLeft={2}
          paddingTop={1}
          paddingRight={2}
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
        >
          <Text dimColor>Content Preview:</Text>
          <Text>{selectedFile.contentPreview}</Text>
        </Box>
      )}

      {isFocused && files.length > 0 && (
        <Box paddingLeft={2}>
          <Text dimColor>
            ↑/↓: Navigate • Space: Toggle • Enter: Save • Q: Quit
          </Text>
        </Box>
      )}
    </Box>
  );
};

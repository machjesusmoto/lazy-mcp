import React from 'react';
import { Box, Text } from 'ink';
import type { UnifiedItem } from '../../models/unified-item';
import type { ProjectContextStats } from '../../models/project-context';
import { formatTokenCount } from '../../utils/token-estimator';

export interface DetailsPaneProps {
  /** Currently selected item to show details for */
  selectedItem: UnifiedItem | null;

  /** Project context statistics */
  stats: ProjectContextStats;

  /** Project directory path */
  projectPath: string;

  /** Whether changes have been made */
  hasUnsavedChanges: boolean;

  /** Whether this pane has focus */
  isFocused: boolean;

  /** Available height for the pane */
  height: number;

  /** Available width for the pane */
  width: number;

  /** Scroll offset for details content */
  scrollOffset: number;
}

/**
 * Details pane for right side.
 * Top: Fixed header with stats and navigation
 * Bottom: Scrollable details for selected item
 */
export const DetailsPane: React.FC<DetailsPaneProps> = ({
  selectedItem,
  stats,
  projectPath,
  hasUnsavedChanges,
  isFocused,
  height,
  width,
  scrollOffset,
}) => {
  const activeServers = stats.totalMcpServers - stats.blockedMcpServers;
  const activeMemory = stats.totalMemoryFiles - stats.blockedMemoryFiles;

  // Fixed header height (title + stats + nav guide)
  const headerHeight = 10;
  const detailsHeight = height - headerHeight - 2; // Subtract borders

  // Get details content for rendering
  const renderDetails = () => {
    if (!selectedItem) {
      return <Text>No item selected</Text>;
    }

    const maxWidth = width - 4; // Account for padding and borders
    const wrapText = (text: string): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        if ((currentLine + ' ' + word).length > maxWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      });

      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const allContent: React.ReactNode[] = [];
    let lineCount = 0;

    // Name
    allContent.push(<Box key={lineCount++}><Text>Name: {selectedItem.name}</Text></Box>);

    // Type
    const typeStr = selectedItem.type === 'server' ? 'MCP Server' : selectedItem.type === 'memory' ? 'Memory File' : 'Subagent';
    allContent.push(<Box key={lineCount++}><Text>Type: {typeStr}</Text></Box>);

    // Source
    allContent.push(<Box key={lineCount++}><Text>Source: {selectedItem.source}</Text></Box>);

    // Status
    allContent.push(<Box key={lineCount++}><Text>Status: {selectedItem.isBlocked ? 'Blocked' : 'Active'}</Text></Box>);

    // Tokens (highlighted in cyan)
    if (selectedItem.estimatedTokens) {
      allContent.push(
        <Box key={lineCount++}>
          <Text>Tokens: <Text color="cyan" bold>{formatTokenCount(selectedItem.estimatedTokens)}</Text></Text>
        </Box>
      );
    }

    // Blank line
    allContent.push(<Box key={lineCount++}><Text> </Text></Box>);

    // Description
    if (selectedItem.description) {
      allContent.push(<Box key={lineCount++}><Text>Description:</Text></Box>);
      const wrappedLines = wrapText(selectedItem.description);
      wrappedLines.forEach(line => {
        allContent.push(<Box key={lineCount++}><Text>{line}</Text></Box>);
      });
    }

    // Apply scroll offset
    return allContent.slice(scrollOffset, scrollOffset + detailsHeight);
  };

  return (
    <Box flexDirection="column" height={height} width={width}>
      {/* Fixed Header */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
      >
        <Box>
          <Text bold>MCP Toggle</Text>
        </Box>
        <Box>
          <Text dimColor>{projectPath}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>
            Servers: <Text color="green">{activeServers}</Text>
          </Text>
        </Box>
        <Box>
          <Text>
            Memory: <Text color="green">{activeMemory}</Text>
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            <Text color="cyan" bold>{isFocused ? '↑/↓' : '↑/↓'}</Text>: {isFocused ? 'Scroll' : 'Navigate'} • <Text color="cyan" bold>Tab</Text>: Switch • <Text color="cyan" bold>Space</Text>: Toggle
          </Text>
        </Box>
        <Box>
          <Text dimColor>
            <Text color="cyan" bold>Enter</Text>: Save • <Text color="cyan" bold>Q</Text>: Quit
          </Text>
        </Box>

        {hasUnsavedChanges && (
          <Box marginTop={1}>
            <Text color="yellow" bold>
              * UNSAVED CHANGES *
            </Text>
          </Box>
        )}
      </Box>

      {/* Scrollable Details */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={isFocused ? 'cyan' : 'gray'}
        paddingX={1}
        marginTop={1}
        flexGrow={1}
      >
        <Box marginBottom={1}>
          <Text bold>Details</Text>
        </Box>

        {renderDetails()}
      </Box>
    </Box>
  );
};

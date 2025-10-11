import React from 'react';
import { Box, Text } from 'ink';
import type { UnifiedItem } from '../../models/unified-item';

export interface ItemListProps {
  /** All items to display */
  items: UnifiedItem[];

  /** Currently selected index */
  selectedIndex: number;

  /** Whether this pane has focus */
  isFocused: boolean;

  /** Available height for the list */
  height: number;

  /** Available width for the list */
  width: number;
}

/**
 * Scrollable item list for left pane.
 * Displays all items (servers, memory, agents) in a unified list.
 */
export const ItemList: React.FC<ItemListProps> = ({
  items,
  selectedIndex,
  isFocused,
  height,
  width,
}) => {
  // Helper functions (must be defined before use)
  const getTypeIcon = (type: UnifiedItem['type']): string => {
    switch (type) {
      case 'server': return '[S]';
      case 'memory': return '[M]';
      case 'agent': return '[A]';
    }
  };

  const getStatusIcon = (isBlocked: boolean): string => {
    return isBlocked ? '✗' : '✓';
  };

  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const getSectionHeader = (index: number): string | null => {
    if (index === 0) return null; // No header before first item

    const currentType = items[index].type;
    const previousType = items[index - 1].type;

    if (currentType !== previousType) {
      switch (currentType) {
        case 'memory': return '── Memory Files ──';
        case 'agent': return '── Subagents ──';
        default: return null;
      }
    }

    return null;
  };

  // Build visible items list working backwards from end when near bottom
  const buildVisibleItemsFromEnd = (maxLines: number): { items: UnifiedItem[], startIndex: number } => {
    const visible: UnifiedItem[] = [];
    let linesUsed = 0;
    let startIdx = items.length - 1;

    // Work backwards from the last item
    for (let i = items.length - 1; i >= 0 && linesUsed < maxLines; i--) {
      const header = getSectionHeader(i);
      const headerLines = header ? 3 : 0; // marginY={1} = top(1) + content(1) + bottom(1)

      // Check if we have room for this item (and its header if present)
      if (linesUsed + headerLines + 1 <= maxLines) {
        visible.unshift(items[i]); // Add to front since we're going backwards
        linesUsed += headerLines + 1;
        startIdx = i;
      } else {
        break; // No more room
      }
    }

    // If we managed to get back to index 0, account for the first section header
    if (startIdx === 0 && linesUsed + 2 <= maxLines) {
      linesUsed += 2; // "── MCP Servers ──" header with marginBottom={1}
    }

    return { items: visible, startIndex: startIdx };
  };

  // Build visible items list by counting lines until we run out of space
  const buildVisibleItems = (startIndex: number, maxLines: number): UnifiedItem[] => {
    const visible: UnifiedItem[] = [];
    let linesUsed = 0;

    // Check if we need the first section header
    if (startIndex === 0) {
      linesUsed += 2; // "── MCP Servers ──" header takes 2 lines
    }

    for (let i = startIndex; i < items.length && linesUsed < maxLines; i++) {
      // Check if this item has a section header
      const header = getSectionHeader(i);
      const headerLines = header ? 3 : 0; // marginY={1} = top(1) + content(1) + bottom(1)

      // Check if we have room for this item (and its header if present)
      if (linesUsed + headerLines + 1 <= maxLines) {
        visible.push(items[i]);
        linesUsed += headerLines + 1; // header (if any) + item
      } else {
        break; // No more room
      }
    }

    return visible;
  };

  // Viewport calculation
  // Account for: borders (2) + title (1) + scroll indicator text (1) + scroll indicator marginTop (1)
  const availableLines = height - 5;

  // Calculate scroll offset to keep selected item visible
  let scrollOffset = 0;
  let visibleItems: UnifiedItem[];

  if (selectedIndex < availableLines / 2) {
    // Near the top - show from beginning
    scrollOffset = 0;
    visibleItems = buildVisibleItems(scrollOffset, availableLines);
  } else if (selectedIndex >= items.length - Math.floor(availableLines / 2)) {
    // Near the bottom - build from end to ensure last items are included
    const result = buildVisibleItemsFromEnd(availableLines);
    visibleItems = result.items;
    scrollOffset = result.startIndex;
  } else {
    // Middle - ensure selected item is visible by trying different starting points
    // Start conservatively to ensure we include the selected item
    scrollOffset = Math.max(0, selectedIndex - Math.floor(availableLines * 0.6));
    visibleItems = buildVisibleItems(scrollOffset, availableLines);

    // Verify selected item is included
    let attempts = 0;
    while (attempts < 10 && (scrollOffset + visibleItems.length <= selectedIndex)) {
      // Selected item not included, move window forward
      scrollOffset = scrollOffset + 1;
      visibleItems = buildVisibleItems(scrollOffset, availableLines);
      attempts++;
    }
  }

  const maxNameWidth = width - 15; // Reserve space for icons and source

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? 'cyan' : 'gray'}
      height={height}
      width={width}
    >
      <Box paddingX={1}>
        <Text bold>Items ({items.length})</Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {/* Show first section header if in view */}
        {scrollOffset === 0 && (
          <Box marginBottom={1}>
            <Text dimColor>── MCP Servers ──</Text>
          </Box>
        )}

        {visibleItems.map((item, visibleIdx) => {
          const actualIndex = scrollOffset + visibleIdx;
          const isSelected = actualIndex === selectedIndex;
          const header = getSectionHeader(actualIndex);

          return (
            <Box key={item.id} flexDirection="column">
              {/* Section header if needed */}
              {header && (
                <Box marginY={1}>
                  <Text dimColor>{header}</Text>
                </Box>
              )}

              {/* Item row */}
              <Box>
                {isSelected && isFocused ? (
                  <Text backgroundColor="cyan">
                    <Text color="black" bold>
                      {getStatusIcon(item.isBlocked)} {getTypeIcon(item.type)} {truncate(item.name, maxNameWidth)}{' '}
                    </Text>
                    <Text color="gray">({item.source})</Text>
                  </Text>
                ) : (
                  <Text bold={isSelected}>
                    {getStatusIcon(item.isBlocked)} {getTypeIcon(item.type)} {truncate(item.name, maxNameWidth)} <Text dimColor>({item.source})</Text>
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicator */}
      {items.length > visibleItems.length && (
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>
            {scrollOffset + 1}-{Math.min(scrollOffset + visibleItems.length, items.length)} of {items.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};

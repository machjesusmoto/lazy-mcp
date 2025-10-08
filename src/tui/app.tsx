import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { buildProjectContext } from '../core/project-context-builder';
import { saveBlockedItems } from '../core/blocked-manager';
import { updateClaudeMd } from '../core/claude-md-updater';
import { computeStats } from '../models/project-context';
import { ServerList } from './components/server-list';
import { MemoryList } from './components/memory-list';
import { StatusBar } from './components/status-bar';
import type { ProjectContext, MCPServer, MemoryFile } from '../models';

export interface AppProps {
  /**
   * Project directory to analyze (defaults to current directory)
   */
  projectDir?: string;
  /**
   * Disable automatic claude.md updates
   */
  noClaudeMdUpdate?: boolean;
}

type FocusPanel = 'servers' | 'memory';

/**
 * Main TUI application component.
 * Orchestrates the display and interaction for MCP Toggle.
 */
export const App: React.FC<AppProps> = ({ projectDir = process.cwd(), noClaudeMdUpdate = false }) => {
  const { exit } = useApp();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Project context state
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([]);

  // UI state
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('servers');
  const [serverIndex, setServerIndex] = useState(0);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load project context on mount
  useEffect(() => {
    const loadContext = async () => {
      try {
        setIsLoading(true);
        const ctx = await buildProjectContext(projectDir);
        setContext(ctx);
        setServers(ctx.mcpServers);
        setMemoryFiles(ctx.memoryFiles);
        setIsLoading(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLoadError(`Failed to load project context: ${message}`);
        setIsLoading(false);
      }
    };

    loadContext();
  }, [projectDir]);

  // Keyboard input handling
  useInput((input: string, key: { upArrow?: boolean; downArrow?: boolean; tab?: boolean; return?: boolean; ctrl?: boolean }) => {
    if (isLoading || loadError) return;

    // Quit on 'q' or Ctrl+C
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Tab to switch panels
    if (key.tab) {
      setFocusPanel((prev) => (prev === 'servers' ? 'memory' : 'servers'));
      return;
    }

    const currentPanel = focusPanel;
    const currentIndex = currentPanel === 'servers' ? serverIndex : memoryIndex;
    const currentList = currentPanel === 'servers' ? servers : memoryFiles;

    // Navigation
    if (key.upArrow) {
      const newIndex = Math.max(0, currentIndex - 1);
      if (currentPanel === 'servers') {
        setServerIndex(newIndex);
      } else {
        setMemoryIndex(newIndex);
      }
      return;
    }

    if (key.downArrow) {
      const newIndex = Math.min(currentList.length - 1, currentIndex + 1);
      if (currentPanel === 'servers') {
        setServerIndex(newIndex);
      } else {
        setMemoryIndex(newIndex);
      }
      return;
    }

    // Toggle blocked state with Space
    if (input === ' ' && currentList.length > 0) {
      if (currentPanel === 'servers') {
        const newServers = [...servers];
        newServers[serverIndex] = {
          ...newServers[serverIndex],
          isBlocked: !newServers[serverIndex].isBlocked,
        };
        setServers(newServers);
        setHasUnsavedChanges(true);
      } else {
        const newFiles = [...memoryFiles];
        newFiles[memoryIndex] = {
          ...newFiles[memoryIndex],
          isBlocked: !newFiles[memoryIndex].isBlocked,
        };
        setMemoryFiles(newFiles);
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Save changes with Enter
    if (key.return && hasUnsavedChanges) {
      handleSave();
      return;
    }
  });

  const handleSave = async () => {
    if (!context) return;

    try {
      // Build blocked items list from current state
      const blockedItems = [
        ...servers
          .filter((s) => s.isBlocked)
          .map((s) => ({
            type: 'mcp' as const,
            identifier: s.name,
            blockedAt: new Date(),
            blockedBy: 'mcp-toggle',
          })),
        ...memoryFiles
          .filter((f) => f.isBlocked)
          .map((f) => ({
            type: 'memory' as const,
            identifier: f.relativePath || f.name,
            blockedAt: new Date(),
            blockedBy: 'mcp-toggle',
          })),
      ];

      await saveBlockedItems(projectDir, blockedItems);

      // Update claude.md with integration instructions (unless disabled)
      if (!noClaudeMdUpdate) {
        try {
          await updateClaudeMd(projectDir);
          setHasUnsavedChanges(false);
          setSaveMessage('✓ Changes saved to blocked.md and claude.md');
        } catch (claudeMdError) {
          // blocked.md was saved successfully, but claude.md update failed
          // This is non-fatal - user can manually add integration
          setHasUnsavedChanges(false);
          setSaveMessage('✓ Saved to blocked.md (claude.md update failed)');
          console.error('Failed to update claude.md:', claudeMdError);
        }
      } else {
        // claude.md updates disabled by flag
        setHasUnsavedChanges(false);
        setSaveMessage('✓ Changes saved to blocked.md');
      }

      // Clear save message after 2 seconds
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSaveMessage(`✗ Save failed: ${message}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text>Loading project context...</Text>
      </Box>
    );
  }

  // Error state
  if (loadError) {
    return (
      <Box paddingX={2} paddingY={1} flexDirection="column">
        <Text color="red" bold>
          Error: {loadError}
        </Text>
        <Box marginTop={1}>
          <Text dimColor>
            Press 'q' to quit
          </Text>
        </Box>
      </Box>
    );
  }

  // Main display
  if (!context) return null;

  const stats = computeStats(context);

  return (
    <Box flexDirection="column" padding={1}>
      <StatusBar
        stats={stats}
        projectPath={context.projectPath}
        hasUnsavedChanges={hasUnsavedChanges}
        hasWritePermission={context.hasWritePermission}
      />

      <Box marginTop={1} flexDirection="column">
        <ServerList
          servers={servers}
          selectedIndex={serverIndex}
          isFocused={focusPanel === 'servers'}
        />

        <Box marginTop={1}>
          <MemoryList
            files={memoryFiles}
            selectedIndex={memoryIndex}
            isFocused={focusPanel === 'memory'}
          />
        </Box>
      </Box>

      {saveMessage && (
        <Box paddingLeft={2}>
          <Text color={saveMessage.startsWith('✓') ? 'green' : 'red'}>
            {saveMessage}
          </Text>
        </Box>
      )}
    </Box>
  );
};

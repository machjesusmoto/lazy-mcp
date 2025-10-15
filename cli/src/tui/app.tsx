import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { buildProjectContext } from '../core/project-context-builder';
import {
  blockLocalServer,
  blockInheritedServer,
  unblockLocalServer,
  unblockInheritedServer,
  blockMemoryFile,
  unblockMemoryFile,
} from '../core/blocked-manager';
import { updateClaudeMd } from '../core/claude-md-updater';
import { computeStats } from '../models/project-context';
import { ItemList } from './components/item-list';
import { DetailsPane } from './components/details-pane';
import { MigrationMenu } from './components/migration-menu';
import type { ProjectContext, MCPServer, MemoryFile, SubAgent } from '../models';
import type { UnifiedItem } from '../models/unified-item';
import { createUnifiedItemList } from '../models/unified-item';
import { useMigration } from './hooks/use-migration';
import * as path from 'path';

export interface AppProps {
  projectDir?: string;
  noClaudeMdUpdate?: boolean;
}

type ViewMode = 'main' | 'menu' | 'migration';
type FocusPane = 'list' | 'details';

/**
 * Main TUI application with fixed 2-column layout.
 * v0.4.2 redesign for better terminal compatibility.
 */
export const App: React.FC<AppProps> = ({ projectDir = process.cwd(), noClaudeMdUpdate = false }) => {
  const { exit } = useApp();

  // Terminal dimensions (captured at launch)
  const terminalWidth = process.stdout.columns || 80;
  const terminalHeight = process.stdout.rows || 24;

  // Layout calculations
  const listWidth = Math.floor(terminalWidth * 0.66); // 66% for list
  const detailsWidth = terminalWidth - listWidth - 2; // 33% for details (minus spacing)

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Project context state
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([]);
  const [agents, setAgents] = useState<SubAgent[]>([]);
  const [items, setItems] = useState<UnifiedItem[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [focusPane, setFocusPane] = useState<FocusPane>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailsScrollOffset, setDetailsScrollOffset] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedConflictIndex, setSelectedConflictIndex] = useState(0);
  const [pendingMigrationServers, setPendingMigrationServers] = useState<MCPServer[]>([]);

  // Migration hook
  const migration = useMigration();

  // Load project context on mount
  useEffect(() => {
    const loadContext = async () => {
      try {
        setIsLoading(true);
        const ctx = await buildProjectContext(projectDir);
        setContext(ctx);
        setServers(ctx.mcpServers);
        setMemoryFiles(ctx.memoryFiles);
        setAgents(ctx.agents);

        // Create unified item list
        const unifiedItems = createUnifiedItemList(ctx.mcpServers, ctx.memoryFiles, ctx.agents);
        setItems(unifiedItems);

        // Auto-show migration prompt if project-local servers exist
        const projectLocalServers = ctx.mcpServers.filter(s => s.hierarchyLevel === 1);
        if (projectLocalServers.length > 0) {
          // Store servers for migration and show idle prompt
          setPendingMigrationServers(projectLocalServers);
          await migration.initializeMigration(
            projectLocalServers.map(s => s.name),
            projectDir
          );
          setViewMode('migration');
        }

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
  useInput((input: string, key) => {
    if (isLoading || loadError) return;

    // Quit on 'q' or Ctrl+C (only in main view)
    if ((input === 'q' || (key.ctrl && input === 'c')) && viewMode === 'main') {
      exit();
      return;
    }

    // Handle migration view
    if (viewMode === 'migration' && migration.operation) {
      handleMigrationInput(input, key);
      return;
    }

    // Main view input handling
    if (viewMode !== 'main') return;

    // 'm' to open migration menu (if project-local servers exist)
    if (input === 'm') {
      const projectLocalServers = servers.filter(s => s.hierarchyLevel === 1);
      if (projectLocalServers.length > 0) {
        startMigrationFlow(projectLocalServers);
      } else {
        setSaveMessage('ℹ No project-local servers to migrate');
        setTimeout(() => setSaveMessage(null), 2000);
      }
      return;
    }

    // Tab to switch focus between panes
    if (key.tab) {
      setFocusPane(prev => prev === 'list' ? 'details' : 'list');
      setDetailsScrollOffset(0); // Reset scroll when switching
      return;
    }

    // Arrow key navigation
    if (focusPane === 'list') {
      // Navigate through unified list
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        setDetailsScrollOffset(0); // Reset details scroll on item change
        return;
      }
      if (key.downArrow) {
        setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
        setDetailsScrollOffset(0); // Reset details scroll on item change
        return;
      }
    } else {
      // Scroll details pane
      if (key.upArrow) {
        setDetailsScrollOffset(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setDetailsScrollOffset(prev => prev + 1); // Component will handle max
        return;
      }
    }

    // Space to toggle blocked state
    if (input === ' ' && items.length > 0 && focusPane === 'list') {
      const item = items[selectedIndex];
      const newIsBlocked = !item.isBlocked;

      // Update the item
      const newItems = [...items];
      newItems[selectedIndex] = { ...item, isBlocked: newIsBlocked };
      setItems(newItems);

      // Update the underlying data based on type
      if (item.type === 'server') {
        const serverData = item.data as MCPServer;
        const newServers = servers.map(s =>
          s.name === serverData.name ? { ...s, isBlocked: newIsBlocked } : s
        );
        setServers(newServers);
      } else if (item.type === 'memory') {
        const memoryData = item.data as MemoryFile;
        const newMemory = memoryFiles.map(m =>
          m.name === memoryData.name ? { ...m, isBlocked: newIsBlocked } : m
        );
        setMemoryFiles(newMemory);
      } else if (item.type === 'agent') {
        const agentData = item.data as SubAgent;
        const newAgents = agents.map(a =>
          a.name === agentData.name ? { ...a, isBlocked: newIsBlocked } : a
        );
        setAgents(newAgents);
      }

      setHasUnsavedChanges(true);
      return;
    }

    // Enter to save
    if (key.return && hasUnsavedChanges) {
      handleSave();
      return;
    }
  });

  const startMigrationFlow = async (projectLocalServers: MCPServer[]) => {
    setViewMode('migration');
    try {
      await migration.startMigration(projectDir, projectLocalServers);
    } catch (error) {
      setSaveMessage(`✗ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSaveMessage(null), 3000);
      setViewMode('main');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMigrationInput = async (input: string, key: any) => {
    if (!migration.operation) return;

    const { state } = migration.operation;

    // Handle idle state (initial prompt)
    if (state === 'idle') {
      if (input === 'm' || input === 'M') {
        // User chose to migrate - start real migration with conflict detection
        if (pendingMigrationServers.length > 0) {
          migration.startMigration(projectDir, pendingMigrationServers);
        }
        return;
      }
      if (key.escape) {
        // User chose to keep project servers local
        migration.cancelMigration();
        setPendingMigrationServers([]);
        setViewMode('main');
        return;
      }
      return;
    }

    // Handle conflict resolution state
    if (state === 'conflict_resolution') {
      if (key.upArrow) {
        setSelectedConflictIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedConflictIndex(prev => Math.min(migration.operation!.conflicts.length - 1, prev + 1));
        return;
      }

      // Change resolution: s(kip), o(verwrite), r(ename)
      if (input === 's') {
        const conflict = migration.operation.conflicts[selectedConflictIndex];
        migration.updateResolution(conflict.serverName, { ...conflict, resolution: 'skip' });
        return;
      }
      if (input === 'o') {
        const conflict = migration.operation.conflicts[selectedConflictIndex];
        migration.updateResolution(conflict.serverName, { ...conflict, resolution: 'overwrite' });
        return;
      }
      // Note: rename would need a text input sub-modal - skip for MVP

      // Enter to proceed to ready state
      if (key.return) {
        migration.proceedToReady();
        return;
      }
    }

    // Handle ready state
    if (state === 'ready') {
      if (key.return) {
        await migration.confirmMigration();
        return;
      }
      if (key.escape) {
        migration.cancelMigration();
        setViewMode('main');
        return;
      }
    }

    // Handle complete or error state
    if (state === 'complete' || state === 'error') {
      // Any key to close
      migration.resetMigration();
      setPendingMigrationServers([]);
      setViewMode('main');
      // Reload context to reflect migrated servers
      const ctx = await buildProjectContext(projectDir);
      setContext(ctx);
      setServers(ctx.mcpServers);
      const unifiedItems = createUnifiedItemList(ctx.mcpServers, ctx.memoryFiles, ctx.agents);
      setItems(unifiedItems);
      return;
    }

    // Escape to cancel at any time
    if (key.escape) {
      migration.cancelMigration();
      setViewMode('main');
      return;
    }
  };

  const handleSave = async () => {
    if (!context) return;

    try {
      const errors: string[] = [];

      // Process server blocking changes
      for (const server of servers) {
        const originalServer = context.mcpServers.find(s => s.name === server.name);
        if (!originalServer) continue;

        const wasBlocked = originalServer.isBlocked;
        const isNowBlocked = server.isBlocked;

        if (wasBlocked !== isNowBlocked) {
          try {
            if (isNowBlocked) {
              if (server.hierarchyLevel === 2) {
                await blockInheritedServer(projectDir, server);
              } else {
                await blockLocalServer(projectDir, server.name);
              }
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
              const isBlockedOverride = (originalServer as any)._mcpToggleBlocked === true;
              if (isBlockedOverride) {
                await unblockInheritedServer(projectDir, server.name);
              } else {
                await unblockLocalServer(projectDir, server.name);
              }
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`${server.name}: ${msg}`);
          }
        }
      }

      // Process memory file blocking changes
      for (const file of memoryFiles) {
        const originalFile = context.memoryFiles.find(f => f.name === file.name);
        if (!originalFile) continue;

        const wasBlocked = originalFile.isBlocked;
        const isNowBlocked = file.isBlocked;

        if (wasBlocked !== isNowBlocked) {
          try {
            const filePath = path.join(projectDir, '.claude', file.relativePath || file.name);
            if (isNowBlocked) {
              await blockMemoryFile(filePath);
            } else {
              await unblockMemoryFile(`${filePath}.blocked`);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`${file.name}: ${msg}`);
          }
        }
      }

      // Update claude.md
      if (!noClaudeMdUpdate) {
        try {
          await updateClaudeMd(projectDir);
          setHasUnsavedChanges(false);
          setSaveMessage(errors.length > 0 ? `⚠ Partial save (${errors.length} errors)` : '✓ Changes saved');
        } catch (error) {
          setHasUnsavedChanges(false);
          setSaveMessage('✓ Saved to .claude.json (claude.md failed)');
        }
      } else {
        setHasUnsavedChanges(false);
        setSaveMessage(errors.length > 0 ? `⚠ Partial save (${errors.length} errors)` : '✓ Changes saved');
      }

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
        <Text color="red" bold>Error: {loadError}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  // Main display
  if (!context) return null;

  const stats = computeStats(context);
  const selectedItem = items[selectedIndex] || null;

  return (
    <Box flexDirection="row" width={terminalWidth} height={terminalHeight}>
      {/* Left Pane: Item List (66%) */}
      <Box width={listWidth}>
        <ItemList
          items={items}
          selectedIndex={selectedIndex}
          isFocused={focusPane === 'list'}
          height={terminalHeight}
          width={listWidth}
        />
      </Box>

      {/* Right Pane: Details (33%) */}
      <Box width={detailsWidth} marginLeft={1}>
        <DetailsPane
          selectedItem={selectedItem}
          stats={stats}
          projectPath={context.projectPath}
          hasUnsavedChanges={hasUnsavedChanges}
          isFocused={focusPane === 'details'}
          height={terminalHeight}
          width={detailsWidth}
          scrollOffset={detailsScrollOffset}
        />
      </Box>

      {/* Migration menu overlay */}
      {viewMode === 'migration' && migration.operation && (
        <Box
          position="absolute"
          width={terminalWidth}
          height={terminalHeight}
        >
          {/* Backdrop - fills entire screen with solid background */}
          <Box
            width={terminalWidth}
            height={terminalHeight}
            flexDirection="column"
          >
            {Array.from({ length: terminalHeight }).map((_, i) => (
              <Box key={i} width={terminalWidth}>
                <Text backgroundColor="black">{' '.repeat(terminalWidth)}</Text>
              </Box>
            ))}
          </Box>

          {/* Modal content centered on top of backdrop */}
          <Box
            position="absolute"
            width={terminalWidth}
            height={terminalHeight}
            justifyContent="center"
            alignItems="center"
          >
            <MigrationMenu
              operation={migration.operation}
              selectedConflictIndex={selectedConflictIndex}
              onClose={() => {
                migration.cancelMigration();
                setViewMode('main');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Save message overlay */}
      {saveMessage && (
        <Box paddingX={2} marginTop={1}>
          <Text color={saveMessage.startsWith('✓') ? 'green' : 'red'}>
            {saveMessage}
          </Text>
        </Box>
      )}
    </Box>
  );
};

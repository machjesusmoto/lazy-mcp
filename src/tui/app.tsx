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
import { computeStats, calculateContextStats } from '../models/project-context';
import { ServerList } from './components/server-list';
import { MemoryList } from './components/memory-list';
import { AgentList } from './components/agent-list';
import { StatusBar } from './components/status-bar';
import { ContextSummary } from './components/context-summary';
import { MigrationMenu } from './components/migration-menu';
import { MemoryMigrationPrompt } from './components/memory-migration-prompt';
import { MemoryMigrationStatus } from './components/memory-migration-status';
import { useMigration } from './hooks/use-migration';
import { useMemoryMigration } from './hooks/use-memory-migration';
import { useAgents } from './hooks/use-agents';
import type { ProjectContext, MCPServer, MemoryFile, SubAgent } from '../models';
import type { ResolutionType } from '../models/types';
import * as path from 'path';

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

type FocusPanel = 'servers' | 'memory' | 'agents';

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
  const [agents, setAgents] = useState<SubAgent[]>([]);

  // UI state
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('servers');
  const [serverIndex, setServerIndex] = useState(0);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Server migration state
  const migration = useMigration();
  const [showMigrationMenu, setShowMigrationMenu] = useState(false);
  const [selectedServersForMigration, setSelectedServersForMigration] = useState<MCPServer[]>([]);
  const [conflictIndex, setConflictIndex] = useState(0);

  // Memory migration state (T015-T018)
  const memoryMigration = useMemoryMigration();
  const [showMemoryMigration, setShowMemoryMigration] = useState(false);

  // Agent management state (T028, T030-T031)
  const agentHook = useAgents(agents.length);

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
        setIsLoading(false);

        // T015: Check for memory migration after loading context
        await memoryMigration.checkForMigration(projectDir);
        if (memoryMigration.state === 'prompt') {
          setShowMemoryMigration(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLoadError(`Failed to load project context: ${message}`);
        setIsLoading(false);
      }
    };

    loadContext();
  }, [projectDir]);

  // Keyboard input handling
  useInput((input: string, key: { upArrow?: boolean; downArrow?: boolean; leftArrow?: boolean; rightArrow?: boolean; tab?: boolean; return?: boolean; ctrl?: boolean; escape?: boolean }) => {
    if (isLoading || loadError) return;

    // T017: Handle memory migration prompt input
    if (showMemoryMigration && memoryMigration.state === 'prompt') {
      if (input === 'y' || input === 'Y') {
        memoryMigration.confirmMigration(projectDir);
        return;
      }
      if (input === 's' || input === 'S') {
        memoryMigration.skipMigration(false);
        setShowMemoryMigration(false);
        return;
      }
      if (input === 'n' || input === 'N') {
        memoryMigration.skipMigration(true);
        setShowMemoryMigration(false);
        return;
      }
      return; // Block other inputs while prompt is showing
    }

    // T016: Handle memory migration status input (any key to close)
    if (showMemoryMigration && (
      memoryMigration.state === 'complete' ||
      memoryMigration.state === 'error' ||
      memoryMigration.state === 'skipped'
    )) {
      setShowMemoryMigration(false);
      memoryMigration.resetMigration();
      // T018: Reload context after successful migration
      if (memoryMigration.state === 'complete') {
        const reloadContext = async () => {
          try {
            const ctx = await buildProjectContext(projectDir);
            setContext(ctx);
            setServers(ctx.mcpServers);
            setMemoryFiles(ctx.memoryFiles);
            setAgents(ctx.agents);
          } catch (error) {
            console.error('Failed to reload context after memory migration:', error);
          }
        };
        reloadContext();
      }
      return;
    }

    // Handle server migration menu keyboard input
    if (showMigrationMenu) {
      // Escape or 'q' to close migration menu
      if (key.escape || input === 'q') {
        migration.cancelMigration();
        setShowMigrationMenu(false);
        setConflictIndex(0);
        return;
      }

      // Handle conflict resolution navigation
      if (migration.operation && migration.operation.state === 'conflict_resolution') {
        const conflicts = migration.operation.conflicts;

        // Arrow keys to navigate conflicts
        if (key.upArrow) {
          setConflictIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (key.downArrow) {
          setConflictIndex((prev) => Math.min(conflicts.length - 1, prev + 1));
          return;
        }

        // Change resolution type
        if (input === 's' || input === 'S') {
          const conflict = conflicts[conflictIndex];
          migration.updateResolution(conflict.serverName, {
            ...conflict,
            resolution: 'skip',
          });
          return;
        }
        if (input === 'o' || input === 'O') {
          const conflict = conflicts[conflictIndex];
          migration.updateResolution(conflict.serverName, {
            ...conflict,
            resolution: 'overwrite',
          });
          return;
        }
        if (input === 'r' || input === 'R') {
          const conflict = conflicts[conflictIndex];
          // For now, just set resolution to 'rename' without prompting for new name
          // Full rename implementation would require text input component
          migration.updateResolution(conflict.serverName, {
            ...conflict,
            resolution: 'rename',
            newName: `${conflict.serverName}_migrated`,
          });
          return;
        }
      }

      // Enter to confirm migration when ready
      if (key.return && migration.operation?.state === 'ready') {
        migration.confirmMigration();
        return;
      }

      // Close menu on completion or error (any key)
      if (migration.operation?.state === 'complete' || migration.operation?.state === 'error') {
        migration.resetMigration();
        setShowMigrationMenu(false);
        setConflictIndex(0);
        // Reload context after successful migration
        if (migration.operation.state === 'complete') {
          const reloadContext = async () => {
            try {
              const ctx = await buildProjectContext(projectDir);
              setContext(ctx);
              setServers(ctx.mcpServers);
              setMemoryFiles(ctx.memoryFiles);
              setAgents(ctx.agents);
            } catch (error) {
              console.error('Failed to reload context after migration:', error);
            }
          };
          reloadContext();
        }
        return;
      }

      // Prevent other key handlers while migration menu is open
      return;
    }

    // Quit on 'q' or Ctrl+C
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // 'M' key to start migration
    if (input === 'm' || input === 'M') {
      const projectLocalServers = servers.filter((s) => s.hierarchyLevel === 1);
      if (projectLocalServers.length === 0) {
        setSaveMessage('⚠ No project-local servers to migrate');
        setTimeout(() => setSaveMessage(null), 2000);
        return;
      }
      setSelectedServersForMigration(projectLocalServers);
      migration.startMigration(projectDir, projectLocalServers);
      setShowMigrationMenu(true);
      return;
    }

    // Tab to switch panels (T030)
    if (key.tab) {
      setFocusPanel((prev) => {
        if (prev === 'servers') return 'memory';
        if (prev === 'memory') return 'agents';
        return 'servers';
      });
      return;
    }

    const currentPanel = focusPanel;
    const currentIndex = currentPanel === 'servers' ? serverIndex :
                        currentPanel === 'memory' ? memoryIndex :
                        agentHook.selectedIndex;
    const currentList = currentPanel === 'servers' ? servers :
                       currentPanel === 'memory' ? memoryFiles :
                       agents;

    // Navigation (T031)
    if (key.upArrow) {
      if (currentPanel === 'servers') {
        const newIndex = Math.max(0, serverIndex - 1);
        setServerIndex(newIndex);
      } else if (currentPanel === 'memory') {
        const newIndex = Math.max(0, memoryIndex - 1);
        setMemoryIndex(newIndex);
      } else {
        agentHook.selectPrevious();
      }
      return;
    }

    if (key.downArrow) {
      if (currentPanel === 'servers') {
        const newIndex = Math.min(servers.length - 1, serverIndex + 1);
        setServerIndex(newIndex);
      } else if (currentPanel === 'memory') {
        const newIndex = Math.min(memoryFiles.length - 1, memoryIndex + 1);
        setMemoryIndex(newIndex);
      } else {
        agentHook.selectNext();
      }
      return;
    }

    // Expand/Collapse for agents panel (→/e for expand, ←/c for collapse)
    if (currentPanel === 'agents' && agents.length > 0) {
      if (key.rightArrow || input === 'e') {
        agentHook.toggleExpanded();
        return;
      }
      if (key.leftArrow || input === 'c') {
        agentHook.toggleExpanded();
        return;
      }
    }

    // Toggle blocked state with Space (T031)
    if (input === ' ' && currentList.length > 0) {
      if (currentPanel === 'servers') {
        const newServers = [...servers];
        newServers[serverIndex] = {
          ...newServers[serverIndex],
          isBlocked: !newServers[serverIndex].isBlocked,
        };
        setServers(newServers);
        setHasUnsavedChanges(true);
      } else if (currentPanel === 'memory') {
        const newFiles = [...memoryFiles];
        newFiles[memoryIndex] = {
          ...newFiles[memoryIndex],
          isBlocked: !newFiles[memoryIndex].isBlocked,
        };
        setMemoryFiles(newFiles);
        setHasUnsavedChanges(true);
      } else {
        // Agent blocking is handled directly via settings.json (T031)
        agentHook.toggleBlocked(projectDir, agents).then(() => {
          // Reload context after agent blocking changes
          const reloadContext = async () => {
            try {
              const ctx = await buildProjectContext(projectDir);
              setContext(ctx);
              setServers(ctx.mcpServers);
              setMemoryFiles(ctx.memoryFiles);
              setAgents(ctx.agents);
            } catch (error) {
              console.error('Failed to reload context after agent toggle:', error);
            }
          };
          reloadContext();
        });
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
      // v2.0.0: Apply blocking changes directly to .claude.json and memory files
      const errors: string[] = [];

      // Process server blocking changes
      for (const server of servers) {
        const wasBlocked = context.mcpServers.find(s => s.name === server.name)?.isBlocked || false;
        const isNowBlocked = server.isBlocked;

        if (wasBlocked !== isNowBlocked) {
          try {
            const fullServer = context.mcpServers.find(s => s.name === server.name);

            if (isNowBlocked) {
              // Block the server
              // Check if it's truly a project-local server or inherited from global
              // Servers with hierarchyLevel 2 are from global config
              if (server.hierarchyLevel === 2 || (fullServer && fullServer.hierarchyLevel === 2)) {
                // Inherited from user global scope - need full MCPServer object
                if (fullServer) {
                  await blockInheritedServer(projectDir, fullServer);
                }
              } else {
                // Project-local server from .mcp.json
                await blockLocalServer(projectDir, server.name);
              }
            } else {
              // Unblock the server
              // Check if this is a blocked override (has _mcpToggleBlocked metadata)
              const isBlockedOverride = fullServer && (fullServer as any)._mcpToggleBlocked === true;

              if (isBlockedOverride) {
                // This is a blocked override of an inherited server
                await unblockInheritedServer(projectDir, server.name);
              } else {
                // This is a truly local server that was removed
                const result = await unblockLocalServer(projectDir, server.name);
                if (result.requiresManualAdd) {
                  console.warn(result.message);
                }
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
        const wasBlocked = context.memoryFiles.find(f => f.name === file.name)?.isBlocked || false;
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

      // Update claude.md with integration instructions (unless disabled)
      if (!noClaudeMdUpdate) {
        try {
          await updateClaudeMd(projectDir);
          setHasUnsavedChanges(false);
          if (errors.length > 0) {
            setSaveMessage(`⚠ Partial save (${errors.length} errors) - see console`);
            console.error('Save errors:', errors);
          } else {
            setSaveMessage('✓ Changes saved to .claude.json and claude.md');
          }
        } catch (claudeMdError) {
          // .claude.json was modified, but claude.md update failed
          setHasUnsavedChanges(false);
          setSaveMessage('✓ Saved to .claude.json (claude.md update failed)');
          console.error('Failed to update claude.md:', claudeMdError);
        }
      } else {
        // claude.md updates disabled by flag
        setHasUnsavedChanges(false);
        if (errors.length > 0) {
          setSaveMessage(`⚠ Partial save (${errors.length} errors) - see console`);
          console.error('Save errors:', errors);
        } else {
          setSaveMessage('✓ Changes saved to .claude.json');
        }
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
  const contextStats = calculateContextStats(context); // T037: Calculate context stats for summary

  return (
    <Box flexDirection="column" padding={1}>
      {/* T015/T017: Memory migration prompt (shows before main UI if needed) */}
      {showMemoryMigration && memoryMigration.state === 'prompt' && (
        <Box marginBottom={1}>
          <MemoryMigrationPrompt
            filesToMigrate={memoryMigration.filesToMigrate}
            isProcessing={memoryMigration.isProcessing}
            onConfirm={() => memoryMigration.confirmMigration(projectDir)}
            onSkip={() => {
              memoryMigration.skipMigration(false);
              setShowMemoryMigration(false);
            }}
            onNeverAsk={() => {
              memoryMigration.skipMigration(true);
              setShowMemoryMigration(false);
            }}
          />
        </Box>
      )}

      {/* T016: Memory migration status (shows during/after migration) */}
      {showMemoryMigration && (
        memoryMigration.state === 'migrating' ||
        memoryMigration.state === 'complete' ||
        memoryMigration.state === 'error' ||
        memoryMigration.state === 'skipped'
      ) && (
        <Box marginBottom={1}>
          <MemoryMigrationStatus
            state={memoryMigration.state}
            result={memoryMigration.result}
            error={memoryMigration.error}
            onClose={() => {
              setShowMemoryMigration(false);
              memoryMigration.resetMigration();
            }}
          />
        </Box>
      )}

      <StatusBar
        stats={stats}
        projectPath={context.projectPath}
        hasUnsavedChanges={hasUnsavedChanges}
        hasWritePermission={context.hasWritePermission}
      />

      {/* T037: Context Summary - unified overview of all context sources */}
      <Box marginTop={1}>
        <ContextSummary stats={contextStats} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <ServerList
          servers={servers}
          selectedIndex={serverIndex}
          isFocused={focusPanel === 'servers'}
        />

        <Box marginTop={1}>
          <MemoryList
            migratedFiles={memoryMigration.result?.migratedFiles || []}
            files={memoryFiles}
            selectedIndex={memoryIndex}
            isFocused={focusPanel === 'memory'}
          />
        </Box>

        <Box marginTop={1}>
          <AgentList
            agents={agents}
            selectedIndex={agentHook.selectedIndex}
            isFocused={focusPanel === 'agents'}
            expandedIndexes={agentHook.expandedIndexes}
          />
        </Box>
      </Box>

      {showMigrationMenu && migration.operation && (
        <Box marginTop={1}>
          <MigrationMenu
            operation={migration.operation}
            selectedConflictIndex={conflictIndex}
            onClose={() => {
              migration.cancelMigration();
              setShowMigrationMenu(false);
              setConflictIndex(0);
            }}
          />
        </Box>
      )}

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

/**
 * Project context builder that orchestrates loading and aggregation.
 * Loads MCP servers, memory files, and blocked items, then applies blocked state.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { ProjectContext, ConfigSource } from '../models';
import { loadMCPServers } from './config-loader';
import { loadMemoryFiles } from './memory-loader';
import { getHierarchyLevel } from '../utils/path-utils';
import type { BlockedItemSummary } from '../models/types';

/**
 * Build complete project context by loading and aggregating all data.
 * @param projectDir - Project directory (absolute path)
 * @returns Complete project context
 */
export async function buildProjectContext(projectDir: string): Promise<ProjectContext> {
  // Validate input
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!path.isAbsolute(projectDir)) {
    throw new Error('projectDir must be an absolute path');
  }
  if (!(await fs.pathExists(projectDir))) {
    throw new Error(`Project directory does not exist: ${projectDir}`);
  }

  const startTime = Date.now();
  const debug = process.env.MCP_TOGGLE_DEBUG === '1' || process.env.MCP_TOGGLE_DEBUG === 'true';

  if (debug) {
    console.error('[DEBUG] Starting project context enumeration...');
  }

  // Import agent functions
  const { discoverAgents, checkAgentBlockedStatus } = await import('./agent-manager');

  // Load all data sources in parallel
  const [mcpServers, memoryFiles, agents] = await Promise.all([
    loadMCPServers(projectDir),
    loadMemoryFiles(projectDir),
    discoverAgents(projectDir).then(discoveredAgents =>
      checkAgentBlockedStatus(projectDir, discoveredAgents)
    ),
  ]);

  if (debug) {
    console.error(`[DEBUG] Loaded ${mcpServers.length} MCP servers, ${memoryFiles.length} memory files, ${agents.length} agents`);
  }

  // In v2.0.0, blocked state is detected directly from .mcp.json and .md.blocked files
  // Apply blocked state to servers by checking for dummy echo overrides
  for (const server of mcpServers) {
    // Check if server has blocking metadata (command="echo" with _mcpToggleBlocked)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
    const serverAsAny = server as any;
    if (server.command === 'echo' && serverAsAny._mcpToggleBlocked === true) {
      server.isBlocked = true;
      // Extract blockedAt from metadata if available
      if (serverAsAny._mcpToggleBlockedAt) {
        try {
          server.blockedAt = new Date(serverAsAny._mcpToggleBlockedAt);
        } catch {
          // Invalid date, use current time
          server.blockedAt = new Date();
        }
      }
    }
  }

  // Memory files are already marked as blocked by loadMemoryFiles
  // (files with .md.blocked extension are detected during loading)

  // Build blockedItems summary list for backward compatibility with ProjectContext
  const blockedItems: BlockedItemSummary[] = [
    ...mcpServers
      .filter(s => s.isBlocked)
      .map(s => ({
        type: 'mcp' as const,
        identifier: s.name,
        blockedAt: s.blockedAt || new Date(),
        blockedBy: 'mcp-toggle',
      })),
    ...memoryFiles
      .filter(f => f.isBlocked)
      .map(f => ({
        type: 'memory' as const,
        identifier: f.relativePath || f.name,
        blockedAt: f.blockedAt || new Date(),
        blockedBy: 'mcp-toggle',
      })),
  ];

  // Build config sources list (unique .mcp.json paths)
  const configSourcePaths = new Set<string>();
  for (const server of mcpServers) {
    configSourcePaths.add(server.sourcePath);
  }

  const configSources: ConfigSource[] = await Promise.all(
    Array.from(configSourcePaths).map(async (sourcePath) => {
      const configPath = path.join(sourcePath, '.mcp.json');
      const hierarchyLevel = getHierarchyLevel(projectDir, sourcePath);

      let exists = false;
      let isReadable = false;
      let lastModified: Date | undefined;

      try {
        exists = await fs.pathExists(configPath);
        if (exists) {
          await fs.access(configPath, fs.constants.R_OK);
          isReadable = true;
          const stats = await fs.stat(configPath);
          lastModified = stats.mtime;
        }
      } catch {
        // File doesn't exist or isn't readable
      }

      return {
        path: configPath,
        type: 'mcp' as const,
        sourceType: hierarchyLevel === 0 ? ('local' as const) : ('inherited' as const),
        hierarchyLevel,
        exists,
        isReadable,
        lastModified,
      };
    })
  );

  // Determine paths
  const claudeDir = path.join(projectDir, '.claude');
  const blockedMdPath = path.join(claudeDir, 'blocked.md');
  const claudeMdPath = path.join(projectDir, 'CLAUDE.md');

  // Check write permission to .claude directory
  let hasWritePermission = false;
  try {
    await fs.ensureDir(claudeDir);
    await fs.access(claudeDir, fs.constants.W_OK);
    hasWritePermission = true;
  } catch {
    hasWritePermission = false;
  }

  const enumerationTime = Date.now() - startTime;

  // Performance warning: enumeration should complete in <2s (SC-001)
  if (enumerationTime > 2000) {
    console.warn(
      `⚠️  Performance Warning: Enumeration took ${enumerationTime}ms (threshold: 2000ms). ` +
      `Consider optimizing project structure or reporting performance issue.`
    );
  }

  if (debug) {
    console.error(`[DEBUG] Enumeration completed in ${enumerationTime}ms`);
    console.error(`[DEBUG] Performance: ${mcpServers.length} servers + ${memoryFiles.length} files = ${enumerationTime}ms total`);
  }

  return {
    projectPath: projectDir,
    mcpServers,
    memoryFiles,
    agents,
    configSources,
    blockedItems,
    claudeDotClaudePath: (await fs.pathExists(claudeDir)) ? claudeDir : undefined,
    blockedMdPath: (await fs.pathExists(blockedMdPath)) ? blockedMdPath : undefined,
    claudeMdPath: (await fs.pathExists(claudeMdPath)) ? claudeMdPath : undefined,
    hasWritePermission,
    enumerationTime,
  };
}

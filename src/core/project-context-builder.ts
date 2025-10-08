/**
 * Project context builder that orchestrates loading and aggregation.
 * Loads MCP servers, memory files, and blocked items, then applies blocked state.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { ProjectContext, ConfigSource } from '../models';
import { loadMCPServers } from './config-loader';
import { loadMemoryFiles } from './memory-loader';
import { loadBlockedItems } from './blocked-manager';
import { getHierarchyLevel } from '../utils/path-utils';

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

  // Load all data sources in parallel
  const [mcpServers, memoryFiles, blockedItems] = await Promise.all([
    loadMCPServers(projectDir),
    loadMemoryFiles(projectDir),
    loadBlockedItems(projectDir),
  ]);

  if (debug) {
    console.error(`[DEBUG] Loaded ${mcpServers.length} MCP servers, ${memoryFiles.length} memory files, ${blockedItems.length} blocked items`);
  }

  // Create lookup maps for blocked items
  const blockedServerNames = new Set<string>();
  const blockedMemoryPaths = new Set<string>();

  for (const item of blockedItems) {
    if (item.type === 'mcp') {
      blockedServerNames.add(item.identifier);
    } else if (item.type === 'memory') {
      blockedMemoryPaths.add(item.identifier);
    }
  }

  // Apply blocked state to servers
  for (const server of mcpServers) {
    if (blockedServerNames.has(server.name)) {
      server.isBlocked = true;
      const blockedItem = blockedItems.find(
        (item) => item.type === 'mcp' && item.identifier === server.name
      );
      if (blockedItem) {
        server.blockedAt = blockedItem.blockedAt;
      }
    }
  }

  // Apply blocked state to memory files
  for (const file of memoryFiles) {
    // Check both name and relativePath for matches
    if (blockedMemoryPaths.has(file.name) || blockedMemoryPaths.has(file.relativePath)) {
      file.isBlocked = true;
      const blockedItem = blockedItems.find(
        (item) =>
          item.type === 'memory' &&
          (item.identifier === file.name || item.identifier === file.relativePath)
      );
      if (blockedItem) {
        file.blockedAt = blockedItem.blockedAt;
      }
    }
  }

  // Build config sources list (unique .claude.json paths)
  const configSourcePaths = new Set<string>();
  for (const server of mcpServers) {
    configSourcePaths.add(server.sourcePath);
  }

  const configSources: ConfigSource[] = await Promise.all(
    Array.from(configSourcePaths).map(async (sourcePath) => {
      const configPath = path.join(sourcePath, '.claude.json');
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
    configSources,
    blockedItems,
    claudeDotClaudePath: (await fs.pathExists(claudeDir)) ? claudeDir : undefined,
    blockedMdPath: (await fs.pathExists(blockedMdPath)) ? blockedMdPath : undefined,
    claudeMdPath: (await fs.pathExists(claudeMdPath)) ? claudeMdPath : undefined,
    hasWritePermission,
    enumerationTime,
  };
}

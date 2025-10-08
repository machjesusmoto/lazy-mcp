/**
 * Configuration loader for MCP servers from .claude.json files.
 * Walks directory hierarchy from current directory to home directory.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { MCPServer } from '../models';
import { walkHierarchy, getHierarchyLevel } from '../utils/path-utils';
import { safeReadJSON } from '../utils/json-parser';

/**
 * Load all MCP servers from .claude.json files in the hierarchy.
 * @param startDir - Starting directory (absolute path)
 * @returns Array of MCP servers with hierarchy metadata
 */
export async function loadMCPServers(startDir: string): Promise<MCPServer[]> {
  // Validate input
  if (!startDir || typeof startDir !== 'string') {
    throw new Error('startDir must be a non-empty string');
  }
  if (!path.isAbsolute(startDir)) {
    throw new Error('startDir must be an absolute path');
  }

  const serverMap = new Map<string, MCPServer>();

  for (const dir of walkHierarchy(startDir)) {
    const configPath = path.join(dir, '.claude.json');

    if (!(await fs.pathExists(configPath))) {
      continue;
    }

    const config = await safeReadJSON(configPath);
    if (!config || !config.mcpServers || typeof config.mcpServers !== 'object') {
      continue;
    }

    const hierarchyLevel = getHierarchyLevel(startDir, dir);

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      // Skip if server with this name already exists (child overrides parent)
      if (serverMap.has(name)) {
        continue;
      }

      const server = serverConfig as Record<string, unknown>;
      const mcpServer: MCPServer = {
        name,
        command: (server.command as string) || '',
        args: server.args as string[] | undefined,
        env: server.env as Record<string, string> | undefined,
        sourcePath: dir,
        sourceType: hierarchyLevel === 0 ? 'local' : 'inherited',
        hierarchyLevel,
        isBlocked: false,
      };

      serverMap.set(name, mcpServer);
    }
  }

  return Array.from(serverMap.values());
}

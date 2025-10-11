/**
 * Configuration loader for MCP servers using Claude Code's 3-scope hierarchy.
 *
 * Scopes (in precedence order):
 * 1. Local (private): ~/.claude.json with project-specific sections
 * 2. Project (shared): <project>/.mcp.json (version controlled)
 * 3. User (global): ~/.claude.json (applies to all projects)
 *
 * Reference: https://docs.claude.com/en/docs/claude-code/mcp#mcp-installation-scopes
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { MCPServer } from '../models';
import { safeReadJSON } from '../utils/json-parser';
import { estimateJsonTokens } from '../utils/token-estimator';

/**
 * Load all MCP servers from the 3-scope hierarchy.
 * @param projectDir - Project directory (absolute path)
 * @returns Array of MCP servers with scope metadata
 */
export async function loadMCPServers(projectDir: string): Promise<MCPServer[]> {
  // Validate input
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('projectDir must be a non-empty string');
  }
  if (!path.isAbsolute(projectDir)) {
    throw new Error('projectDir must be an absolute path');
  }

  const serverMap = new Map<string, MCPServer>();
  const homeDir = os.homedir();

  // Scope 1: Local (private) - ~/.claude.json with project-specific sections
  // This is loaded from user config but filtered to project-specific servers
  // Note: Claude Code stores this in ~/.claude.json with sections like:
  // { "mcpServers": {...}, "projects": { "/path/to/project": { "mcpServers": {...} } } }
  const userConfigPath = path.join(homeDir, '.claude.json');
  if (await fs.pathExists(userConfigPath)) {
    const userConfig = await safeReadJSON(userConfigPath);
    if (userConfig?.projects && typeof userConfig.projects === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON config structure is dynamic
      const projectConfig = (userConfig.projects as Record<string, any>)[projectDir];
      if (projectConfig?.mcpServers && typeof projectConfig.mcpServers === 'object') {
        for (const [name, serverConfig] of Object.entries(projectConfig.mcpServers)) {
          if (!serverMap.has(name)) {
            const server = serverConfig as Record<string, unknown>;
            const mcpServer: MCPServer = {
              name,
              command: (server.command as string) || '',
              args: server.args as string[] | undefined,
              env: server.env as Record<string, string> | undefined,
              sourcePath: userConfigPath,
              sourceType: 'local',
              hierarchyLevel: 0,
              isBlocked: false,
              estimatedTokens: estimateJsonTokens(server),
            };

            // Preserve v2.0.0 blocking metadata
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            if (server._mcpToggleBlocked) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
              (mcpServer as any)._mcpToggleBlocked = server._mcpToggleBlocked;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
              (mcpServer as any)._mcpToggleBlockedAt = server._mcpToggleBlockedAt;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
              (mcpServer as any)._mcpToggleOriginal = server._mcpToggleOriginal;
            }

            serverMap.set(name, mcpServer);
          }
        }
      }
    }
  }

  // Scope 2: Project (shared) - <project>/.mcp.json
  const projectConfigPath = path.join(projectDir, '.mcp.json');
  if (await fs.pathExists(projectConfigPath)) {
    const projectConfig = await safeReadJSON(projectConfigPath);
    if (projectConfig?.mcpServers && typeof projectConfig.mcpServers === 'object') {
      for (const [name, serverConfig] of Object.entries(projectConfig.mcpServers)) {
        if (!serverMap.has(name)) {
          const server = serverConfig as Record<string, unknown>;
          const mcpServer: MCPServer = {
            name,
            command: (server.command as string) || '',
            args: server.args as string[] | undefined,
            env: server.env as Record<string, string> | undefined,
            sourcePath: projectDir,
            sourceType: 'inherited',
            hierarchyLevel: 1,
            isBlocked: false,
            estimatedTokens: estimateJsonTokens(server),
          };

          // Preserve v2.0.0 blocking metadata
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
          if (server._mcpToggleBlocked) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            (mcpServer as any)._mcpToggleBlocked = server._mcpToggleBlocked;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            (mcpServer as any)._mcpToggleBlockedAt = server._mcpToggleBlockedAt;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            (mcpServer as any)._mcpToggleOriginal = server._mcpToggleOriginal;
          }

          serverMap.set(name, mcpServer);
        }
      }
    }
  }

  // Scope 3: User (global) - ~/.claude.json (top-level mcpServers)
  if (await fs.pathExists(userConfigPath)) {
    const userConfig = await safeReadJSON(userConfigPath);
    if (userConfig?.mcpServers && typeof userConfig.mcpServers === 'object') {
      for (const [name, serverConfig] of Object.entries(userConfig.mcpServers)) {
        if (!serverMap.has(name)) {
          const server = serverConfig as Record<string, unknown>;
          const mcpServer: MCPServer = {
            name,
            command: (server.command as string) || '',
            args: server.args as string[] | undefined,
            env: server.env as Record<string, string> | undefined,
            sourcePath: homeDir,
            sourceType: 'inherited',
            hierarchyLevel: 2,
            isBlocked: false,
            estimatedTokens: estimateJsonTokens(server),
          };

          // Preserve v2.0.0 blocking metadata
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
          if (server._mcpToggleBlocked) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            (mcpServer as any)._mcpToggleBlocked = server._mcpToggleBlocked;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            (mcpServer as any)._mcpToggleBlockedAt = server._mcpToggleBlockedAt;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata fields not in MCPServer interface
            (mcpServer as any)._mcpToggleOriginal = server._mcpToggleOriginal;
          }

          serverMap.set(name, mcpServer);
        }
      }
    }
  }

  return Array.from(serverMap.values());
}

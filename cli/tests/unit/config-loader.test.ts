import { loadMCPServers } from '../../src/core/config-loader';
import { createTempDir, cleanupTempDir } from '../helpers/test-utils';
import * as path from 'path';
import * as fs from 'fs-extra';

// Inline helper function to avoid module loading issues
async function createMockClaudeJson(
  dirPath: string,
  servers: Record<string, unknown>
): Promise<string> {
  await fs.ensureDir(dirPath);
  const filePath = path.join(dirPath, '.mcp.json'); // Use .mcp.json for v2.0.0
  const content = JSON.stringify({ mcpServers: servers }, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('config-loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('loadMCPServers', () => {
    it('should parse .mcp.json files correctly', async () => {
      await createMockClaudeJson(tempDir, {
        filesystem: {
          command: 'node',
          args: ['./fs.js'],
        },
      });

      const servers = await loadMCPServers(tempDir);

      // Filter for project-scoped servers (hierarchyLevel 1 from .mcp.json)
      const projectServers = servers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers).toHaveLength(1);
      expect(projectServers[0].name).toBe('filesystem');
      expect(projectServers[0].command).toBe('node');
      expect(projectServers[0].args).toEqual(['./fs.js']);
      expect(projectServers[0].hierarchyLevel).toBe(1);
      expect(projectServers[0].sourceType).toBe('inherited');
    });

    it('should load from 3 fixed scopes (not directory traversal)', async () => {
      // New hierarchy: 3 fixed scopes, not directory traversal
      // Scope 1: Local (private) - ~/.claude.json with project sections (hierarchyLevel 0)
      // Scope 2: Project (shared) - <project>/.mcp.json (hierarchyLevel 1)
      // Scope 3: User (global) - ~/.claude.json top-level (hierarchyLevel 2)

      await createMockClaudeJson(tempDir, {
        'project-server': { command: 'project-cmd' },
      });

      const servers = await loadMCPServers(tempDir);

      // Should have at least 1 project-scoped server (hierarchyLevel 1)
      const projectServers = servers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers.length).toBeGreaterThanOrEqual(1);
      expect(projectServers.find(s => s.name === 'project-server')).toBeDefined();
      expect(projectServers.find(s => s.name === 'project-server')?.command).toBe('project-cmd');

      // May also have user global servers (hierarchyLevel 2)
      // Note: userServers count depends on user's ~/.claude.json, so we don't check it
      // const userServers = servers.filter(s => s.hierarchyLevel === 2);
    });

    it('should respect precedence: local > project > user', async () => {
      // Test that the new 3-scope hierarchy respects precedence correctly
      // Scope precedence: Local (private) > Project (shared) > User (global)

      // Create a project-scoped server in .mcp.json
      await createMockClaudeJson(tempDir, {
        'test-server': { command: 'project-cmd' },
        'project-only': { command: 'project-exclusive' },
      });

      const servers = await loadMCPServers(tempDir);

      // Project-scoped servers should be loaded
      const projectServers = servers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers.find(s => s.name === 'test-server')).toBeDefined();
      expect(projectServers.find(s => s.name === 'test-server')?.command).toBe('project-cmd');
      expect(projectServers.find(s => s.name === 'project-only')).toBeDefined();

      // User global servers may also be present (hierarchyLevel 2)
      // but project servers take precedence by name
      const testServer = servers.find(s => s.name === 'test-server');
      expect(testServer?.hierarchyLevel).toBeLessThanOrEqual(1); // Not from user global (level 2)
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidPath = path.join(tempDir, '.mcp.json');
      await fs.writeFile(invalidPath, '{invalid json}', 'utf-8');

      const servers = await loadMCPServers(tempDir);

      // Should return only inherited servers (from user config), not throw
      // Project-scoped servers should be empty due to invalid JSON
      const projectServers = servers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers).toEqual([]);
    });

    it('should handle missing files gracefully', async () => {
      // No .mcp.json created in project
      const servers = await loadMCPServers(tempDir);

      // Should still load user global servers (hierarchyLevel 2)
      // but no project-scoped servers (hierarchyLevel 1)
      const projectServers = servers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers).toEqual([]);
    });

    it('should handle missing mcpServers key', async () => {
      await fs.writeFile(path.join(tempDir, '.mcp.json'), '{"other": "data"}', 'utf-8');

      const servers = await loadMCPServers(tempDir);

      // Should have no project-scoped servers (hierarchyLevel 1)
      const projectServers = servers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers).toEqual([]);
    });

    it('should set isBlocked to false by default', async () => {
      await createMockClaudeJson(tempDir, {
        filesystem: { command: 'node' },
      });

      const servers = await loadMCPServers(tempDir);

      expect(servers[0].isBlocked).toBe(false);
      expect(servers[0].blockedAt).toBeUndefined();
    });
  });
});

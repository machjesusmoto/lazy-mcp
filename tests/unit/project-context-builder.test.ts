import { buildProjectContext } from '../../src/core/project-context-builder';
import { computeStats } from '../../src/models/project-context';
import { createTempDir, cleanupTempDir, createMockMemoryFiles } from '../helpers/test-utils';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock os.homedir to use test directory
// eslint-disable-next-line @typescript-eslint/no-var-requires
const osActual = require('os');
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => osActual.tmpdir()),
}));

// Inline v2.0.0 helper functions to avoid module loading issues
async function createMockMcpJson(
  dirPath: string,
  servers: Record<string, unknown>
): Promise<string> {
  await fs.ensureDir(dirPath);
  const filePath = path.join(dirPath, '.mcp.json');
  const content = JSON.stringify({ mcpServers: servers }, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

async function createBlockedServers(
  dirPath: string,
  serverNames: string[]
): Promise<void> {
  const mcpJsonPath = path.join(dirPath, '.mcp.json');

  // Read existing config or create new one
  let config: Record<string, unknown> = { mcpServers: {} };
  try {
    const content = await fs.readFile(mcpJsonPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    // File doesn't exist, use default
  }

  const mcpServers = config.mcpServers as Record<string, unknown>;

  // Add dummy echo overrides for blocked servers
  for (const serverName of serverNames) {
    mcpServers[serverName] = {
      command: 'echo',
      args: [`[mcp-toggle] Server '${serverName}' is blocked`],
      _mcpToggleBlocked: true,
      _mcpToggleBlockedAt: new Date().toISOString(),
      _mcpToggleOriginal: {
        command: 'node',
        args: ['./dummy.js'],
      },
    };
  }

  await fs.writeFile(mcpJsonPath, JSON.stringify(config, null, 2), 'utf-8');
}

async function createBlockedMemoryFiles(
  dirPath: string,
  filenames: string[]
): Promise<void> {
  const memoriesDir = path.join(dirPath, '.claude', 'memories');
  await fs.ensureDir(memoriesDir);

  for (const filename of filenames) {
    const blockedPath = path.join(memoriesDir, `${filename}.blocked`);
    await fs.ensureDir(path.dirname(blockedPath));
    await fs.writeFile(blockedPath, '# Blocked memory file', 'utf-8');
  }
}

describe('project-context-builder', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('buildProjectContext', () => {
    it('should load all MCP servers and memory files', async () => {
      await createMockMcpJson(tempDir, {
        filesystem: { command: 'node', args: ['./fs.js'] },
        sequential: { command: 'node', args: ['./seq.js'] },
      });

      await createMockMemoryFiles(tempDir, {
        'test1.md': '# Test 1',
        'test2.md': '# Test 2',
      });

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      // Filter to only project-scoped servers (hierarchyLevel 1 from .mcp.json)
      const projectServers = context.mcpServers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers).toHaveLength(2);
      expect(context.memoryFiles).toHaveLength(2);
      expect(context.blockedItems).toHaveLength(0);
      // Stats count all servers including inherited ones
      expect(stats.totalMcpServers).toBeGreaterThanOrEqual(2);
      expect(stats.totalMemoryFiles).toBe(2);
      expect(stats.blockedMcpServers).toBe(0);
      expect(stats.blockedMemoryFiles).toBe(0);
    });

    it('should apply blocked state to servers', async () => {
      // Create unblocked server first
      await createMockMcpJson(tempDir, {
        sequential: { command: 'node' },
      });

      // Then add blocked server using v2.0.0 mechanism (dummy echo override)
      await createBlockedServers(tempDir, ['filesystem']);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      // Filter to project-scoped servers only (hierarchyLevel 1 from .mcp.json)
      const projectServers = context.mcpServers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers.length).toBeGreaterThanOrEqual(2);

      const fsServer = context.mcpServers.find((s) => s.name === 'filesystem');
      const seqServer = context.mcpServers.find((s) => s.name === 'sequential');

      expect(fsServer?.isBlocked).toBe(true);
      expect(fsServer?.blockedAt).toBeDefined();
      expect(seqServer?.isBlocked).toBe(false);
      expect(stats.blockedMcpServers).toBeGreaterThanOrEqual(1);
    });

    it('should apply blocked state to memory files', async () => {
      // Create unblocked file
      await createMockMemoryFiles(tempDir, {
        'test2.md': '# Test 2',
      });

      // Create blocked file using v2.0.0 mechanism (.md.blocked extension)
      await createBlockedMemoryFiles(tempDir, ['test1.md']);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(context.memoryFiles.length).toBeGreaterThanOrEqual(2);
      const test1 = context.memoryFiles.find((f) => f.name === 'test1.md.blocked');
      const test2 = context.memoryFiles.find((f) => f.name === 'test2.md');

      expect(test1?.isBlocked).toBe(true);
      expect(test1?.blockedAt).toBeDefined();
      expect(test2?.isBlocked).toBe(false);
      expect(stats.blockedMemoryFiles).toBeGreaterThanOrEqual(1);
    });

    it('should handle nested memory file paths in blocked state', async () => {
      // Create blocked file using v2.0.0 mechanism
      await createBlockedMemoryFiles(tempDir, ['subdir/nested.md']);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      const nested = context.memoryFiles.find((f) => f.relativePath === 'subdir/nested.md.blocked');
      expect(nested?.isBlocked).toBe(true);
      expect(stats.blockedMemoryFiles).toBeGreaterThanOrEqual(1);
    });

    it('should calculate statistics correctly', async () => {
      // Create unblocked server
      await createMockMcpJson(tempDir, {
        server3: { command: 'node' },
      });

      // Create blocked servers using v2.0.0 mechanism
      await createBlockedServers(tempDir, ['server1', 'server2']);

      // Create unblocked memory file
      await createMockMemoryFiles(tempDir, {
        'file2.md': 'Content 2',
      });

      // Create blocked memory file using v2.0.0 mechanism
      await createBlockedMemoryFiles(tempDir, ['file1.md']);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      // Filter to project-scoped servers only for accurate counting
      const projectServers = context.mcpServers.filter(s => s.hierarchyLevel === 1);
      expect(projectServers.length).toBeGreaterThanOrEqual(3);
      expect(stats.blockedMcpServers).toBeGreaterThanOrEqual(2);
      expect(stats.totalMemoryFiles).toBeGreaterThanOrEqual(2);
      expect(stats.blockedMemoryFiles).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty project (no project-scoped servers, no memory files)', async () => {
      const context = await buildProjectContext(tempDir);
      // stats is computed but not used in this specific test
      // const _stats = computeStats(context);

      // Empty project should have no project-scoped items, but may have inherited items
      const projectServers = context.mcpServers.filter(s => s.hierarchyLevel === 1);
      const projectMemories = context.memoryFiles.filter(f => f.hierarchyLevel === 0);

      expect(projectServers).toEqual([]);
      expect(projectMemories).toEqual([]);
      expect(context.blockedItems).toEqual([]);
    });

    it('should handle blocked items with no matching servers/files', async () => {
      // Create an unblocked server
      await createMockMcpJson(tempDir, {
        existing: { command: 'node' },
      });

      // Create blocked entries for servers that don't exist (this would be unusual in v2.0.0)
      // In v2.0.0, blocked items are detected from actual .mcp.json entries and .md.blocked files
      // So this test now verifies that blocking nonexistent items doesn't cause errors
      await createBlockedServers(tempDir, ['nonexistent-server']);
      await createBlockedMemoryFiles(tempDir, ['nonexistent-file.md']);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      // The nonexistent server shows up as a blocked server in .mcp.json
      expect(stats.blockedMcpServers).toBeGreaterThanOrEqual(1);
      // The blocked memory file shows up
      expect(stats.blockedMemoryFiles).toBeGreaterThanOrEqual(1);
      expect(context.blockedItems.length).toBeGreaterThanOrEqual(2);
    });
  });
});

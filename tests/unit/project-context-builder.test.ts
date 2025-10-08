import { buildProjectContext } from '../../src/core/project-context-builder';
import { computeStats } from '../../src/models/project-context';
import { createTempDir, cleanupTempDir, createMockClaudeJson, createMockMemoryFiles, createMockBlockedMd } from '../helpers/test-utils';

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
      await createMockClaudeJson(tempDir, {
        filesystem: { command: 'node', args: ['./fs.js'] },
        sequential: { command: 'node', args: ['./seq.js'] },
      });

      await createMockMemoryFiles(tempDir, {
        'test1.md': '# Test 1',
        'test2.md': '# Test 2',
      });

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(context.mcpServers).toHaveLength(2);
      expect(context.memoryFiles).toHaveLength(2);
      expect(context.blockedItems).toHaveLength(0);
      expect(stats.totalMcpServers).toBe(2);
      expect(stats.totalMemoryFiles).toBe(2);
      expect(stats.blockedMcpServers).toBe(0);
      expect(stats.blockedMemoryFiles).toBe(0);
    });

    it('should apply blocked state to servers', async () => {
      await createMockClaudeJson(tempDir, {
        filesystem: { command: 'node' },
        sequential: { command: 'node' },
      });

      await createMockBlockedMd(tempDir, [
        { type: 'mcp', identifier: 'filesystem' },
      ]);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(context.mcpServers).toHaveLength(2);
      const fsServer = context.mcpServers.find((s) => s.name === 'filesystem');
      const seqServer = context.mcpServers.find((s) => s.name === 'sequential');

      expect(fsServer?.isBlocked).toBe(true);
      expect(fsServer?.blockedAt).toBeDefined();
      expect(seqServer?.isBlocked).toBe(false);
      expect(stats.blockedMcpServers).toBe(1);
    });

    it('should apply blocked state to memory files', async () => {
      await createMockMemoryFiles(tempDir, {
        'test1.md': '# Test 1',
        'test2.md': '# Test 2',
      });

      await createMockBlockedMd(tempDir, [
        { type: 'memory', identifier: 'test1.md' },
      ]);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(context.memoryFiles).toHaveLength(2);
      const test1 = context.memoryFiles.find((f) => f.name === 'test1.md');
      const test2 = context.memoryFiles.find((f) => f.name === 'test2.md');

      expect(test1?.isBlocked).toBe(true);
      expect(test1?.blockedAt).toBeDefined();
      expect(test2?.isBlocked).toBe(false);
      expect(stats.blockedMemoryFiles).toBe(1);
    });

    it('should handle nested memory file paths in blocked state', async () => {
      await createMockMemoryFiles(tempDir, {
        'subdir/nested.md': '# Nested',
      });

      await createMockBlockedMd(tempDir, [
        { type: 'memory', identifier: 'subdir/nested.md' },
      ]);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      const nested = context.memoryFiles.find((f) => f.relativePath === 'subdir/nested.md');
      expect(nested?.isBlocked).toBe(true);
      expect(stats.blockedMemoryFiles).toBe(1);
    });

    it('should calculate statistics correctly', async () => {
      await createMockClaudeJson(tempDir, {
        server1: { command: 'node' },
        server2: { command: 'node' },
        server3: { command: 'node' },
      });

      await createMockMemoryFiles(tempDir, {
        'file1.md': 'Content 1',
        'file2.md': 'Content 2',
      });

      await createMockBlockedMd(tempDir, [
        { type: 'mcp', identifier: 'server1' },
        { type: 'mcp', identifier: 'server2' },
        { type: 'memory', identifier: 'file1.md' },
      ]);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(stats.totalMcpServers).toBe(3);
      expect(stats.blockedMcpServers).toBe(2);
      expect(stats.totalMemoryFiles).toBe(2);
      expect(stats.blockedMemoryFiles).toBe(1);
    });

    it('should handle empty project (no servers, no memory files)', async () => {
      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(context.mcpServers).toEqual([]);
      expect(context.memoryFiles).toEqual([]);
      expect(context.blockedItems).toEqual([]);
      expect(stats.totalMcpServers).toBe(0);
      expect(stats.blockedMcpServers).toBe(0);
      expect(stats.totalMemoryFiles).toBe(0);
      expect(stats.blockedMemoryFiles).toBe(0);
    });

    it('should handle blocked items with no matching servers/files', async () => {
      await createMockClaudeJson(tempDir, {
        existing: { command: 'node' },
      });

      await createMockBlockedMd(tempDir, [
        { type: 'mcp', identifier: 'nonexistent-server' },
        { type: 'memory', identifier: 'nonexistent-file.md' },
      ]);

      const context = await buildProjectContext(tempDir);
      const stats = computeStats(context);

      expect(stats.blockedMcpServers).toBe(0);
      expect(stats.blockedMemoryFiles).toBe(0);
      expect(context.blockedItems).toHaveLength(2);
    });
  });
});

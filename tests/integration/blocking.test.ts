/**
 * Integration test for blocking workflow (User Story 2).
 * Tests the complete toggle, save, and persistence workflow.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { buildProjectContext } from '../../src/core/project-context-builder';
import { saveBlockedItems, loadBlockedItems } from '../../src/core/blocked-manager';
import { computeStats } from '../../src/models/project-context';
import {
  createTempDir,
  cleanupTempDir,
  createMockClaudeJson,
  createMockMemoryFiles,
} from '../helpers/test-utils';

describe('Blocking Workflow (User Story 2)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should block MCP server: toggle → save → verify blocked.md', async () => {
    // Setup: Create project with servers
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node', args: ['fs.js'] },
      sequential: { command: 'node', args: ['seq.js'] },
    });

    // Act: Block filesystem server
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Assert: Verify blocked.md created
    const blockedMdPath = path.join(tempDir, '.claude', 'blocked.md');
    expect(await fs.pathExists(blockedMdPath)).toBe(true);

    const content = await fs.readFile(blockedMdPath, 'utf-8');
    expect(content).toContain('mcp:filesystem');
    expect(content).not.toContain('sequential');

    // Assert: Verify state persists on reload
    const context = await buildProjectContext(tempDir);
    const fsServer = context.mcpServers.find((s) => s.name === 'filesystem');
    const seqServer = context.mcpServers.find((s) => s.name === 'sequential');

    expect(fsServer?.isBlocked).toBe(true);
    expect(seqServer?.isBlocked).toBe(false);
  });

  it('should block memory file: toggle → save → verify blocked.md', async () => {
    // Setup: Create project with memory files
    await createMockMemoryFiles(tempDir, {
      'important.md': '# Important Notes',
      'archive.md': '# Old Archive',
    });

    // Act: Block archive file
    await saveBlockedItems(tempDir, [
      {
        type: 'memory',
        identifier: 'archive.md',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Assert: Verify blocked.md created
    const blockedMdPath = path.join(tempDir, '.claude', 'blocked.md');
    const content = await fs.readFile(blockedMdPath, 'utf-8');
    expect(content).toContain('memory:archive.md');
    expect(content).not.toContain('important.md');

    // Assert: Verify state persists on reload
    const context = await buildProjectContext(tempDir);
    const important = context.memoryFiles.find((f) => f.name === 'important.md');
    const archive = context.memoryFiles.find((f) => f.name === 'archive.md');

    expect(important?.isBlocked).toBe(false);
    expect(archive?.isBlocked).toBe(true);
  });

  it('should unblock items: toggle back → save → verify removed from blocked.md', async () => {
    // Setup: Create project with blocked items
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
      sequential: { command: 'node' },
    });

    await createMockMemoryFiles(tempDir, {
      'notes.md': 'Content',
    });

    // Block items
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
      {
        type: 'memory',
        identifier: 'notes.md',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Verify blocked
    let context = await buildProjectContext(tempDir);
    expect(context.mcpServers.find((s) => s.name === 'filesystem')?.isBlocked).toBe(true);
    expect(context.memoryFiles.find((f) => f.name === 'notes.md')?.isBlocked).toBe(true);

    // Act: Unblock filesystem (keep notes.md blocked)
    await saveBlockedItems(tempDir, [
      {
        type: 'memory',
        identifier: 'notes.md',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Assert: Verify filesystem unblocked
    context = await buildProjectContext(tempDir);
    expect(context.mcpServers.find((s) => s.name === 'filesystem')?.isBlocked).toBe(false);
    expect(context.memoryFiles.find((f) => f.name === 'notes.md')?.isBlocked).toBe(true);

    const content = await fs.readFile(path.join(tempDir, '.claude', 'blocked.md'), 'utf-8');
    expect(content).not.toContain('mcp:filesystem');
    expect(content).toContain('memory:notes.md');
  });

  it('should unblock all items: empty list → save → verify blocked.md empty', async () => {
    // Setup: Create project with blocked items
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
    });

    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Verify blocked
    let context = await buildProjectContext(tempDir);
    expect(context.mcpServers.find((s) => s.name === 'filesystem')?.isBlocked).toBe(true);

    // Act: Unblock all
    await saveBlockedItems(tempDir, []);

    // Assert: No blocked items
    context = await buildProjectContext(tempDir);
    expect(context.mcpServers.every((s) => !s.isBlocked)).toBe(true);

    const blockedItems = await loadBlockedItems(tempDir);
    expect(blockedItems).toHaveLength(0);
  });

  it('should handle .claude/ directory creation if missing', async () => {
    // Setup: Ensure .claude doesn't exist
    const claudeDir = path.join(tempDir, '.claude');
    expect(await fs.pathExists(claudeDir)).toBe(false);

    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
    });

    // Act: Block item (should create directory)
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Assert: Directory created
    expect(await fs.pathExists(claudeDir)).toBe(true);

    // Assert: blocked.md created inside
    const blockedMdPath = path.join(claudeDir, 'blocked.md');
    expect(await fs.pathExists(blockedMdPath)).toBe(true);

    // Verify contents
    const context = await buildProjectContext(tempDir);
    expect(context.mcpServers.find((s) => s.name === 'filesystem')?.isBlocked).toBe(true);
  });

  it('should persist state across multiple save/load cycles', async () => {
    // Setup
    await createMockClaudeJson(tempDir, {
      server1: { command: 'cmd1' },
      server2: { command: 'cmd2' },
      server3: { command: 'cmd3' },
    });

    // Cycle 1: Block server1
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'server1',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    let context = await buildProjectContext(tempDir);
    let stats = computeStats(context);
    expect(stats.blockedMcpServers).toBe(1);

    // Cycle 2: Block server2 (server1 still blocked)
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'server1',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
      {
        type: 'mcp',
        identifier: 'server2',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    context = await buildProjectContext(tempDir);
    stats = computeStats(context);
    expect(stats.blockedMcpServers).toBe(2);

    // Cycle 3: Unblock server1
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'server2',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    context = await buildProjectContext(tempDir);
    stats = computeStats(context);
    expect(stats.blockedMcpServers).toBe(1);
    expect(context.mcpServers.find((s) => s.name === 'server1')?.isBlocked).toBe(false);
    expect(context.mcpServers.find((s) => s.name === 'server2')?.isBlocked).toBe(true);
    expect(context.mcpServers.find((s) => s.name === 'server3')?.isBlocked).toBe(false);
  });

  it('should handle mixed blocking: servers and memory files together', async () => {
    // Setup
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
      sequential: { command: 'node' },
    });

    await createMockMemoryFiles(tempDir, {
      'file1.md': 'Content 1',
      'file2.md': 'Content 2',
    });

    // Act: Block one server and one memory file
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
      {
        type: 'memory',
        identifier: 'file1.md',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Assert: Both types blocked correctly
    const context = await buildProjectContext(tempDir);
    const stats = computeStats(context);

    expect(stats.blockedMcpServers).toBe(1);
    expect(stats.blockedMemoryFiles).toBe(1);
    expect(stats.totalMcpServers).toBe(2);
    expect(stats.totalMemoryFiles).toBe(2);

    // Verify specific items
    expect(context.mcpServers.find((s) => s.name === 'filesystem')?.isBlocked).toBe(true);
    expect(context.mcpServers.find((s) => s.name === 'sequential')?.isBlocked).toBe(false);
    expect(context.memoryFiles.find((f) => f.name === 'file1.md')?.isBlocked).toBe(true);
    expect(context.memoryFiles.find((f) => f.name === 'file2.md')?.isBlocked).toBe(false);
  });
});

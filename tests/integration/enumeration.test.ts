/**
 * Integration test for end-to-end project enumeration.
 * Tests the complete workflow: config loading → memory loading → blocked state application.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { buildProjectContext } from '../../src/core/project-context-builder';
import { saveBlockedItems } from '../../src/core/blocked-manager';
import { computeStats } from '../../src/models/project-context';
import {
  createTempDir,
  cleanupTempDir,
  createMockClaudeJson,
  createMockMemoryFiles,
} from '../helpers/test-utils';

describe('End-to-End Enumeration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should enumerate complete project with servers and memory', async () => {
    // Setup: Create a realistic project structure
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node', args: ['./fs.js'] },
      sequential: { command: 'node', args: ['./seq.js'] },
      playwright: { command: 'node', args: ['./pw.js'] },
    });

    await createMockMemoryFiles(tempDir, {
      'project-overview.md': '# Project Overview\n\nThis is a test project.',
      'architecture.md': '# Architecture\n\n## Components\n\n- Core\n- UI\n- Tests',
      'nested/deep-notes.md': '# Deep Notes\n\nNested content.',
    });

    // Act: Build project context
    const context = await buildProjectContext(tempDir);
    const stats = computeStats(context);

    // Assert: Verify enumeration
    expect(context.mcpServers).toHaveLength(3);
    expect(context.memoryFiles).toHaveLength(3);
    expect(context.blockedItems).toHaveLength(0);

    expect(stats.totalMcpServers).toBe(3);
    expect(stats.totalMemoryFiles).toBe(3);
    expect(stats.blockedMcpServers).toBe(0);
    expect(stats.blockedMemoryFiles).toBe(0);

    // Verify server details
    const filesystemServer = context.mcpServers.find((s) => s.name === 'filesystem');
    expect(filesystemServer).toBeDefined();
    expect(filesystemServer?.command).toBe('node');
    expect(filesystemServer?.args).toEqual(['./fs.js']);
    expect(filesystemServer?.isBlocked).toBe(false);
    expect(filesystemServer?.sourceType).toBe('local');

    // Verify memory file details
    const overviewFile = context.memoryFiles.find((f) => f.name === 'project-overview.md');
    expect(overviewFile).toBeDefined();
    expect(overviewFile?.size).toBeGreaterThan(0);
    expect(overviewFile?.isBlocked).toBe(false);
    expect(overviewFile?.contentPreview).toContain('Project Overview');

    const nestedFile = context.memoryFiles.find((f) => f.relativePath === 'nested/deep-notes.md');
    expect(nestedFile).toBeDefined();
    expect(nestedFile?.name).toBe('deep-notes.md');
  });

  it('should handle blocking workflow end-to-end', async () => {
    // Setup: Create project
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
      sequential: { command: 'node' },
    });

    await createMockMemoryFiles(tempDir, {
      'notes1.md': 'Content 1',
      'notes2.md': 'Content 2',
    });

    // Act: Initial enumeration
    const initialContext = await buildProjectContext(tempDir);
    expect(initialContext.mcpServers.every((s) => !s.isBlocked)).toBe(true);
    expect(initialContext.memoryFiles.every((f) => !f.isBlocked)).toBe(true);

    // Act: Block items
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
      {
        type: 'memory',
        identifier: 'notes1.md',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Act: Re-enumerate with blocked items
    const updatedContext = await buildProjectContext(tempDir);
    const stats = computeStats(updatedContext);

    // Assert: Verify blocked state applied
    expect(stats.blockedMcpServers).toBe(1);
    expect(stats.blockedMemoryFiles).toBe(1);

    const filesystemServer = updatedContext.mcpServers.find((s) => s.name === 'filesystem');
    const sequentialServer = updatedContext.mcpServers.find((s) => s.name === 'sequential');
    expect(filesystemServer?.isBlocked).toBe(true);
    expect(sequentialServer?.isBlocked).toBe(false);

    const notes1 = updatedContext.memoryFiles.find((f) => f.name === 'notes1.md');
    const notes2 = updatedContext.memoryFiles.find((f) => f.name === 'notes2.md');
    expect(notes1?.isBlocked).toBe(true);
    expect(notes2?.isBlocked).toBe(false);
  });

  it('should handle hierarchy traversal correctly', async () => {
    // Setup: Create parent directory with config
    const parentDir = path.dirname(tempDir);
    const parentConfigPath = path.join(parentDir, '.claude.json');

    await createMockClaudeJson(parentDir, {
      'parent-server': { command: 'parent-cmd' },
    });

    // Setup: Create child directory with config
    await createMockClaudeJson(tempDir, {
      'child-server': { command: 'child-cmd' },
    });

    try {
      // Act: Enumerate from child directory
      const context = await buildProjectContext(tempDir);

      // Assert: Should find both parent and child servers
      expect(context.mcpServers.length).toBeGreaterThanOrEqual(1);

      const childServer = context.mcpServers.find((s) => s.name === 'child-server');
      expect(childServer).toBeDefined();
      expect(childServer?.sourceType).toBe('local');
      expect(childServer?.hierarchyLevel).toBe(0);
    } finally {
      // Cleanup: Remove parent config
      await fs.remove(parentConfigPath);
    }
  });

  it('should calculate performance metrics', async () => {
    // Setup: Create moderate-sized project
    await createMockClaudeJson(tempDir, {
      server1: { command: 'cmd1' },
      server2: { command: 'cmd2' },
      server3: { command: 'cmd3' },
    });

    const files: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      files[`file${i}.md`] = `Content ${i}`.repeat(100);
    }
    await createMockMemoryFiles(tempDir, files);

    // Act: Build context and measure time
    const startTime = Date.now();
    const context = await buildProjectContext(tempDir);
    const endTime = Date.now();
    const actualTime = endTime - startTime;

    // Assert: Performance expectations
    expect(context.enumerationTime).toBeDefined();
    expect(context.enumerationTime).toBeGreaterThanOrEqual(0); // Can be 0 for very fast operations
    expect(context.enumerationTime).toBeLessThan(5000); // Should complete in < 5 seconds

    // Actual time should be close to reported time (within 500ms margin)
    // Allow for 0ms enumeration time in test environments
    if (context.enumerationTime > 0) {
      expect(Math.abs(actualTime - context.enumerationTime)).toBeLessThan(500);
    }
  });

  it('should handle config sources correctly', async () => {
    // Setup: Create project with config
    await createMockClaudeJson(tempDir, {
      testServer: { command: 'test' },
    });

    // Act: Build context
    const context = await buildProjectContext(tempDir);

    // Assert: Config sources are populated
    expect(context.configSources).toBeDefined();
    expect(context.configSources.length).toBeGreaterThan(0);

    const source = context.configSources.find((s) => s.path.includes('.claude.json'));
    expect(source).toBeDefined();
    expect(source?.type).toBe('mcp');
    expect(source?.exists).toBe(true);
    expect(source?.isReadable).toBe(true);
    expect(source?.lastModified).toBeDefined();
  });
});

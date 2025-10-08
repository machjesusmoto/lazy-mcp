/**
 * Integration test for CLAUDE.md integration workflow (User Story 3).
 * Tests the complete save + CLAUDE.md update workflow.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { buildProjectContext } from '../../src/core/project-context-builder';
import { saveBlockedItems } from '../../src/core/blocked-manager';
import { updateClaudeMd, hasIntegration } from '../../src/core/claude-md-updater';
import {
  createTempDir,
  cleanupTempDir,
  createMockClaudeJson,
  createMockMemoryFiles,
} from '../helpers/test-utils';

describe('Claude.md Integration Workflow (User Story 3)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should create CLAUDE.md on first save', async () => {
    // Setup: Create project
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
    });

    // Act: Block item and save
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    await updateClaudeMd(tempDir);

    // Assert: CLAUDE.md created
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    expect(await fs.pathExists(claudeMdPath)).toBe(true);

    const content = await fs.readFile(claudeMdPath, 'utf-8');

    // Verify integration markers
    expect(content).toContain('<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->');
    expect(content).toContain('<!-- End MCP Toggle Integration -->');

    // Verify instructions
    expect(content).toContain('# MCP Server and Memory Control');
    expect(content).toContain('Read `.claude/blocked.md` if it exists');
    expect(content).toContain('npx mcp-toggle');
  });

  it('should append integration to existing CLAUDE.md', async () => {
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');

    // Setup: Create existing CLAUDE.md
    const existingContent = `# My Project

This project uses Claude Code for development.

## Instructions

- Use TypeScript
- Write tests
`;

    await fs.writeFile(claudeMdPath, existingContent, 'utf-8');

    // Act: Update CLAUDE.md
    await updateClaudeMd(tempDir);

    const updatedContent = await fs.readFile(claudeMdPath, 'utf-8');

    // Assert: Original content preserved
    expect(updatedContent).toContain('# My Project');
    expect(updatedContent).toContain('Use TypeScript');

    // Assert: Integration appended
    expect(updatedContent).toContain('<!-- MCP Toggle Integration');
    expect(hasIntegration(updatedContent)).toBe(true);

    // Assert: Integration at the end
    const lines = updatedContent.split('\n');
    const lastNonEmptyLine = lines.filter((l) => l.trim().length > 0).pop();
    expect(lastNonEmptyLine).toContain('<!-- End MCP Toggle Integration -->');
  });

  it('should be idempotent (no duplicate integration)', async () => {
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');

    // Act: First update
    await updateClaudeMd(tempDir);
    const contentAfterFirst = await fs.readFile(claudeMdPath, 'utf-8');

    // Act: Second update
    await updateClaudeMd(tempDir);
    const contentAfterSecond = await fs.readFile(claudeMdPath, 'utf-8');

    // Assert: Content identical
    expect(contentAfterSecond).toBe(contentAfterFirst);

    // Assert: Only one integration block
    const markerCount = (contentAfterSecond.match(/<!-- MCP Toggle Integration/g) || []).length;
    expect(markerCount).toBe(1);
  });

  it('should preserve existing HTML comments in CLAUDE.md', async () => {
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');

    const existingContent = `# Project

<!-- This is my important comment -->
Some content.

<!-- Another comment about architecture -->
More content.
`;

    await fs.writeFile(claudeMdPath, existingContent, 'utf-8');

    await updateClaudeMd(tempDir);

    const updatedContent = await fs.readFile(claudeMdPath, 'utf-8');

    // Assert: Original comments preserved
    expect(updatedContent).toContain('<!-- This is my important comment -->');
    expect(updatedContent).toContain('<!-- Another comment about architecture -->');

    // Assert: Integration added
    expect(hasIntegration(updatedContent)).toBe(true);
  });

  it('should handle complete workflow: block → save → claude.md update', async () => {
    // Setup: Create project with servers and memory
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
      sequential: { command: 'node' },
    });

    await createMockMemoryFiles(tempDir, {
      'notes.md': 'My notes',
      'archive.md': 'Old data',
    });

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
        identifier: 'notes.md',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    // Act: Update CLAUDE.md
    await updateClaudeMd(tempDir);

    // Assert: blocked.md exists with correct content
    const blockedMdPath = path.join(tempDir, '.claude', 'blocked.md');
    const blockedContent = await fs.readFile(blockedMdPath, 'utf-8');
    expect(blockedContent).toContain('mcp:filesystem');
    expect(blockedContent).toContain('memory:notes.md');

    // Assert: CLAUDE.md exists with integration
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    const claudeContent = await fs.readFile(claudeMdPath, 'utf-8');
    expect(hasIntegration(claudeContent)).toBe(true);

    // Assert: Integration has correct instructions
    expect(claudeContent).toContain('Read `.claude/blocked.md`');
    expect(claudeContent).toContain('For each line prefixed with `mcp:`, skip loading that MCP server');
    expect(claudeContent).toContain('For each line prefixed with `memory:`, skip loading that memory file');

    // Assert: Integration references mcp-toggle
    expect(claudeContent).toContain('npx mcp-toggle');
  });

  it('should handle error when directory is read-only', async () => {
    // Create a read-only directory
    const readOnlyDir = path.join(tempDir, 'readonly');
    await fs.ensureDir(readOnlyDir);
    await fs.chmod(readOnlyDir, 0o555);

    // Act & Assert: Should throw error
    await expect(updateClaudeMd(readOnlyDir)).rejects.toThrow(/EACCES|permission denied/i);

    // Clean up - restore permissions
    await fs.chmod(readOnlyDir, 0o755);
  });

  it('should integrate with project context reload', async () => {
    // Setup: Create project
    await createMockClaudeJson(tempDir, {
      filesystem: { command: 'node' },
    });

    // Act: Block server, save, update claude.md
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'filesystem',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);

    await updateClaudeMd(tempDir);

    // Reload project context
    const context = await buildProjectContext(tempDir);

    // Assert: Server shows as blocked
    const fsServer = context.mcpServers.find((s) => s.name === 'filesystem');
    expect(fsServer?.isBlocked).toBe(true);

    // Assert: CLAUDE.md has integration
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    const claudeContent = await fs.readFile(claudeMdPath, 'utf-8');
    expect(hasIntegration(claudeContent)).toBe(true);
  });

  it('should work correctly with empty project (no servers/memory)', async () => {
    // Setup: Empty project
    // No .claude.json, no memory files

    // Act: Save empty blocked list
    await saveBlockedItems(tempDir, []);

    // Act: Update CLAUDE.md
    await updateClaudeMd(tempDir);

    // Assert: CLAUDE.md created with integration
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    expect(await fs.pathExists(claudeMdPath)).toBe(true);

    const content = await fs.readFile(claudeMdPath, 'utf-8');
    expect(hasIntegration(content)).toBe(true);
  });

  it('should preserve file permissions (644)', async () => {
    await updateClaudeMd(tempDir);

    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    const stats = await fs.stat(claudeMdPath);

    // 644 = owner read/write, group/others read
    expect((stats.mode & 0o644) === 0o644).toBe(true);
  });

  it('should handle multiple save cycles with CLAUDE.md updates', async () => {
    await createMockClaudeJson(tempDir, {
      server1: { command: 'cmd1' },
      server2: { command: 'cmd2' },
    });

    // Cycle 1: Block server1, update claude.md
    await saveBlockedItems(tempDir, [
      {
        type: 'mcp',
        identifier: 'server1',
        blockedAt: new Date(),
        blockedBy: 'mcp-toggle',
      },
    ]);
    await updateClaudeMd(tempDir);

    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    const content1 = await fs.readFile(claudeMdPath, 'utf-8');

    // Cycle 2: Block server2 as well, update again
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
    await updateClaudeMd(tempDir);

    const content2 = await fs.readFile(claudeMdPath, 'utf-8');

    // Cycle 3: Unblock all, update again
    await saveBlockedItems(tempDir, []);
    await updateClaudeMd(tempDir);

    const content3 = await fs.readFile(claudeMdPath, 'utf-8');

    // Assert: Integration present in all cycles
    expect(hasIntegration(content1)).toBe(true);
    expect(hasIntegration(content2)).toBe(true);
    expect(hasIntegration(content3)).toBe(true);

    // Assert: No duplication across cycles
    expect((content1.match(/<!-- MCP Toggle Integration/g) || []).length).toBe(1);
    expect((content2.match(/<!-- MCP Toggle Integration/g) || []).length).toBe(1);
    expect((content3.match(/<!-- MCP Toggle Integration/g) || []).length).toBe(1);
  });
});

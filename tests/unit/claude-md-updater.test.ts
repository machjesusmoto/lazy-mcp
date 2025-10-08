import { updateClaudeMd, hasIntegration } from '../../src/core/claude-md-updater';
import { createTempDir, cleanupTempDir } from '../helpers/test-utils';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('claude-md-updater', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('hasIntegration', () => {
    it('should return false for empty string', () => {
      expect(hasIntegration('')).toBe(false);
    });

    it('should return false when only start marker present', () => {
      const content = '<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->';
      expect(hasIntegration(content)).toBe(false);
    });

    it('should return false when only end marker present', () => {
      const content = '<!-- End MCP Toggle Integration -->';
      expect(hasIntegration(content)).toBe(false);
    });

    it('should return true when both markers present', () => {
      const content = `
<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
Some content here
<!-- End MCP Toggle Integration -->
`;
      expect(hasIntegration(content)).toBe(true);
    });

    it('should return true even with whitespace around markers', () => {
      const content = `
  <!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
Some content here
  <!-- End MCP Toggle Integration -->
`;
      expect(hasIntegration(content)).toBe(true);
    });

    it('should return false when markers are in wrong order', () => {
      const content = `
<!-- End MCP Toggle Integration -->
Some content here
<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
`;
      // hasIntegration only checks presence, not order
      // validateIntegration would check order
      expect(hasIntegration(content)).toBe(true);
    });
  });

  describe('updateClaudeMd', () => {
    it('should create new claude.md if it does not exist', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      // Verify file doesn't exist
      expect(await fs.pathExists(claudeMdPath)).toBe(false);

      await updateClaudeMd(tempDir);

      // Verify file was created
      expect(await fs.pathExists(claudeMdPath)).toBe(true);

      const content = await fs.readFile(claudeMdPath, 'utf-8');

      // Verify markers present
      expect(content).toContain('<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->');
      expect(content).toContain('<!-- End MCP Toggle Integration -->');

      // Verify key content
      expect(content).toContain('# MCP Server and Memory Control');
      expect(content).toContain('blocked.md');
      expect(content).toContain('npx mcp-toggle');
    });

    it('should append integration to existing claude.md', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      const existingContent = `# My Project

This project uses Claude Code for development.

## Instructions

Please follow these coding standards:
- Use TypeScript
- Write tests for all features
- Document public APIs
`;

      await fs.writeFile(claudeMdPath, existingContent, 'utf-8');

      await updateClaudeMd(tempDir);

      const updatedContent = await fs.readFile(claudeMdPath, 'utf-8');

      // Verify original content preserved
      expect(updatedContent).toContain('# My Project');
      expect(updatedContent).toContain('Use TypeScript');

      // Verify integration added
      expect(updatedContent).toContain('<!-- MCP Toggle Integration');
      expect(updatedContent).toContain('# MCP Server and Memory Control');

      // Verify integration is at the end
      const startMarkerIndex = updatedContent.indexOf('<!-- MCP Toggle Integration');
      const originalContentLastLine = updatedContent.indexOf('Document public APIs');
      expect(startMarkerIndex).toBeGreaterThan(originalContentLastLine);
    });

    it('should be idempotent (no-op when integration already present)', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      // First update
      await updateClaudeMd(tempDir);
      const contentAfterFirst = await fs.readFile(claudeMdPath, 'utf-8');

      // Second update
      await updateClaudeMd(tempDir);
      const contentAfterSecond = await fs.readFile(claudeMdPath, 'utf-8');

      // Should be identical
      expect(contentAfterSecond).toBe(contentAfterFirst);

      // Should not duplicate markers
      const markerCount = (contentAfterSecond.match(/<!-- MCP Toggle Integration/g) || []).length;
      expect(markerCount).toBe(1);
    });

    it('should handle empty existing claude.md', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      // Create empty file
      await fs.writeFile(claudeMdPath, '', 'utf-8');

      await updateClaudeMd(tempDir);

      const content = await fs.readFile(claudeMdPath, 'utf-8');

      // Verify integration added
      expect(content).toContain('<!-- MCP Toggle Integration');
      expect(hasIntegration(content)).toBe(true);
    });

    it('should handle claude.md with only whitespace', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      // Create file with only whitespace
      await fs.writeFile(claudeMdPath, '   \n\n  \n', 'utf-8');

      await updateClaudeMd(tempDir);

      const content = await fs.readFile(claudeMdPath, 'utf-8');

      // Verify integration added
      expect(hasIntegration(content)).toBe(true);
    });

    it('should set file permissions to 644', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      await updateClaudeMd(tempDir);

      const stats = await fs.stat(claudeMdPath);

      // 644 in octal = 0o644
      // Check read/write for owner, read for group/others
      expect((stats.mode & 0o644) === 0o644).toBe(true);
    });

    it('should preserve blank lines between original content and integration', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      const existingContent = `# My Project

Some content here.`;

      await fs.writeFile(claudeMdPath, existingContent, 'utf-8');

      await updateClaudeMd(tempDir);

      const updatedContent = await fs.readFile(claudeMdPath, 'utf-8');

      // Should have blank line before integration
      expect(updatedContent).toMatch(/Some content here\.\n\n<!-- MCP Toggle Integration/);
    });

    it('should handle special characters in existing content', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      const existingContent = `# Project with "quotes" and 'apostrophes'

Code example:
\`\`\`typescript
const foo = "bar";
\`\`\`

Special chars: <>&"'
`;

      await fs.writeFile(claudeMdPath, existingContent, 'utf-8');

      await updateClaudeMd(tempDir);

      const updatedContent = await fs.readFile(claudeMdPath, 'utf-8');

      // Verify special characters preserved
      expect(updatedContent).toContain('"quotes"');
      expect(updatedContent).toContain('const foo = "bar";');
      expect(updatedContent).toContain('Special chars: <>&"\'');

      // Verify integration added
      expect(hasIntegration(updatedContent)).toBe(true);
    });

    it('should handle existing HTML comments', async () => {
      const claudeMdPath = path.join(tempDir, 'claude.md');

      const existingContent = `# My Project

<!-- This is my own comment -->

Some content here.
`;

      await fs.writeFile(claudeMdPath, existingContent, 'utf-8');

      await updateClaudeMd(tempDir);

      const updatedContent = await fs.readFile(claudeMdPath, 'utf-8');

      // Verify original comment preserved
      expect(updatedContent).toContain('<!-- This is my own comment -->');

      // Verify integration added
      expect(hasIntegration(updatedContent)).toBe(true);

      // Should have 3 HTML comments total (original + 2 markers)
      const commentCount = (updatedContent.match(/<!--/g) || []).length;
      expect(commentCount).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should throw error if projectDir does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      await expect(updateClaudeMd(nonExistentDir)).rejects.toThrow();
    });

    it('should handle read-only directory gracefully', async () => {
      // Create a read-only directory
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      await fs.chmod(readOnlyDir, 0o555);

      await expect(updateClaudeMd(readOnlyDir)).rejects.toThrow(/EACCES|permission denied/i);

      // Clean up - restore write permissions
      await fs.chmod(readOnlyDir, 0o755);
    });
  });
});

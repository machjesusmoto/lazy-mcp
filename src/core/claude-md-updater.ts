/**
 * Updates claude.md with MCP toggle integration instructions.
 * Follows the claude-md-integration.md contract specification.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

// Integration block template
const INTEGRATION_TEMPLATE = `<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
# MCP Server and Memory Control

This project uses \`blocked.md\` to control which MCP servers and memory files are loaded.

When Claude Code starts in this directory:
1. Read \`.claude/blocked.md\` if it exists
2. For each line prefixed with \`mcp:\`, skip loading that MCP server
3. For each line prefixed with \`memory:\`, skip loading that memory file

To manage blocked items, run: \`npx mcp-toggle\`

**Current blocked items**: Check \`.claude/blocked.md\` for the list.
<!-- End MCP Toggle Integration -->`;

// Marker constants
const START_MARKER = '<!-- MCP Toggle Integration';
const END_MARKER = '<!-- End MCP Toggle Integration -->';

/**
 * Check if claude.md already has the integration block.
 */
export function hasIntegration(content: string): boolean {
  return content.includes(START_MARKER) && content.includes(END_MARKER);
}

/**
 * Validate that integration block is well-formed.
 * Checks that markers are present and in correct order.
 */
export function validateIntegration(content: string): boolean {
  if (!hasIntegration(content)) {
    return false;
  }

  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  return startIndex < endIndex;
}

/**
 * Add integration block to existing content.
 * Preserves all existing content, appends integration at the end.
 */
function addIntegration(existingContent: string): string {
  // Ensure existing content ends with newline
  let content = existingContent.trimEnd();

  // Add blank lines before integration if there's existing content
  if (content.length > 0) {
    content += '\n\n';
  }

  // Append integration block
  content += INTEGRATION_TEMPLATE;
  content += '\n';

  return content;
}

/**
 * Update claude.md with integration instructions.
 *
 * Behavior:
 * - If file doesn't exist: Creates new file with just the integration
 * - If file exists without integration: Appends integration at the end
 * - If file exists with integration: No-op (idempotent)
 *
 * @param projectDir - Project root directory
 * @throws Error if projectDir doesn't exist or write fails
 */
export async function updateClaudeMd(projectDir: string): Promise<void> {
  // Verify project directory exists
  if (!(await fs.pathExists(projectDir))) {
    throw new Error(`Project directory does not exist: ${projectDir}`);
  }

  const claudeMdPath = path.join(projectDir, 'claude.md');

  // Read existing content (if file exists)
  let existingContent = '';
  if (await fs.pathExists(claudeMdPath)) {
    existingContent = await fs.readFile(claudeMdPath, 'utf-8');

    // Check if integration already present (idempotent)
    if (hasIntegration(existingContent)) {
      // Already integrated, no action needed
      return;
    }
  }

  // Add integration to content
  const updatedContent = addIntegration(existingContent);

  // Write atomically (temp file + rename for atomicity)
  const tempPath = `${claudeMdPath}.tmp`;
  try {
    await fs.writeFile(tempPath, updatedContent, 'utf-8');
    await fs.move(tempPath, claudeMdPath, { overwrite: true });

    // Set permissions to 644 (owner read/write, group/others read)
    await fs.chmod(claudeMdPath, 0o644);
  } catch (error) {
    // Clean up temp file if it exists
    await fs.remove(tempPath).catch(() => {
      /* ignore cleanup errors */
    });
    throw error;
  }
}

/**
 * Get the integration template content.
 * Useful for documentation and testing.
 */
export function getIntegrationTemplate(): string {
  return INTEGRATION_TEMPLATE;
}

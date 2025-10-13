/**
 * PreToolUse Hook - Runtime tool blocking
 *
 * Intercepts tool execution to check if the MCP server is blocked.
 * Returns decision to allow or block tool execution based on current configuration.
 */

import { readMcpJson, isBlockedServer } from '@lazy-mcp/shared';

// Hook input from Claude Code (stdin)
export interface PreToolUseInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
}

// Hook output to Claude Code (stdout)
export interface PreToolUseOutput {
  continue: boolean;
  decision: 'allow' | 'block';
  stopReason?: string;
  systemMessage?: string;
  suppressOutput: boolean;
}

/**
 * Extract MCP server name from tool name
 *
 * Tool names follow the pattern: mcp__<server-name>__<tool-name>
 * Examples:
 *   - mcp__context7__search_docs → context7
 *   - mcp__magic__generate_component → magic
 *   - mcp__playwright__browser_navigate → playwright
 */
function extractServerName(toolName: string): string | null {
  const mcpPrefix = 'mcp__';

  if (!toolName.startsWith(mcpPrefix)) {
    return null; // Not an MCP tool
  }

  const parts = toolName.substring(mcpPrefix.length).split('__');
  return parts[0] || null;
}

/**
 * Check if a server is blocked in the current project
 */
async function isServerBlockedInProject(projectDir: string, serverName: string): Promise<boolean> {
  try {
    const config = await readMcpJson(projectDir);

    // Check if server exists in project config
    if (!config.mcpServers[serverName]) {
      return false; // Server not overridden, not blocked
    }

    // Check if it has blocking metadata
    return isBlockedServer(config.mcpServers[serverName]);
  } catch (error) {
    // If .mcp.json doesn't exist or can't be read, server is not blocked
    return false;
  }
}

/**
 * PreToolUse hook implementation
 *
 * @param input - Hook input from Claude Code
 * @returns Hook output with blocking decision
 */
export async function preToolUseHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const { cwd, tool_name } = input;

  // Extract server name from tool name
  const serverName = extractServerName(tool_name);

  // If not an MCP tool, allow execution
  if (!serverName) {
    return {
      continue: true,
      decision: 'allow',
      suppressOutput: false
    };
  }

  // Check if server is blocked
  const blocked = await isServerBlockedInProject(cwd, serverName);

  if (blocked) {
    // Server is blocked - prevent tool execution
    return {
      continue: false,
      decision: 'block',
      stopReason: `MCP server '${serverName}' is currently disabled`,
      systemMessage: `⚠️ Server '${serverName}' is disabled. Run /lazy:server ${serverName} on to enable it.`,
      suppressOutput: false
    };
  }

  // Server is not blocked - allow tool execution
  return {
    continue: true,
    decision: 'allow',
    suppressOutput: false
  };
}

/**
 * Hook entry point for Claude Code plugin system
 * Reads JSON from stdin, processes the hook, and writes JSON to stdout
 */
export async function main(): Promise<void> {
  try {
    // Read input from stdin
    const input = await new Promise<string>((resolve, reject) => {
      const chunks: string[] = [];
      process.stdin.on('data', (chunk) => chunks.push(chunk.toString()));
      process.stdin.on('end', () => resolve(chunks.join('')));
      process.stdin.on('error', reject);
    });

    // Parse JSON input
    const hookInput: PreToolUseInput = JSON.parse(input);

    // Execute hook
    const output = await preToolUseHook(hookInput);

    // Write JSON output to stdout
    process.stdout.write(JSON.stringify(output) + '\n');

    // Exit with appropriate code
    process.exit(output.continue ? 0 : 2);
  } catch (error) {
    // Log error to stderr (won't interfere with stdout JSON)
    console.error('PreToolUse hook error:', error);

    // Allow execution on error (fail open)
    const fallbackOutput: PreToolUseOutput = {
      continue: true,
      decision: 'allow',
      suppressOutput: false
    };

    process.stdout.write(JSON.stringify(fallbackOutput) + '\n');
    process.exit(0);
  }
}

// Run hook if executed directly
if (require.main === module) {
  main();
}

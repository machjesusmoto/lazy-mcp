/**
 * Tests for PreToolUse hook
 */

import { preToolUseHook } from '../pre-tool-use';
import * as mcpJsonUtils from '@lazy-mcp/shared';
import type { PreToolUseInput, PreToolUseOutput } from '../pre-tool-use';

// Mock the shared library module
jest.mock('@lazy-mcp/shared', () => ({
  readMcpJson: jest.fn(),
  isBlockedServer: jest.fn()
}));

describe('PreToolUse Hook', () => {
  const mockInput: PreToolUseInput = {
    session_id: 'test-session',
    transcript_path: '/path/to/transcript.jsonl',
    cwd: '/test/project',
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__context7__search_docs',
    tool_input: { query: 'test' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Name Parsing', () => {
    it('should allow non-MCP tools', async () => {
      const input = { ...mockInput, tool_name: 'native_tool' };
      const output = await preToolUseHook(input);

      expect(output).toEqual({
        continue: true,
        decision: 'allow',
        suppressOutput: false
      });
    });

    it('should extract server name from MCP tool name', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({ mcpServers: {} });

      await preToolUseHook(mockInput);

      expect(readMcpJsonMock).toHaveBeenCalledWith('/test/project');
    });

    it('should handle tool names with multiple underscores', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({ mcpServers: {} });

      const input = {
        ...mockInput,
        tool_name: 'mcp__sequential-thinking__analyze_complex_problem'
      };

      await preToolUseHook(input);

      expect(readMcpJsonMock).toHaveBeenCalledWith('/test/project');
    });
  });

  describe('Server Blocking', () => {
    it('should allow tools from non-blocked servers', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({
        mcpServers: {
          'context7': {
            command: 'npx',
            args: ['-y', '@context7/server']
          }
        }
      });

      const isBlockedServerMock = mcpJsonUtils.isBlockedServer as unknown as jest.Mock;
      isBlockedServerMock.mockReturnValue(false);

      const output = await preToolUseHook(mockInput);

      expect(output).toEqual({
        continue: true,
        decision: 'allow',
        suppressOutput: false
      });
    });

    it('should block tools from blocked servers', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({
        mcpServers: {
          'context7': {
            command: 'echo',
            args: ['Server blocked by mcp-toggle'],
            _mcpToggleBlocked: true,
            _mcpToggleBlockedAt: '2025-10-12T00:00:00.000Z',
            _mcpToggleOriginal: {
              command: 'npx',
              args: ['-y', '@context7/server']
            }
          }
        }
      });

      const isBlockedServerMock = mcpJsonUtils.isBlockedServer as unknown as jest.Mock;
      isBlockedServerMock.mockReturnValue(true);

      const output = await preToolUseHook(mockInput);

      expect(output).toEqual({
        continue: false,
        decision: 'block',
        stopReason: "MCP server 'context7' is currently disabled",
        systemMessage: "⚠️ Server 'context7' is disabled. Run /lazy:server context7 on to enable it.",
        suppressOutput: false
      });
    });

    it('should allow servers not in project config (not overridden)', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({
        mcpServers: {}
      });

      const output = await preToolUseHook(mockInput);

      expect(output).toEqual({
        continue: true,
        decision: 'allow',
        suppressOutput: false
      });
    });
  });

  describe('Error Handling', () => {
    it('should allow execution if .mcp.json cannot be read', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockRejectedValue(new Error('ENOENT: no such file'));

      const output = await preToolUseHook(mockInput);

      expect(output).toEqual({
        continue: true,
        decision: 'allow',
        suppressOutput: false
      });
    });

    it('should allow execution on unexpected errors (fail open)', async () => {
      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockRejectedValue(new Error('Unexpected error'));

      const output = await preToolUseHook(mockInput);

      expect(output).toEqual({
        continue: true,
        decision: 'allow',
        suppressOutput: false
      });
    });
  });

  describe('Different MCP Servers', () => {
    it('should handle magic server blocking', async () => {
      const input = {
        ...mockInput,
        tool_name: 'mcp__magic__generate_component'
      };

      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({
        mcpServers: {
          'magic': {
            command: 'echo',
            args: ['Server blocked by mcp-toggle'],
            _mcpToggleBlocked: true,
            _mcpToggleBlockedAt: '2025-10-12T00:00:00.000Z',
            _mcpToggleOriginal: {
              command: 'npx',
              args: ['-y', '@magic/server']
            }
          }
        }
      });

      const isBlockedServerMock = mcpJsonUtils.isBlockedServer as unknown as jest.Mock;
      isBlockedServerMock.mockReturnValue(true);

      const output = await preToolUseHook(input);

      expect(output.decision).toBe('block');
      expect(output.stopReason).toContain('magic');
    });

    it('should handle playwright server blocking', async () => {
      const input = {
        ...mockInput,
        tool_name: 'mcp__playwright__browser_navigate'
      };

      const readMcpJsonMock = mcpJsonUtils.readMcpJson as jest.Mock;
      readMcpJsonMock.mockResolvedValue({
        mcpServers: {
          'playwright': {
            command: 'echo',
            args: ['Server blocked by mcp-toggle'],
            _mcpToggleBlocked: true,
            _mcpToggleBlockedAt: '2025-10-12T00:00:00.000Z',
            _mcpToggleOriginal: {
              command: 'npx',
              args: ['-y', '@playwright/mcp-server']
            }
          }
        }
      });

      const isBlockedServerMock = mcpJsonUtils.isBlockedServer as unknown as jest.Mock;
      isBlockedServerMock.mockReturnValue(true);

      const output = await preToolUseHook(input);

      expect(output.decision).toBe('block');
      expect(output.stopReason).toContain('playwright');
    });
  });
});

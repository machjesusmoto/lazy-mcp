/**
 * Tests for blocked-manager.ts v2.0.0
 * Tests for US1, US2, US3, US4, US5, US6
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  blockLocalServer,
  unblockLocalServer,
} from '../../src/core/blocked-manager';
import { readClaudeJson, writeClaudeJson } from '../../src/utils/claude-json-utils';
import type { ClaudeJsonConfig } from '../../src/models/types';

describe('blocked-manager v2.0.0', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-toggle-mgr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('blockLocalServer (US1)', () => {
    it('should remove local server from .claude.json', async () => {
      const config: ClaudeJsonConfig = {
        mcpServers: {
          'local-server': { command: 'node', args: ['server.js'] },
        },
      };
      await writeClaudeJson(testDir, config);

      await blockLocalServer(testDir, 'local-server');

      const result = await readClaudeJson(testDir);
      expect(result.mcpServers['local-server']).toBeUndefined();
    });

    it('should preserve other servers', async () => {
      const config: ClaudeJsonConfig = {
        mcpServers: {
          's1': { command: 'node' },
          's2': { command: 'node' },
        },
      };
      await writeClaudeJson(testDir, config);

      await blockLocalServer(testDir, 's1');

      const result = await readClaudeJson(testDir);
      expect(result.mcpServers['s1']).toBeUndefined();
      expect(result.mcpServers['s2']).toBeDefined();
    });

    it('should throw error if server not found', async () => {
      await writeClaudeJson(testDir, { mcpServers: {} });
      await expect(blockLocalServer(testDir, 'missing')).rejects.toThrow('not found');
    });
  });

  describe('unblockLocalServer (US2)', () => {
    it('should return requiresManualAdd=true', async () => {
      const result = await unblockLocalServer(testDir, 'server');
      expect(result.requiresManualAdd).toBe(true);
      expect(result.message).toContain('manually add');
    });
  });
});

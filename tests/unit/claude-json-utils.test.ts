/**
 * Tests for claude-json-utils.ts
 * Phase 2 (Foundation) - Core utilities testing
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  readClaudeJson,
  writeClaudeJson,
  isBlockedServer,
  createDummyOverride,
  extractOriginalConfig,
  removeBlockingMetadata,
  ensureClaudeDirectory,
  claudeJsonExists,
  ensureClaudeJson,
} from '../../src/utils/claude-json-utils';
import type {
  ClaudeJsonConfig,
  MCPServerConfig,
  BlockedMCPServerConfig,
} from '../../src/models/types';

describe('claude-json-utils', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique temporary directory for each test
    testDir = path.join(tmpdir(), `mcp-toggle-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('readClaudeJson', () => {
    it('should return empty config when .claude.json does not exist', async () => {
      const config = await readClaudeJson(testDir);
      expect(config).toEqual({ mcpServers: {} });
    });

    it('should read valid .claude.json file', async () => {
      const testConfig: ClaudeJsonConfig = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['-y', '@test/server'],
          },
        },
      };

      await fs.writeFile(
        path.join(testDir, '.claude.json'),
        JSON.stringify(testConfig, null, 2),
        'utf-8'
      );

      const config = await readClaudeJson(testDir);
      expect(config).toEqual(testConfig);
    });

    it('should ensure mcpServers object exists even if missing from file', async () => {
      await fs.writeFile(
        path.join(testDir, '.claude.json'),
        JSON.stringify({}),
        'utf-8'
      );

      const config = await readClaudeJson(testDir);
      expect(config.mcpServers).toEqual({});
    });

    it('should throw error for malformed JSON', async () => {
      await fs.writeFile(
        path.join(testDir, '.claude.json'),
        'invalid json {',
        'utf-8'
      );

      await expect(readClaudeJson(testDir)).rejects.toThrow();
    });

    it('should preserve additional properties', async () => {
      const testConfig = {
        mcpServers: {},
        customProperty: 'test-value',
      };

      await fs.writeFile(
        path.join(testDir, '.claude.json'),
        JSON.stringify(testConfig, null, 2),
        'utf-8'
      );

      const config = await readClaudeJson(testDir);
      expect(config.customProperty).toBe('test-value');
    });
  });

  describe('writeClaudeJson', () => {
    it('should write .claude.json with proper formatting', async () => {
      const testConfig: ClaudeJsonConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };

      await writeClaudeJson(testDir, testConfig);

      const content = await fs.readFile(path.join(testDir, '.claude.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(testConfig);
      expect(content).toMatch(/^\{/); // Starts with {
      expect(content).toMatch(/\n$/); // Ends with newline
    });

    it('should set correct file permissions (644)', async () => {
      const testConfig: ClaudeJsonConfig = { mcpServers: {} };
      await writeClaudeJson(testDir, testConfig);

      const stats = await fs.stat(path.join(testDir, '.claude.json'));
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(parseInt('644', 8));
    });

    it('should create backup before writing', async () => {
      const originalConfig: ClaudeJsonConfig = {
        mcpServers: { 'server-1': { command: 'node', args: ['old.js'] } },
      };
      await writeClaudeJson(testDir, originalConfig);

      const newConfig: ClaudeJsonConfig = {
        mcpServers: { 'server-2': { command: 'node', args: ['new.js'] } },
      };
      await writeClaudeJson(testDir, newConfig);

      // Backup should be removed on success
      const backupExists = await fs.pathExists(path.join(testDir, '.claude.json.backup'));
      expect(backupExists).toBe(false);

      // New config should be written
      const config = await readClaudeJson(testDir);
      expect(config).toEqual(newConfig);
    });
  });

  describe('isBlockedServer', () => {
    it('should return true for blocked server config', () => {
      const blocked: BlockedMCPServerConfig = {
        command: 'echo',
        args: ['[mcp-toggle] Server blocked'],
        _mcpToggleBlocked: true,
        _mcpToggleBlockedAt: new Date().toISOString(),
        _mcpToggleOriginal: { command: 'npx', args: ['-y', '@test/server'] },
      };

      expect(isBlockedServer(blocked)).toBe(true);
    });

    it('should return false for unblocked server config', () => {
      const unblocked: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@test/server'],
      };

      expect(isBlockedServer(unblocked)).toBe(false);
    });

    it('should return false if _mcpToggleBlocked is not true', () => {
      const notBlocked = {
        command: 'echo',
        _mcpToggleBlocked: false,
        _mcpToggleOriginal: { command: 'npx' },
      };

      expect(isBlockedServer(notBlocked as MCPServerConfig)).toBe(false);
    });
  });

  describe('createDummyOverride', () => {
    it('should create valid blocked server config', () => {
      const original: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@21st-dev/cli'],
        env: { NODE_ENV: 'production' },
      };

      const blocked = createDummyOverride('magic', original);

      expect(blocked.command).toBe('echo');
      expect(blocked.args).toEqual(["[mcp-toggle] Server 'magic' is blocked"]);
      expect(blocked._mcpToggleBlocked).toBe(true);
      expect(blocked._mcpToggleBlockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
      expect(blocked._mcpToggleOriginal).toEqual(original);
    });

    it('should preserve original config exactly', () => {
      const original: MCPServerConfig = {
        command: 'python',
        args: ['-m', 'server'],
        env: { PYTHONPATH: '/custom/path' },
        customProperty: 'test-value',
      };

      const blocked = createDummyOverride('python-server', original);

      expect(blocked._mcpToggleOriginal).toEqual(original);
      expect(blocked._mcpToggleOriginal.customProperty).toBe('test-value');
    });
  });

  describe('extractOriginalConfig', () => {
    it('should extract original config from blocked server', () => {
      const original: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@test/server'],
      };

      const blocked = createDummyOverride('test', original);
      const extracted = extractOriginalConfig(blocked);

      expect(extracted).toEqual(original);
    });

    it('should throw error if server is not blocked', () => {
      const unblocked: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@test/server'],
      };

      expect(() => extractOriginalConfig(unblocked as BlockedMCPServerConfig)).toThrow(
        'Server configuration is not blocked by mcp-toggle'
      );
    });

    it('should return a copy, not reference', () => {
      const original: MCPServerConfig = {
        command: 'node',
        args: ['server.js'],
      };

      const blocked = createDummyOverride('test', original);
      const extracted = extractOriginalConfig(blocked);

      // Modify extracted
      extracted.command = 'python';

      // Original should be unchanged
      expect(blocked._mcpToggleOriginal.command).toBe('node');
    });
  });

  describe('removeBlockingMetadata', () => {
    it('should return original config for blocked server', () => {
      const original: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@test/server'],
      };

      const blocked = createDummyOverride('test', original);
      const cleaned = removeBlockingMetadata(blocked);

      expect(cleaned).toEqual(original);
      expect('_mcpToggleBlocked' in cleaned).toBe(false);
    });

    it('should return config as-is for unblocked server', () => {
      const unblocked: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@test/server'],
      };

      const result = removeBlockingMetadata(unblocked);
      expect(result).toBe(unblocked);
    });
  });

  describe('ensureClaudeDirectory', () => {
    it('should create .claude directory if it does not exist', async () => {
      await ensureClaudeDirectory(testDir);

      const claudeDir = path.join(testDir, '.claude');
      const exists = await fs.pathExists(claudeDir);
      expect(exists).toBe(true);

      const stats = await fs.stat(claudeDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not fail if .claude directory already exists', async () => {
      const claudeDir = path.join(testDir, '.claude');
      await fs.mkdir(claudeDir);

      await expect(ensureClaudeDirectory(testDir)).resolves.not.toThrow();
    });

    it('should set correct permissions (755)', async () => {
      await ensureClaudeDirectory(testDir);

      const stats = await fs.stat(path.join(testDir, '.claude'));
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(parseInt('755', 8));
    });
  });

  describe('claudeJsonExists', () => {
    it('should return true when .claude.json exists', async () => {
      await fs.writeFile(path.join(testDir, '.claude.json'), '{}', 'utf-8');

      const exists = await claudeJsonExists(testDir);
      expect(exists).toBe(true);
    });

    it('should return false when .claude.json does not exist', async () => {
      const exists = await claudeJsonExists(testDir);
      expect(exists).toBe(false);
    });
  });

  describe('ensureClaudeJson', () => {
    it('should create minimal .claude.json if it does not exist', async () => {
      await ensureClaudeJson(testDir);

      const config = await readClaudeJson(testDir);
      expect(config).toEqual({ mcpServers: {} });
    });

    it('should not overwrite existing .claude.json', async () => {
      const existingConfig: ClaudeJsonConfig = {
        mcpServers: {
          'existing-server': { command: 'node', args: ['server.js'] },
        },
      };
      await writeClaudeJson(testDir, existingConfig);

      await ensureClaudeJson(testDir);

      const config = await readClaudeJson(testDir);
      expect(config).toEqual(existingConfig);
    });
  });
});

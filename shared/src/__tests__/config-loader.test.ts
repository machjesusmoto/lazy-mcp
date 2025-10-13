/**
 * @mcp-toggle/shared - ConfigLoader Tests
 */

import { ConfigLoader } from '../config-loader';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ConfigLoader', () => {
  let tempDir: string;
  let configLoader: ConfigLoader;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), `mcp-toggle-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    const configPath = path.join(tempDir, '.claude.json');
    const blockedPath = path.join(tempDir, 'blocked.md');

    configLoader = new ConfigLoader(configPath, blockedPath);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('loadMCPServers', () => {
    it('should return empty array when config file does not exist', async () => {
      const servers = await configLoader.loadMCPServers();
      expect(servers).toEqual([]);
    });

    it('should load MCP servers from .claude.json', async () => {
      const configData = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            env: { NODE_ENV: 'test' }
          }
        }
      };

      await fs.writeJSON(path.join(tempDir, '.claude.json'), configData);

      const servers = await configLoader.loadMCPServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('test-server');
      expect(servers[0].command).toBe('node');
      expect(servers[0].args).toEqual(['server.js']);
      expect(servers[0].enabled).toBe(true);
      expect(servers[0].estimatedTokens).toBeGreaterThan(0);
    });

    it('should estimate higher tokens for known large servers', async () => {
      const configData = {
        mcpServers: {
          'sequential-thinking': { command: 'node', args: ['seq.js'] },
          'small-server': { command: 'node', args: ['small.js'] }
        }
      };

      await fs.writeJSON(path.join(tempDir, '.claude.json'), configData);

      const servers = await configLoader.loadMCPServers();
      const seqServer = servers.find(s => s.name === 'sequential-thinking');
      const smallServer = servers.find(s => s.name === 'small-server');

      expect(seqServer?.estimatedTokens).toBeGreaterThan(smallServer?.estimatedTokens || 0);
    });
  });

  describe('loadBlockingRules', () => {
    it('should return empty array when blocked.md does not exist', async () => {
      const rules = await configLoader.loadBlockingRules();
      expect(rules).toEqual([]);
    });

    it('should parse MCP blocking rules', async () => {
      const blockedContent = `
# Blocked items
mcp: test-server
mcp: another-server
`;
      await fs.writeFile(path.join(tempDir, 'blocked.md'), blockedContent);

      const rules = await configLoader.loadBlockingRules();
      expect(rules).toHaveLength(2);
      expect(rules[0]).toEqual({ type: 'mcp', name: 'test-server' });
      expect(rules[1]).toEqual({ type: 'mcp', name: 'another-server' });
    });

    it('should parse memory blocking rules', async () => {
      const blockedContent = `memory: old-memory.md\nmemory: unused.md`;
      await fs.writeFile(path.join(tempDir, 'blocked.md'), blockedContent);

      const rules = await configLoader.loadBlockingRules();
      expect(rules).toHaveLength(2);
      expect(rules[0]).toEqual({ type: 'memory', name: 'old-memory.md' });
    });

    it('should parse agent blocking rules', async () => {
      const blockedContent = `agent: test-agent`;
      await fs.writeFile(path.join(tempDir, 'blocked.md'), blockedContent);

      const rules = await configLoader.loadBlockingRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual({ type: 'agent', name: 'test-agent' });
    });

    it('should ignore comments and empty lines', async () => {
      const blockedContent = `
# Comment line
mcp: server1

# Another comment
memory: mem1.md
`;
      await fs.writeFile(path.join(tempDir, 'blocked.md'), blockedContent);

      const rules = await configLoader.loadBlockingRules();
      expect(rules).toHaveLength(2);
    });
  });

  describe('path methods', () => {
    it('should return project root', () => {
      const root = configLoader.getProjectRoot();
      expect(root).toBeTruthy();
      expect(path.isAbsolute(root)).toBe(true);
    });

    it('should return .claude directory path', () => {
      const claudeDir = configLoader.getClaudeDir();
      expect(claudeDir).toContain('.claude');
      expect(path.isAbsolute(claudeDir)).toBe(true);
    });
  });
});

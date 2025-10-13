/**
 * Tests for LazyMCPGenerator
 */

import { LazyMCPGenerator } from '../lazy-mcp-generator';
import { MCPServer } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('LazyMCPGenerator', () => {
  let generator: LazyMCPGenerator;
  let mockServers: MCPServer[];

  beforeEach(() => {
    generator = new LazyMCPGenerator();

    // Mock MCP servers
    mockServers = [
      {
        name: 'serena',
        command: 'uv',
        args: ['--directory', '/path/to/serena', 'run', 'serena', 'start-mcp-server'],
        env: { CONTEXT: 'claude-code' },
        enabled: true,
        estimatedTokens: 5000
      },
      {
        name: 'playwright',
        command: 'npx',
        args: ['-y', '@playwright/mcp-server'],
        env: {},
        enabled: true,
        estimatedTokens: 12000
      },
      {
        name: 'context7',
        command: 'npx',
        args: ['-y', '@context7/mcp-server'],
        enabled: false, // Disabled server
        estimatedTokens: 15000
      }
    ];
  });

  describe('generateConfig', () => {
    it('should generate basic configuration with defaults', () => {
      const config = generator.generateConfig(mockServers);

      expect(config.mcpProxy.baseURL).toBe('http://localhost:9090');
      expect(config.mcpProxy.addr).toBe(':9090');
      expect(config.mcpProxy.name).toBe('MCP Proxy with Lazy Loading');
      expect(config.mcpProxy.options.lazyLoad).toBe(true);
      expect(config.mcpProxy.options.logEnabled).toBe(true);
    });

    it('should only include enabled servers by default', () => {
      const config = generator.generateConfig(mockServers);

      expect(Object.keys(config.mcpServers)).toHaveLength(2);
      expect(config.mcpServers.serena).toBeDefined();
      expect(config.mcpServers.playwright).toBeDefined();
      expect(config.mcpServers.context7).toBeUndefined();
    });

    it('should map MCP server properties correctly', () => {
      const config = generator.generateConfig(mockServers);

      const serenaConfig = config.mcpServers.serena;
      expect(serenaConfig.command).toBe('uv');
      expect(serenaConfig.args).toEqual([
        '--directory',
        '/path/to/serena',
        'run',
        'serena',
        'start-mcp-server'
      ]);
      expect(serenaConfig.env).toEqual({ CONTEXT: 'claude-code' });
    });

    it('should accept custom port', () => {
      const config = generator.generateConfig(mockServers, { port: 8080 });

      expect(config.mcpProxy.addr).toBe(':8080');
      expect(config.mcpProxy.baseURL).toBe('http://localhost:9090'); // Uses default baseURL
    });

    it('should accept custom baseURL', () => {
      const config = generator.generateConfig(mockServers, {
        baseURL: 'https://proxy.example.com'
      });

      expect(config.mcpProxy.baseURL).toBe('https://proxy.example.com');
    });

    it('should respect includeServers option', () => {
      const config = generator.generateConfig(mockServers, {
        includeServers: ['serena']
      });

      expect(Object.keys(config.mcpServers)).toHaveLength(1);
      expect(config.mcpServers.serena).toBeDefined();
      expect(config.mcpServers.playwright).toBeUndefined();
    });

    it('should respect excludeServers option', () => {
      const config = generator.generateConfig(mockServers, {
        excludeServers: ['playwright']
      });

      expect(Object.keys(config.mcpServers)).toHaveLength(1);
      expect(config.mcpServers.serena).toBeDefined();
      expect(config.mcpServers.playwright).toBeUndefined();
    });

    it('should handle disabled lazy loading', () => {
      const config = generator.generateConfig(mockServers, { lazyLoad: false });

      expect(config.mcpProxy.options.lazyLoad).toBe(false);
    });

    it('should handle disabled logging', () => {
      const config = generator.generateConfig(mockServers, { logEnabled: false });

      expect(config.mcpProxy.options.logEnabled).toBe(false);
    });

    it('should handle servers with no args or env', () => {
      const minimalServer: MCPServer = {
        name: 'minimal',
        command: 'minimal-server',
        enabled: true,
        estimatedTokens: 1000
      };

      const config = generator.generateConfig([minimalServer]);

      expect(config.mcpServers.minimal).toBeDefined();
      expect(config.mcpServers.minimal.args).toEqual([]);
      expect(config.mcpServers.minimal.env).toEqual({});
    });
  });

  describe('writeConfigFile', () => {
    it('should write configuration to file', async () => {
      const config = generator.generateConfig(mockServers);
      const tempFile = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);

      try {
        await generator.writeConfigFile(config, tempFile);

        // Verify file was created
        expect(await fs.pathExists(tempFile)).toBe(true);

        // Verify content
        const content = await fs.readFile(tempFile, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.mcpProxy.name).toBe('MCP Proxy with Lazy Loading');
        expect(parsed.mcpServers.serena).toBeDefined();
      } finally {
        // Cleanup
        await fs.remove(tempFile);
      }
    });

    it('should format JSON with proper indentation', async () => {
      const config = generator.generateConfig(mockServers);
      const tempFile = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);

      try {
        await generator.writeConfigFile(config, tempFile);

        const content = await fs.readFile(tempFile, 'utf-8');
        // Check for 2-space indentation
        expect(content).toContain('  "mcpProxy"');
        expect(content).toContain('    "baseURL"');
      } finally {
        await fs.remove(tempFile);
      }
    });
  });

  describe('generateConfigFile', () => {
    it('should generate and write configuration in one step', async () => {
      const tempFile = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);

      try {
        const config = await generator.generateConfigFile(mockServers, tempFile);

        // Verify return value
        expect(config.mcpProxy).toBeDefined();
        expect(config.mcpServers.serena).toBeDefined();

        // Verify file was created
        expect(await fs.pathExists(tempFile)).toBe(true);

        // Verify file content matches return value
        const fileContent = await fs.readFile(tempFile, 'utf-8');
        const parsedFile = JSON.parse(fileContent);
        expect(parsedFile).toEqual(config);
      } finally {
        await fs.remove(tempFile);
      }
    });
  });

  describe('getDefaultConfigPath', () => {
    it('should return path in user home directory', () => {
      const configPath = generator.getDefaultConfigPath();

      expect(configPath).toContain(os.homedir());
      expect(configPath).toContain('.config');
      expect(configPath).toContain('lazy-mcp');
      expect(configPath).toContain('config.json');
    });
  });

  describe('generateInstallInstructions', () => {
    it('should generate complete installation instructions', () => {
      const instructions = generator.generateInstallInstructions(
        '/home/user/.config/lazy-mcp/config.json',
        9090
      );

      expect(instructions).toContain('git clone');
      expect(instructions).toContain('make build');
      expect(instructions).toContain('/home/user/.config/lazy-mcp/config.json');
      expect(instructions).toContain('http://localhost:9090');
      expect(instructions).toContain('~/.claude.json');
    });

    it('should include correct port in instructions', () => {
      const instructions = generator.generateInstallInstructions(
        '/path/to/config.json',
        8080
      );

      expect(instructions).toContain('http://localhost:8080');
    });
  });

  describe('integration scenarios', () => {
    it('should generate config for selective server loading', () => {
      const config = generator.generateConfig(mockServers, {
        includeServers: ['serena'],
        lazyLoad: true,
        logEnabled: true
      });

      expect(Object.keys(config.mcpServers)).toHaveLength(1);
      expect(config.mcpServers.serena).toBeDefined();
      expect(config.mcpProxy.options.lazyLoad).toBe(true);
    });

    it('should generate config for development mode', () => {
      const config = generator.generateConfig(mockServers, {
        baseURL: 'http://localhost:9090',
        port: 9090,
        lazyLoad: false, // Load all servers upfront for debugging
        logEnabled: true
      });

      expect(config.mcpProxy.options.lazyLoad).toBe(false);
      expect(config.mcpProxy.options.logEnabled).toBe(true);
    });

    it('should generate config for production mode', () => {
      const config = generator.generateConfig(mockServers, {
        baseURL: 'https://mcp-proxy.production.com',
        port: 443,
        lazyLoad: true,
        logEnabled: false // Disable verbose logging in production
      });

      expect(config.mcpProxy.baseURL).toBe('https://mcp-proxy.production.com');
      expect(config.mcpProxy.options.lazyLoad).toBe(true);
      expect(config.mcpProxy.options.logEnabled).toBe(false);
    });
  });
});

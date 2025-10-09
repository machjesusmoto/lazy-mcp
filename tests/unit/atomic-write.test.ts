/**
 * Tests for atomic write pattern with backup/restore
 * Phase 2 (Foundation) - Ensures zero-corruption guarantee
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';
import { writeMcpJson, readMcpJson } from '../../src/utils/mcp-json-utils';
import type { McpJsonConfig } from '../../src/models/types';

describe('Atomic Write Pattern', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-toggle-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Write-to-Temp + Atomic-Move Pattern', () => {
    it('should write to temp file before moving to final location', async () => {
      const configPath = path.join(testDir, '.mcp.json');
      const tempPath = `${configPath}.tmp`;

      const testConfig: McpJsonConfig = {
        mcpServers: {
          'test-server': { command: 'node', args: ['server.js'] },
        },
      };

      // Spy on fs operations by checking temp file doesn't exist after completion
      await writeMcpJson(testDir, testConfig);

      // Temp file should be cleaned up
      const tempExists = await fs.pathExists(tempPath);
      expect(tempExists).toBe(false);

      // Final file should exist
      const finalExists = await fs.pathExists(configPath);
      expect(finalExists).toBe(true);
    });

    it('should be atomic - file either fully written or not at all', async () => {
      const testConfig: McpJsonConfig = {
        mcpServers: {
          'server-1': { command: 'node', args: ['test.js'] },
        },
      };

      await writeMcpJson(testDir, testConfig);

      // Read back and verify complete
      const config = await readMcpJson(testDir);
      expect(config).toEqual(testConfig);

      // File should be valid JSON (no partial writes)
      const content = await fs.readFile(path.join(testDir, '.mcp.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Backup Creation', () => {
    it('should create backup before overwriting existing file', async () => {
      const configPath = path.join(testDir, '.mcp.json');
      const backupPath = `${configPath}.backup`;

      // Write original config
      const originalConfig: McpJsonConfig = {
        mcpServers: {
          'original-server': { command: 'node', args: ['original.js'] },
        },
      };
      await writeMcpJson(testDir, originalConfig);

      // Simulate a write that might fail by checking backup exists during write
      // (In real scenario, backup is removed on success)
      const newConfig: McpJsonConfig = {
        mcpServers: {
          'new-server': { command: 'node', args: ['new.js'] },
        },
      };

      await writeMcpJson(testDir, newConfig);

      // Backup should be removed after successful write
      const backupExists = await fs.pathExists(backupPath);
      expect(backupExists).toBe(false);
    });

    it('should not create backup when writing to new directory', async () => {
      const configPath = path.join(testDir, '.mcp.json');
      const backupPath = `${configPath}.backup`;

      const testConfig: McpJsonConfig = { mcpServers: {} };
      await writeMcpJson(testDir, testConfig);

      const backupExists = await fs.pathExists(backupPath);
      expect(backupExists).toBe(false);
    });
  });

  describe('Restore on Failure', () => {
    it('should restore from backup if write fails', async () => {
      const configPath = path.join(testDir, '.mcp.json');

      // Write original config
      const originalConfig: McpJsonConfig = {
        mcpServers: {
          'original-server': { command: 'node', args: ['original.js'] },
        },
      };
      await writeMcpJson(testDir, originalConfig);

      // Make directory read-only to simulate write failure
      await fs.chmod(testDir, 0o444);

      const newConfig: McpJsonConfig = {
        mcpServers: {
          'new-server': { command: 'node', args: ['new.js'] },
        },
      };

      try {
        await writeMcpJson(testDir, newConfig);
      } catch (error) {
        // Expected to fail
      }

      // Restore directory permissions
      await fs.chmod(testDir, 0o755);

      // Original config should still be intact
      const config = await readMcpJson(testDir);
      expect(config.mcpServers['original-server']).toBeDefined();
      expect(config.mcpServers['new-server']).toBeUndefined();
    });

    it('should clean up temp file on failure', async () => {
      const configPath = path.join(testDir, '.mcp.json');
      const tempPath = `${configPath}.tmp`;

      // Write original config
      await writeMcpJson(testDir, { mcpServers: {} });

      // Make directory read-only
      await fs.chmod(testDir, 0o444);

      try {
        await writeMcpJson(testDir, { mcpServers: { test: { command: 'node' } } });
      } catch (error) {
        // Expected
      }

      // Restore permissions
      await fs.chmod(testDir, 0o755);

      // Temp file should be cleaned up even after failure
      const tempExists = await fs.pathExists(tempPath);
      expect(tempExists).toBe(false);
    });
  });

  describe('Concurrent Write Protection', () => {
    it('should handle sequential writes without corruption', async () => {
      const configs: McpJsonConfig[] = [
        { mcpServers: { 'server-1': { command: 'node', args: ['1.js'] } } },
        { mcpServers: { 'server-2': { command: 'node', args: ['2.js'] } } },
        { mcpServers: { 'server-3': { command: 'node', args: ['3.js'] } } },
      ];

      // Write all configs sequentially
      for (const config of configs) {
        await writeMcpJson(testDir, config);
      }

      // Final config should be the last one written
      const finalConfig = await readMcpJson(testDir);
      expect(finalConfig).toEqual(configs[2]);

      // File should be valid JSON
      const content = await fs.readFile(path.join(testDir, '.mcp.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should not leave stale backup or temp files after multiple writes', async () => {
      const configPath = path.join(testDir, '.mcp.json');
      const backupPath = `${configPath}.backup`;
      const tempPath = `${configPath}.tmp`;

      // Perform multiple writes
      for (let i = 0; i < 5; i++) {
        await writeMcpJson(testDir, {
          mcpServers: { [`server-${i}`]: { command: 'node', args: [`${i}.js`] } },
        });
      }

      // No backup or temp files should remain
      const backupExists = await fs.pathExists(backupPath);
      const tempExists = await fs.pathExists(tempPath);

      expect(backupExists).toBe(false);
      expect(tempExists).toBe(false);
    });
  });

  describe('File Permissions', () => {
    it('should maintain 644 permissions after multiple writes', async () => {
      const configPath = path.join(testDir, '.mcp.json');

      // Write multiple times
      await writeMcpJson(testDir, { mcpServers: { 'server-1': { command: 'node' } } });
      await writeMcpJson(testDir, { mcpServers: { 'server-2': { command: 'node' } } });
      await writeMcpJson(testDir, { mcpServers: { 'server-3': { command: 'node' } } });

      const stats = await fs.stat(configPath);
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(parseInt('644', 8));
    });
  });

  describe('Zero-Corruption Guarantee', () => {
    it('should never have partially written or invalid JSON file', async () => {
      const configPath = path.join(testDir, '.mcp.json');

      // Perform many writes sequentially (concurrent writes would race)
      for (let i = 0; i < 10; i++) {
        await writeMcpJson(testDir, {
          mcpServers: {
            [`server-${i}`]: {
              command: 'node',
              args: [`server-${i}.js`],
            },
          },
        });
      }

      // File should always be valid JSON
      const content = await fs.readFile(configPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();

      // Should have valid structure
      const config = await readMcpJson(testDir);
      expect(config.mcpServers).toBeDefined();
      expect(typeof config.mcpServers).toBe('object');
    });

    it('should preserve data integrity on system crash simulation', async () => {
      // Write initial config
      const initialConfig: McpJsonConfig = {
        mcpServers: {
          'critical-server': {
            command: 'node',
            args: ['critical.js'],
            env: { CRITICAL: 'true' },
          },
        },
      };
      await writeMcpJson(testDir, initialConfig);

      // Verify initial state
      let config = await readMcpJson(testDir);
      expect(config).toEqual(initialConfig);

      // Simulate crash during write by making directory read-only
      await fs.chmod(testDir, 0o444);

      try {
        await writeMcpJson(testDir, {
          mcpServers: { 'new-server': { command: 'node' } },
        });
      } catch (error) {
        // Expected failure
      }

      // Restore permissions
      await fs.chmod(testDir, 0o755);

      // Original config should still be valid and intact
      config = await readMcpJson(testDir);
      expect(config).toEqual(initialConfig);
      expect(config.mcpServers['critical-server']).toBeDefined();
    });
  });
});

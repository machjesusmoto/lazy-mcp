/**
 * Unit tests for migration-manager.ts
 *
 * Feature: 003-add-migrate-to
 * Purpose: Test core migration logic with mocked file operations
 */

import type {
  MigrationOperation,
  ConflictResolution,
  BackupPaths,
  ResolutionType,
} from '../../src/models/types';
import {
  initiateMigration,
  detectConflicts,
  executeMigration,
  rollbackMigration,
  createBackups,
  validateResolutions,
  applyResolutions,
} from '../../src/core/migration-manager';

describe('migration-manager', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts when server names are unique', () => {
      // Test setup
      const projectServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
        { name: 'server-2', command: 'cmd2', hierarchyLevel: 1 },
      ];
      const globalConfig = {
        mcpServers: {
          'server-3': { command: 'cmd3' },
        },
      };

      // Execute
      const conflicts = detectConflicts(projectServers, globalConfig);

      // Assert
      expect(conflicts).toEqual([]);
      expect(conflicts.length).toBe(0);
    });

    it('should detect single conflict when server names match', () => {
      // Test setup
      const projectServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 1, args: ['arg1'] },
      ];
      const globalConfig = {
        mcpServers: {
          'server-1': { command: 'different-cmd', args: ['arg2'] },
        },
      };

      // Execute
      const conflicts = detectConflicts(projectServers, globalConfig);

      // Assert
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].serverName).toBe('server-1');
      expect(conflicts[0].projectConfig.command).toBe('cmd1');
      expect(conflicts[0].globalConfig.command).toBe('different-cmd');
      expect(conflicts[0].resolution).toBe('skip'); // default
      expect(conflicts[0].configDiff?.command).toEqual({ project: 'cmd1', global: 'different-cmd' });
      expect(conflicts[0].configDiff?.args).toEqual({ project: ['arg1'], global: ['arg2'] });
    });

    it('should detect multiple conflicts', () => {
      // Test setup
      const projectServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
        { name: 'server-2', command: 'cmd2', hierarchyLevel: 1 },
      ];
      const globalConfig = {
        mcpServers: {
          'server-1': { command: 'different-cmd1' },
          'server-2': { command: 'different-cmd2' },
        },
      };

      // Execute
      const conflicts = detectConflicts(projectServers, globalConfig);

      // Assert
      expect(conflicts.length).toBe(2);
      expect(conflicts[0].serverName).toBe('server-1');
      expect(conflicts[1].serverName).toBe('server-2');
      expect(conflicts[0].resolution).toBe('skip');
      expect(conflicts[1].resolution).toBe('skip');
    });

    it('should handle empty global config', () => {
      const projectServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
      ];
      const globalConfig = {};

      const conflicts = detectConflicts(projectServers, globalConfig);

      expect(conflicts).toEqual([]);
    });

    it('should handle null global config', () => {
      const projectServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
      ];
      const globalConfig = null;

      const conflicts = detectConflicts(projectServers, globalConfig);

      expect(conflicts).toEqual([]);
    });

    it('should detect config differences including blocking metadata', () => {
      const projectServers = [
        {
          name: 'server-1',
          command: 'echo',
          hierarchyLevel: 1,
          _mcpToggleBlocked: true,
          _mcpToggleBlockedAt: '2025-01-01T00:00:00.000Z',
        },
      ];
      const globalConfig = {
        mcpServers: {
          'server-1': { command: 'node' },
        },
      };

      const conflicts = detectConflicts(projectServers, globalConfig);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].configDiff?.hasBlockingMetadata).toEqual({ project: true, global: false });
      expect(conflicts[0].projectConfig._mcpToggleBlocked).toBe(true);
      expect(conflicts[0].projectConfig._mcpToggleBlockedAt).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('validateResolutions', () => {
    it('should return true for valid skip resolution', () => {
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'cmd2' },
          resolution: 'skip',
        },
      ];

      const result = validateResolutions(conflicts);
      expect(result).toBe(true);
    });

    it('should return true for valid overwrite resolution', () => {
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'cmd2' },
          resolution: 'overwrite',
        },
      ];

      const result = validateResolutions(conflicts);
      expect(result).toBe(true);
    });

    it('should return true for valid rename resolution with newName', () => {
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'cmd2' },
          resolution: 'rename',
          newName: 'server-1-renamed',
        },
      ];

      const result = validateResolutions(conflicts);
      expect(result).toBe(true);
    });

    it('should return false for rename resolution without newName', () => {
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'cmd2' },
          resolution: 'rename',
        },
      ];

      const result = validateResolutions(conflicts);
      expect(result).toBe(false);
    });

    it('should return false for rename resolution with invalid newName', () => {
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'cmd2' },
          resolution: 'rename',
          newName: 'invalid name with spaces',
        },
      ];

      const result = validateResolutions(conflicts);
      expect(result).toBe(false);
    });

    it('should return false for invalid resolution type', () => {
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'cmd2' },
          resolution: 'invalid' as ResolutionType,
        },
      ];

      const result = validateResolutions(conflicts);
      expect(result).toBe(false);
    });

    it('should return true for empty conflicts array', () => {
      const conflicts: ConflictResolution[] = [];

      const result = validateResolutions(conflicts);
      expect(result).toBe(true);
    });
  });

  describe('applyResolutions', () => {
    it('should remove servers with skip resolution', () => {
      const servers = [
        { name: 'server-1', command: 'cmd1' },
        { name: 'server-2', command: 'cmd2' },
      ];
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'different' },
          resolution: 'skip',
        },
      ];

      const result = applyResolutions(servers, conflicts);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('server-2');
    });

    it('should keep servers with overwrite resolution', () => {
      const servers = [
        { name: 'server-1', command: 'cmd1', args: ['arg1'] },
      ];
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'different' },
          resolution: 'overwrite',
        },
      ];

      const result = applyResolutions(servers, conflicts);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('server-1');
      expect(result[0].command).toBe('cmd1');
      expect(result[0].args).toEqual(['arg1']);
    });

    it('should rename servers with rename resolution', () => {
      const servers = [
        { name: 'server-1', command: 'cmd1', args: ['arg1'] },
      ];
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'different' },
          resolution: 'rename',
          newName: 'server-1-renamed',
        },
      ];

      const result = applyResolutions(servers, conflicts);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('server-1-renamed');
      expect(result[0].command).toBe('cmd1');
      expect(result[0].args).toEqual(['arg1']);
    });

    it('should keep servers without conflicts', () => {
      const servers = [
        { name: 'server-1', command: 'cmd1' },
        { name: 'server-2', command: 'cmd2' },
      ];
      const conflicts: ConflictResolution[] = [];

      const result = applyResolutions(servers, conflicts);

      expect(result.length).toBe(2);
      expect(result).toEqual(servers);
    });

    it('should handle mixed resolutions', () => {
      const servers = [
        { name: 'server-1', command: 'cmd1' },
        { name: 'server-2', command: 'cmd2' },
        { name: 'server-3', command: 'cmd3' },
        { name: 'server-4', command: 'cmd4' },
      ];
      const conflicts: ConflictResolution[] = [
        {
          serverName: 'server-1',
          projectConfig: { command: 'cmd1' },
          globalConfig: { command: 'different1' },
          resolution: 'skip',
        },
        {
          serverName: 'server-2',
          projectConfig: { command: 'cmd2' },
          globalConfig: { command: 'different2' },
          resolution: 'overwrite',
        },
        {
          serverName: 'server-3',
          projectConfig: { command: 'cmd3' },
          globalConfig: { command: 'different3' },
          resolution: 'rename',
          newName: 'server-3-new',
        },
      ];

      const result = applyResolutions(servers, conflicts);

      expect(result.length).toBe(3);
      expect(result.find(s => s.name === 'server-1')).toBeUndefined(); // skipped
      expect(result.find(s => s.name === 'server-2')).toBeDefined(); // overwrite
      expect(result.find(s => s.name === 'server-3-new')).toBeDefined(); // renamed
      expect(result.find(s => s.name === 'server-4')).toBeDefined(); // no conflict
    });
  });

  describe('createBackups', () => {
    const fs = require('fs-extra');
    const path = require('path');
    const os = require('os');

    let testDir: string;
    let projectConfigPath: string;
    let globalConfigPath: string;

    beforeEach(async () => {
      // Create temporary test directory
      testDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
      await fs.ensureDir(testDir);

      projectConfigPath = path.join(testDir, '.mcp.json');
      globalConfigPath = path.join(testDir, '.claude.json');

      // Create test config files
      await fs.writeJSON(projectConfigPath, { mcpServers: { 'test-server': { command: 'echo' } } });
      await fs.writeJSON(globalConfigPath, { mcpServers: { 'global-server': { command: 'node' } } });
    });

    afterEach(async () => {
      // Clean up test directory
      await fs.remove(testDir);
    });

    it('should create backup files for both configs', async () => {
      // Mock os.homedir to return testDir
      const originalHomedir = os.homedir;
      os.homedir = () => testDir;

      try {
        const backupPaths = await createBackups(testDir);

        // Verify backup paths are returned
        expect(backupPaths.projectBackup).toContain('.mcp.json.backup.');
        expect(backupPaths.globalBackup).toContain('.claude.json.backup.');
        expect(backupPaths.timestamp).toBeGreaterThan(0);

        // Verify backup files exist
        expect(await fs.pathExists(backupPaths.projectBackup)).toBe(true);
        expect(await fs.pathExists(backupPaths.globalBackup)).toBe(true);

        // Verify backup contents match originals
        const projectBackupContent = await fs.readJSON(backupPaths.projectBackup);
        const globalBackupContent = await fs.readJSON(backupPaths.globalBackup);

        expect(projectBackupContent).toEqual({ mcpServers: { 'test-server': { command: 'echo' } } });
        expect(globalBackupContent).toEqual({ mcpServers: { 'global-server': { command: 'node' } } });
      } finally {
        os.homedir = originalHomedir;
      }
    });

    it('should handle missing project config gracefully', async () => {
      const originalHomedir = os.homedir;
      os.homedir = () => testDir;

      try {
        // Remove project config
        await fs.remove(projectConfigPath);

        const backupPaths = await createBackups(testDir);

        // Project backup should not exist
        expect(await fs.pathExists(backupPaths.projectBackup)).toBe(false);

        // Global backup should exist
        expect(await fs.pathExists(backupPaths.globalBackup)).toBe(true);
      } finally {
        os.homedir = originalHomedir;
      }
    });

    it('should handle missing global config gracefully', async () => {
      const originalHomedir = os.homedir;
      os.homedir = () => testDir;

      try {
        // Remove global config
        await fs.remove(globalConfigPath);

        const backupPaths = await createBackups(testDir);

        // Project backup should exist
        expect(await fs.pathExists(backupPaths.projectBackup)).toBe(true);

        // Global backup should not exist
        expect(await fs.pathExists(backupPaths.globalBackup)).toBe(false);
      } finally {
        os.homedir = originalHomedir;
      }
    });

    it('should succeed even with nonexistent project directory', async () => {
      const originalHomedir = os.homedir;
      os.homedir = () => testDir;

      try {
        // Use invalid project directory but valid home directory
        const backupPaths = await createBackups('/nonexistent/invalid/path');

        // Should succeed - global backup should exist
        expect(await fs.pathExists(backupPaths.globalBackup)).toBe(true);

        // Project backup won't exist (directory doesn't exist)
        expect(await fs.pathExists(backupPaths.projectBackup)).toBe(false);
      } finally {
        os.homedir = originalHomedir;
      }
    });
  });

  describe('rollbackMigration', () => {
    const fs = require('fs-extra');
    const path = require('path');
    const os = require('os');

    let testDir: string;
    let projectConfigPath: string;
    let globalConfigPath: string;

    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), `mcp-test-rollback-${Date.now()}`);
      await fs.ensureDir(testDir);

      projectConfigPath = path.join(testDir, '.mcp.json');
      globalConfigPath = path.join(testDir, '.claude.json');
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should restore both config files from backups', async () => {
      const timestamp = Date.now();
      const projectBackup = `${projectConfigPath}.backup.${timestamp}`;
      const globalBackup = `${globalConfigPath}.backup.${timestamp}`;

      // Create backup files
      await fs.writeJSON(projectBackup, { mcpServers: { 'backup-project': { command: 'echo' } } });
      await fs.writeJSON(globalBackup, { mcpServers: { 'backup-global': { command: 'node' } } });

      // Create "corrupted" current files
      await fs.writeJSON(projectConfigPath, { mcpServers: { 'corrupted': { command: 'bad' } } });
      await fs.writeJSON(globalConfigPath, { mcpServers: { 'corrupted': { command: 'bad' } } });

      const backupPaths: BackupPaths = {
        projectBackup,
        globalBackup,
        timestamp,
      };

      await rollbackMigration(backupPaths);

      // Verify files were restored
      const restoredProject = await fs.readJSON(projectConfigPath);
      const restoredGlobal = await fs.readJSON(globalConfigPath);

      expect(restoredProject).toEqual({ mcpServers: { 'backup-project': { command: 'echo' } } });
      expect(restoredGlobal).toEqual({ mcpServers: { 'backup-global': { command: 'node' } } });

      // Verify backup files no longer exist (moved, not copied)
      expect(await fs.pathExists(projectBackup)).toBe(false);
      expect(await fs.pathExists(globalBackup)).toBe(false);
    });

    it('should handle missing project backup gracefully', async () => {
      const timestamp = Date.now();
      const projectBackup = `${projectConfigPath}.backup.${timestamp}`;
      const globalBackup = `${globalConfigPath}.backup.${timestamp}`;

      // Only create global backup
      await fs.writeJSON(globalBackup, { mcpServers: { 'backup-global': { command: 'node' } } });
      await fs.writeJSON(globalConfigPath, { mcpServers: { 'corrupted': { command: 'bad' } } });

      const backupPaths: BackupPaths = {
        projectBackup,
        globalBackup,
        timestamp,
      };

      await rollbackMigration(backupPaths);

      // Global should be restored
      const restoredGlobal = await fs.readJSON(globalConfigPath);
      expect(restoredGlobal).toEqual({ mcpServers: { 'backup-global': { command: 'node' } } });

      // Project backup didn't exist, should not throw error
      expect(await fs.pathExists(projectConfigPath)).toBe(false);
    });

    it('should succeed if backup files do not exist', async () => {
      const backupPaths: BackupPaths = {
        projectBackup: path.join(testDir, '.mcp.json.backup.999'),
        globalBackup: path.join(testDir, '.claude.json.backup.999'),
        timestamp: 999,
      };

      // Should not throw even if backups don't exist
      await expect(rollbackMigration(backupPaths)).resolves.not.toThrow();
    });
  });

  describe('executeMigration', () => {
    it('should throw if operation not in ready state', async () => {
      const operation: MigrationOperation = {
        id: 'test-1',
        projectDir: '/test/project',
        state: 'idle',
        selectedServers: [],
        conflicts: [],
        createdAt: new Date(),
      };

      await expect(executeMigration(operation)).rejects.toThrow("Cannot execute migration: operation state is 'idle', expected 'ready'");
    });

    // Note: Full executeMigration tests with file I/O will be in integration tests (T016-T018)
  });

  describe('initiateMigration', () => {
    const fs = require('fs-extra');
    const path = require('path');
    const os = require('os');

    let testDir: string;

    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), `mcp-test-init-${Date.now()}`);
      await fs.ensureDir(testDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should create MigrationOperation with ready state when no conflicts', async () => {
      const originalHomedir = os.homedir;
      os.homedir = () => testDir;

      try {
        // Create empty global config (no conflicts)
        await fs.writeJSON(path.join(testDir, '.claude.json'), { mcpServers: {} });

        const selectedServers = [
          { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
        ];

        const operation = await initiateMigration(testDir, selectedServers);

        expect(operation.id).toContain('migration-');
        expect(operation.projectDir).toBe(testDir);
        expect(operation.state).toBe('ready');
        expect(operation.selectedServers).toEqual(selectedServers);
        expect(operation.conflicts).toEqual([]);
        expect(operation.createdAt).toBeInstanceOf(Date);
      } finally {
        os.homedir = originalHomedir;
      }
    });

    it('should create MigrationOperation with conflict_resolution state when conflicts exist', async () => {
      const originalHomedir = os.homedir;
      os.homedir = () => testDir;

      try {
        // Create global config with conflicting server
        await fs.writeJSON(path.join(testDir, '.claude.json'), {
          mcpServers: {
            'server-1': { command: 'different-cmd' },
          },
        });

        const selectedServers = [
          { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
        ];

        const operation = await initiateMigration(testDir, selectedServers);

        expect(operation.state).toBe('conflict_resolution');
        expect(operation.conflicts.length).toBe(1);
        expect(operation.conflicts[0].serverName).toBe('server-1');
      } finally {
        os.homedir = originalHomedir;
      }
    });

    it('should throw if no servers selected', async () => {
      const selectedServers: any[] = [];

      await expect(initiateMigration(testDir, selectedServers)).rejects.toThrow('No servers selected for migration');
    });

    it('should throw if projectDir is invalid', async () => {
      const selectedServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 1 },
      ];

      await expect(initiateMigration('', selectedServers)).rejects.toThrow('Invalid projectDir');
    });

    it('should throw if selected servers are not project-local', async () => {
      const selectedServers = [
        { name: 'server-1', command: 'cmd1', hierarchyLevel: 0 }, // Not project-local
      ];

      await expect(initiateMigration(testDir, selectedServers)).rejects.toThrow('All selected servers must be project-local');
    });
  });
});

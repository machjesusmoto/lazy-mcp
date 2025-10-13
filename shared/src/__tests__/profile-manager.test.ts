/**
 * Tests for ProfileManager
 */

import { ProfileManager, Profile, ProfileSummary } from '../profile-manager';
import { BlockingRule } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('ProfileManager', () => {
  let manager: ProfileManager;
  let testProfilesDir: string;
  let testBlockedMdPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testProfilesDir = path.join(os.tmpdir(), `profiles-test-${Date.now()}`);
    testBlockedMdPath = path.join(os.tmpdir(), `blocked-test-${Date.now()}.md`);

    manager = new ProfileManager(testProfilesDir);
    await manager.init();
  });

  afterEach(async () => {
    // Cleanup test directories
    await fs.remove(testProfilesDir);
    if (await fs.pathExists(testBlockedMdPath)) {
      await fs.remove(testBlockedMdPath);
    }
  });

  describe('init', () => {
    it('should create profiles directory if it does not exist', async () => {
      const newDir = path.join(os.tmpdir(), `profiles-new-${Date.now()}`);
      const newManager = new ProfileManager(newDir);

      await newManager.init();

      expect(await fs.pathExists(newDir)).toBe(true);

      // Cleanup
      await fs.remove(newDir);
    });
  });

  describe('saveProfile and loadProfile', () => {
    it('should save and load a profile', async () => {
      const profile: Profile = {
        name: 'test-profile',
        description: 'Test profile',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: [
          { type: 'mcp', name: 'serena' },
          { type: 'memory', name: 'notes.md' }
        ],
        tags: ['test', 'development'],
        author: 'Test Author'
      };

      await manager.saveProfile(profile);

      const loaded = await manager.loadProfile('test-profile');

      expect(loaded.name).toBe(profile.name);
      expect(loaded.description).toBe(profile.description);
      expect(loaded.blockingRules).toEqual(profile.blockingRules);
      expect(loaded.tags).toEqual(profile.tags);
      expect(loaded.author).toBe(profile.author);
    });

    it('should preserve dates when saving and loading', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');

      const profile: Profile = {
        name: 'date-test',
        createdAt,
        updatedAt,
        blockingRules: []
      };

      await manager.saveProfile(profile);
      const loaded = await manager.loadProfile('date-test');

      expect(loaded.createdAt.toISOString()).toBe(createdAt.toISOString());
      expect(loaded.updatedAt.toISOString()).toBe(updatedAt.toISOString());
    });

    it('should throw error when loading non-existent profile', async () => {
      await expect(manager.loadProfile('non-existent'))
        .rejects.toThrow("Profile 'non-existent' not found");
    });
  });

  describe('deleteProfile', () => {
    it('should delete an existing profile', async () => {
      const profile: Profile = {
        name: 'to-delete',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: []
      };

      await manager.saveProfile(profile);
      expect(await manager.profileExists('to-delete')).toBe(true);

      await manager.deleteProfile('to-delete');
      expect(await manager.profileExists('to-delete')).toBe(false);
    });

    it('should throw error when deleting non-existent profile', async () => {
      await expect(manager.deleteProfile('non-existent'))
        .rejects.toThrow("Profile 'non-existent' not found");
    });
  });

  describe('profileExists', () => {
    it('should return true for existing profile', async () => {
      const profile: Profile = {
        name: 'exists-test',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: []
      };

      await manager.saveProfile(profile);

      expect(await manager.profileExists('exists-test')).toBe(true);
    });

    it('should return false for non-existent profile', async () => {
      expect(await manager.profileExists('does-not-exist')).toBe(false);
    });
  });

  describe('listProfiles', () => {
    it('should return empty array when no profiles exist', async () => {
      const profiles = await manager.listProfiles();
      expect(profiles).toEqual([]);
    });

    it('should list all profiles with summaries', async () => {
      const profile1: Profile = {
        name: 'profile-1',
        description: 'First profile',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: [{ type: 'mcp', name: 'server1' }],
        tags: ['tag1']
      };

      const profile2: Profile = {
        name: 'profile-2',
        description: 'Second profile',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: [
          { type: 'mcp', name: 'server2' },
          { type: 'memory', name: 'mem.md' }
        ],
        tags: ['tag2']
      };

      await manager.saveProfile(profile1);
      await manager.saveProfile(profile2);

      const profiles = await manager.listProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles[0].name).toBe('profile-1');
      expect(profiles[0].blockingRulesCount).toBe(1);
      expect(profiles[1].name).toBe('profile-2');
      expect(profiles[1].blockingRulesCount).toBe(2);
    });

    it('should sort profiles by name', async () => {
      await manager.saveProfile({ name: 'zebra', createdAt: new Date(), updatedAt: new Date(), blockingRules: [] });
      await manager.saveProfile({ name: 'apple', createdAt: new Date(), updatedAt: new Date(), blockingRules: [] });
      await manager.saveProfile({ name: 'banana', createdAt: new Date(), updatedAt: new Date(), blockingRules: [] });

      const profiles = await manager.listProfiles();

      expect(profiles[0].name).toBe('apple');
      expect(profiles[1].name).toBe('banana');
      expect(profiles[2].name).toBe('zebra');
    });

    it('should skip invalid profile files', async () => {
      // Create valid profile
      await manager.saveProfile({
        name: 'valid',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: []
      });

      // Create invalid profile file
      const invalidPath = path.join(testProfilesDir, 'invalid.json');
      await fs.writeFile(invalidPath, 'not valid json', 'utf-8');

      const profiles = await manager.listProfiles();

      // Should only return valid profile
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('valid');
    });
  });

  describe('createProfile', () => {
    it('should create a new profile', async () => {
      const blockingRules: BlockingRule[] = [
        { type: 'mcp', name: 'server1', reason: 'Not needed' }
      ];

      const profile = await manager.createProfile('new-profile', blockingRules, {
        description: 'New test profile',
        tags: ['new', 'test'],
        author: 'Test User'
      });

      expect(profile.name).toBe('new-profile');
      expect(profile.description).toBe('New test profile');
      expect(profile.blockingRules).toEqual(blockingRules);
      expect(profile.tags).toEqual(['new', 'test']);
      expect(profile.author).toBe('Test User');

      // Verify it was saved
      expect(await manager.profileExists('new-profile')).toBe(true);
    });

    it('should throw error if profile already exists', async () => {
      await manager.createProfile('existing', []);

      await expect(manager.createProfile('existing', []))
        .rejects.toThrow("Profile 'existing' already exists");
    });

    it('should set creation and update times to now', async () => {
      const before = new Date();
      const profile = await manager.createProfile('time-test', []);
      const after = new Date();

      expect(profile.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(profile.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(profile.updatedAt.getTime()).toBe(profile.createdAt.getTime());
    });
  });

  describe('updateProfile', () => {
    it('should update blocking rules', async () => {
      await manager.createProfile('update-test', [
        { type: 'mcp', name: 'old-server' }
      ]);

      const newRules: BlockingRule[] = [
        { type: 'mcp', name: 'new-server' }
      ];

      const updated = await manager.updateProfile('update-test', {
        blockingRules: newRules
      });

      expect(updated.blockingRules).toEqual(newRules);

      // Verify persistence
      const loaded = await manager.loadProfile('update-test');
      expect(loaded.blockingRules).toEqual(newRules);
    });

    it('should update description', async () => {
      await manager.createProfile('desc-test', [], {
        description: 'Old description'
      });

      await manager.updateProfile('desc-test', {
        description: 'New description'
      });

      const loaded = await manager.loadProfile('desc-test');
      expect(loaded.description).toBe('New description');
    });

    it('should update tags', async () => {
      await manager.createProfile('tags-test', [], {
        tags: ['old']
      });

      await manager.updateProfile('tags-test', {
        tags: ['new', 'tags']
      });

      const loaded = await manager.loadProfile('tags-test');
      expect(loaded.tags).toEqual(['new', 'tags']);
    });

    it('should update updatedAt timestamp', async () => {
      const profile = await manager.createProfile('time-update-test', []);
      const originalTime = profile.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await manager.updateProfile('time-update-test', {
        description: 'Updated'
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalTime.getTime());
    });

    it('should throw error when updating non-existent profile', async () => {
      await expect(manager.updateProfile('non-existent', {}))
        .rejects.toThrow("Profile 'non-existent' not found");
    });
  });

  describe('applyProfile', () => {
    it('should generate blocked.md with profile rules', async () => {
      const profile: Profile = {
        name: 'apply-test',
        description: 'Test profile for apply',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: [
          { type: 'mcp', name: 'serena', reason: 'Heavy usage' },
          { type: 'memory', name: 'notes.md' },
          { type: 'agent', name: 'test-writer', reason: 'Not needed' }
        ]
      };

      await manager.saveProfile(profile);
      await manager.applyProfile('apply-test', testBlockedMdPath);

      const content = await fs.readFile(testBlockedMdPath, 'utf-8');

      expect(content).toContain('Blocked Items - Profile: apply-test');
      expect(content).toContain('Test profile for apply');
      expect(content).toContain('mcp: serena # Heavy usage');
      expect(content).toContain('memory: notes.md');
      expect(content).toContain('agent: test-writer # Not needed');
    });

    it('should group rules by type', async () => {
      const profile: Profile = {
        name: 'grouped-test',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: [
          { type: 'agent', name: 'agent1' },
          { type: 'mcp', name: 'server1' },
          { type: 'memory', name: 'mem1' },
          { type: 'mcp', name: 'server2' },
          { type: 'memory', name: 'mem2' },
          { type: 'agent', name: 'agent2' }
        ]
      };

      await manager.saveProfile(profile);
      await manager.applyProfile('grouped-test', testBlockedMdPath);

      const content = await fs.readFile(testBlockedMdPath, 'utf-8');
      const lines = content.split('\n');

      // Find section headers
      const mcpIdx = lines.findIndex(l => l === '# MCP Servers');
      const memIdx = lines.findIndex(l => l === '# Memory Files');
      const agentIdx = lines.findIndex(l => l === '# Agents');

      // Verify sections exist and are ordered
      expect(mcpIdx).toBeGreaterThan(-1);
      expect(memIdx).toBeGreaterThan(mcpIdx);
      expect(agentIdx).toBeGreaterThan(memIdx);
    });

    it('should handle empty profile', async () => {
      const profile: Profile = {
        name: 'empty-test',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: []
      };

      await manager.saveProfile(profile);
      await manager.applyProfile('empty-test', testBlockedMdPath);

      const content = await fs.readFile(testBlockedMdPath, 'utf-8');

      expect(content).toContain('Blocked Items - Profile: empty-test');
      expect(content).not.toContain('# MCP Servers');
      expect(content).not.toContain('# Memory Files');
      expect(content).not.toContain('# Agents');
    });

    it('should create blocked.md directory if needed', async () => {
      const nestedPath = path.join(os.tmpdir(), `nested-${Date.now()}`, 'blocked.md');

      const profile: Profile = {
        name: 'nested-test',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: []
      };

      await manager.saveProfile(profile);
      await manager.applyProfile('nested-test', nestedPath);

      expect(await fs.pathExists(nestedPath)).toBe(true);

      // Cleanup
      await fs.remove(path.dirname(nestedPath));
    });
  });

  describe('exportProfile and importProfile', () => {
    it('should export profile to file', async () => {
      const profile: Profile = {
        name: 'export-test',
        description: 'Test export',
        createdAt: new Date(),
        updatedAt: new Date(),
        blockingRules: [{ type: 'mcp', name: 'server' }],
        tags: ['export']
      };

      await manager.saveProfile(profile);

      const exportPath = path.join(os.tmpdir(), `export-${Date.now()}.json`);
      await manager.exportProfile('export-test', exportPath);

      expect(await fs.pathExists(exportPath)).toBe(true);

      const exported = await fs.readJSON(exportPath);
      expect(exported.name).toBe('export-test');
      expect(exported.blockingRules).toHaveLength(1);

      // Cleanup
      await fs.remove(exportPath);
    });

    it('should import profile from file', async () => {
      const importData = {
        name: 'import-test',
        description: 'Imported profile',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blockingRules: [{ type: 'mcp', name: 'imported-server' }],
        tags: ['import']
      };

      const importPath = path.join(os.tmpdir(), `import-${Date.now()}.json`);
      await fs.writeJSON(importPath, importData);

      const imported = await manager.importProfile(importPath);

      expect(imported.name).toBe('import-test');
      expect(imported.blockingRules).toHaveLength(1);
      expect(await manager.profileExists('import-test')).toBe(true);

      // Cleanup
      await fs.remove(importPath);
    });

    it('should throw error when importing without overwrite flag', async () => {
      await manager.createProfile('existing-import', []);

      const importData = {
        name: 'existing-import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blockingRules: []
      };

      const importPath = path.join(os.tmpdir(), `import-conflict-${Date.now()}.json`);
      await fs.writeJSON(importPath, importData);

      await expect(manager.importProfile(importPath, false))
        .rejects.toThrow("Profile 'existing-import' already exists");

      // Cleanup
      await fs.remove(importPath);
    });

    it('should overwrite when overwrite flag is true', async () => {
      await manager.createProfile('overwrite-test', [], {
        description: 'Original'
      });

      const importData = {
        name: 'overwrite-test',
        description: 'Overwritten',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blockingRules: []
      };

      const importPath = path.join(os.tmpdir(), `import-overwrite-${Date.now()}.json`);
      await fs.writeJSON(importPath, importData);

      await manager.importProfile(importPath, true);

      const loaded = await manager.loadProfile('overwrite-test');
      expect(loaded.description).toBe('Overwritten');

      // Cleanup
      await fs.remove(importPath);
    });
  });

  describe('getProfilesDirectory', () => {
    it('should return the profiles directory path', () => {
      const dir = manager.getProfilesDirectory();
      expect(dir).toBe(testProfilesDir);
    });
  });
});

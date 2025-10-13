/**
 * Profile Management System
 *
 * Manages named profiles for quick context switching.
 * Profiles save/restore blocking rules for different scenarios.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { BlockingRule } from './types';

/**
 * Profile metadata and configuration
 */
export interface Profile {
  /** Unique profile name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** When the profile was created */
  createdAt: Date;
  /** When the profile was last modified */
  updatedAt: Date;
  /** Blocking rules for this profile */
  blockingRules: BlockingRule[];
  /** Tags for categorization */
  tags?: string[];
  /** Creator/author of the profile */
  author?: string;
}

/**
 * Profile storage format (on disk)
 */
interface ProfileStorageFormat {
  name: string;
  description?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  blockingRules: BlockingRule[];
  tags?: string[];
  author?: string;
}

/**
 * Profile list summary
 */
export interface ProfileSummary {
  name: string;
  description?: string;
  blockingRulesCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

/**
 * Manages profile storage, loading, and switching
 */
export class ProfileManager {
  private profilesDir: string;

  constructor(profilesDir?: string) {
    this.profilesDir = profilesDir || path.join(
      os.homedir(),
      '.config',
      'mcp-toggle',
      'profiles'
    );
  }

  /**
   * Initialize profiles directory if it doesn't exist
   */
  async init(): Promise<void> {
    await fs.ensureDir(this.profilesDir);
  }

  /**
   * Save a profile
   */
  async saveProfile(profile: Profile): Promise<void> {
    await this.init();

    const storageFormat: ProfileStorageFormat = {
      name: profile.name,
      description: profile.description,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      blockingRules: profile.blockingRules,
      tags: profile.tags,
      author: profile.author
    };

    const profilePath = this.getProfilePath(profile.name);
    await fs.writeJSON(profilePath, storageFormat, { spaces: 2 });
  }

  /**
   * Load a profile by name
   */
  async loadProfile(name: string): Promise<Profile> {
    const profilePath = this.getProfilePath(name);

    if (!await fs.pathExists(profilePath)) {
      throw new Error(`Profile '${name}' not found`);
    }

    const stored: ProfileStorageFormat = await fs.readJSON(profilePath);

    return {
      name: stored.name,
      description: stored.description,
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
      blockingRules: stored.blockingRules,
      tags: stored.tags,
      author: stored.author
    };
  }

  /**
   * Delete a profile
   */
  async deleteProfile(name: string): Promise<void> {
    const profilePath = this.getProfilePath(name);

    if (!await fs.pathExists(profilePath)) {
      throw new Error(`Profile '${name}' not found`);
    }

    await fs.remove(profilePath);
  }

  /**
   * Check if a profile exists
   */
  async profileExists(name: string): Promise<boolean> {
    const profilePath = this.getProfilePath(name);
    return fs.pathExists(profilePath);
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<ProfileSummary[]> {
    await this.init();

    const files = await fs.readdir(this.profilesDir);
    const profileFiles = files.filter(f => f.endsWith('.json'));

    const summaries: ProfileSummary[] = [];

    for (const file of profileFiles) {
      try {
        const profilePath = path.join(this.profilesDir, file);
        const stored: ProfileStorageFormat = await fs.readJSON(profilePath);

        summaries.push({
          name: stored.name,
          description: stored.description,
          blockingRulesCount: stored.blockingRules.length,
          createdAt: new Date(stored.createdAt),
          updatedAt: new Date(stored.updatedAt),
          tags: stored.tags
        });
      } catch (error) {
        // Skip invalid profile files
        console.warn(`Skipping invalid profile file: ${file}`);
      }
    }

    // Sort by name
    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Create a new profile from current blocking rules
   */
  async createProfile(
    name: string,
    blockingRules: BlockingRule[],
    options: {
      description?: string;
      tags?: string[];
      author?: string;
    } = {}
  ): Promise<Profile> {
    // Check if profile already exists
    if (await this.profileExists(name)) {
      throw new Error(`Profile '${name}' already exists`);
    }

    const now = new Date();
    const profile: Profile = {
      name,
      description: options.description,
      createdAt: now,
      updatedAt: now,
      blockingRules,
      tags: options.tags,
      author: options.author
    };

    await this.saveProfile(profile);
    return profile;
  }

  /**
   * Update an existing profile
   */
  async updateProfile(
    name: string,
    updates: {
      blockingRules?: BlockingRule[];
      description?: string;
      tags?: string[];
    }
  ): Promise<Profile> {
    const profile = await this.loadProfile(name);

    if (updates.blockingRules !== undefined) {
      profile.blockingRules = updates.blockingRules;
    }
    if (updates.description !== undefined) {
      profile.description = updates.description;
    }
    if (updates.tags !== undefined) {
      profile.tags = updates.tags;
    }

    profile.updatedAt = new Date();

    await this.saveProfile(profile);
    return profile;
  }

  /**
   * Apply a profile (write blocking rules to blocked.md)
   */
  async applyProfile(
    profileName: string,
    blockedMdPath: string = path.join(os.homedir(), '.claude', 'blocked.md')
  ): Promise<void> {
    const profile = await this.loadProfile(profileName);

    // Generate blocked.md content
    const lines: string[] = [
      `# Blocked Items - Profile: ${profile.name}`,
      ''
    ];

    if (profile.description) {
      lines.push(`# ${profile.description}`, '');
    }

    lines.push(`# Applied: ${new Date().toISOString()}`, '');

    // Group rules by type
    const mcpRules = profile.blockingRules.filter(r => r.type === 'mcp');
    const memoryRules = profile.blockingRules.filter(r => r.type === 'memory');
    const agentRules = profile.blockingRules.filter(r => r.type === 'agent');

    if (mcpRules.length > 0) {
      lines.push('# MCP Servers');
      for (const rule of mcpRules) {
        const comment = rule.reason ? ` # ${rule.reason}` : '';
        lines.push(`mcp: ${rule.name}${comment}`);
      }
      lines.push('');
    }

    if (memoryRules.length > 0) {
      lines.push('# Memory Files');
      for (const rule of memoryRules) {
        const comment = rule.reason ? ` # ${rule.reason}` : '';
        lines.push(`memory: ${rule.name}${comment}`);
      }
      lines.push('');
    }

    if (agentRules.length > 0) {
      lines.push('# Agents');
      for (const rule of agentRules) {
        const comment = rule.reason ? ` # ${rule.reason}` : '';
        lines.push(`agent: ${rule.name}${comment}`);
      }
      lines.push('');
    }

    // Write to blocked.md
    await fs.ensureDir(path.dirname(blockedMdPath));
    await fs.writeFile(blockedMdPath, lines.join('\n'), 'utf-8');
  }

  /**
   * Export profile to file
   */
  async exportProfile(name: string, outputPath: string): Promise<void> {
    const profile = await this.loadProfile(name);

    const storageFormat: ProfileStorageFormat = {
      name: profile.name,
      description: profile.description,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      blockingRules: profile.blockingRules,
      tags: profile.tags,
      author: profile.author
    };

    await fs.writeJSON(outputPath, storageFormat, { spaces: 2 });
  }

  /**
   * Import profile from file
   */
  async importProfile(filePath: string, overwrite: boolean = false): Promise<Profile> {
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stored: ProfileStorageFormat = await fs.readJSON(filePath);

    // Check if profile already exists
    if (!overwrite && await this.profileExists(stored.name)) {
      throw new Error(`Profile '${stored.name}' already exists. Use overwrite=true to replace.`);
    }

    const profile: Profile = {
      name: stored.name,
      description: stored.description,
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
      blockingRules: stored.blockingRules,
      tags: stored.tags,
      author: stored.author
    };

    await this.saveProfile(profile);
    return profile;
  }

  /**
   * Get the file path for a profile
   */
  private getProfilePath(name: string): string {
    // Sanitize profile name for filesystem
    const sanitized = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.profilesDir, `${sanitized}.json`);
  }

  /**
   * Get profiles directory path
   */
  getProfilesDirectory(): string {
    return this.profilesDir;
  }
}

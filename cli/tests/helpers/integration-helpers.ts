/**
 * Integration test helper utilities
 * Feature: 003-add-migrate-to
 *
 * Provides helpers for creating test environments and assertions.
 * Part of Task T009 from implementation plan.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Creates complete project structure with .claude directories
 */
export async function createProjectStructure(
  baseDir: string
): Promise<{ projectDir: string; userDir: string }> {
  const projectDir = path.join(baseDir, 'project');
  const userDir = path.join(baseDir, 'user-home');

  // Create project .claude structure
  await fs.ensureDir(path.join(projectDir, '.claude', 'agents'));
  await fs.ensureDir(path.join(projectDir, '.claude', 'memories'));

  // Create user .claude structure
  await fs.ensureDir(path.join(userDir, '.claude', 'agents'));
  await fs.ensureDir(path.join(userDir, '.claude', 'memories'));

  return { projectDir, userDir };
}

/**
 * Populates directory with agent files
 */
export async function populateWithAgents(
  baseDir: string,
  agentNames: string[]
): Promise<string[]> {
  const agentsDir = path.join(baseDir, '.claude', 'agents');
  await fs.ensureDir(agentsDir);

  const paths: string[] = [];

  for (const name of agentNames) {
    const agentPath = path.join(agentsDir, name);
    await fs.ensureDir(path.dirname(agentPath));

    const content = `---
name: ${path.basename(name, '.md')}
version: 1.0.0
description: Test agent for ${name}
---
# ${name}

Agent instructions go here.
`;

    await fs.writeFile(agentPath, content, 'utf-8');
    paths.push(agentPath);
  }

  return paths;
}

/**
 * Populates directory with memory files
 */
export async function populateWithMemories(
  baseDir: string,
  files: Record<string, string>
): Promise<string[]> {
  const memoriesDir = path.join(baseDir, '.claude', 'memories');
  await fs.ensureDir(memoriesDir);

  const paths: string[] = [];

  for (const [filename, content] of Object.entries(files)) {
    const memoryPath = path.join(memoriesDir, filename);
    await fs.ensureDir(path.dirname(memoryPath));
    await fs.writeFile(memoryPath, content, 'utf-8');
    paths.push(memoryPath);
  }

  return paths;
}

/**
 * Verifies settings.json is valid JSON with correct structure
 */
export async function verifySettingsJson(settingsPath: string): Promise<void> {
  const exists = await fs.pathExists(settingsPath);
  if (!exists) {
    throw new Error(`Settings file does not exist: ${settingsPath}`);
  }

  const content = await fs.readFile(settingsPath, 'utf-8');

  // Parse JSON (will throw if invalid)
  const settings = JSON.parse(content);

  // Verify structure
  if (!settings.permissions) {
    throw new Error('Settings missing permissions field');
  }

  if (!Array.isArray(settings.permissions.deny)) {
    throw new Error('Settings permissions.deny is not an array');
  }

  // Verify each deny pattern
  for (const deny of settings.permissions.deny) {
    if (!deny.type || !deny.pattern) {
      throw new Error('Invalid deny pattern structure');
    }
    if (deny.type !== 'agent' && deny.type !== 'memory') {
      throw new Error(`Invalid deny type: ${deny.type}`);
    }
  }
}

/**
 * Cleans up test environment
 */
export async function cleanupTestEnvironment(baseDir: string): Promise<void> {
  await fs.remove(baseDir);
}

/**
 * Creates a mock .mcp.json file for testing
 */
export async function createMockMcpJson(
  projectDir: string,
  servers: Record<string, unknown>
): Promise<string> {
  const mcpJsonPath = path.join(projectDir, '.mcp.json');
  const content = JSON.stringify({ mcpServers: servers }, null, 2);
  await fs.writeFile(mcpJsonPath, content, 'utf-8');
  return mcpJsonPath;
}

/**
 * Asserts that a file exists
 */
export async function assertFileExists(filePath: string): Promise<void> {
  const exists = await fs.pathExists(filePath);
  if (!exists) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Asserts that a file does not exist
 */
export async function assertFileNotExists(filePath: string): Promise<void> {
  const exists = await fs.pathExists(filePath);
  if (exists) {
    throw new Error(`Expected file to not exist: ${filePath}`);
  }
}

/**
 * Asserts that JSON file has expected structure
 */
export async function assertJsonStructure(
  filePath: string,
  expectedKeys: string[]
): Promise<void> {
  await assertFileExists(filePath);

  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  for (const key of expectedKeys) {
    if (!(key in json)) {
      throw new Error(`Expected JSON to have key: ${key}`);
    }
  }
}

/**
 * Creates settings.json with specific deny patterns
 */
export async function createSettingsWithDenyPatterns(
  projectDir: string,
  patterns: Array<{ type: 'agent' | 'memory'; pattern: string }>
): Promise<string> {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  await fs.ensureDir(path.dirname(settingsPath));

  const settings = {
    permissions: {
      deny: patterns,
    },
  };

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  return settingsPath;
}

/**
 * Reads settings.json and returns deny patterns
 */
export async function readDenyPatterns(
  projectDir: string
): Promise<Array<{ type: 'agent' | 'memory'; pattern: string }>> {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');

  const exists = await fs.pathExists(settingsPath);
  if (!exists) {
    return [];
  }

  const content = await fs.readFile(settingsPath, 'utf-8');
  const settings = JSON.parse(content);

  return settings.permissions?.deny || [];
}

/**
 * Asserts deny pattern count
 */
export async function assertDenyPatternCount(
  projectDir: string,
  expectedCount: number
): Promise<void> {
  const patterns = await readDenyPatterns(projectDir);
  if (patterns.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} deny patterns, found ${patterns.length}`
    );
  }
}

/**
 * Asserts specific deny pattern exists
 */
export async function assertDenyPatternExists(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<void> {
  const patterns = await readDenyPatterns(projectDir);
  const exists = patterns.some((p) => p.type === type && p.pattern === pattern);

  if (!exists) {
    throw new Error(`Expected deny pattern not found: ${type}:${pattern}`);
  }
}

/**
 * Asserts specific deny pattern does not exist
 */
export async function assertDenyPatternNotExists(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<void> {
  const patterns = await readDenyPatterns(projectDir);
  const exists = patterns.some((p) => p.type === type && p.pattern === pattern);

  if (exists) {
    throw new Error(`Expected deny pattern to not exist: ${type}:${pattern}`);
  }
}

/**
 * Simulates permission error by making directory read-only
 */
export async function simulatePermissionError(
  dirPath: string,
  callback: () => Promise<void>
): Promise<void> {
  await fs.chmod(dirPath, 0o444);

  try {
    await callback();
  } finally {
    // Always restore permissions
    await fs.chmod(dirPath, 0o755);
  }
}

/**
 * Creates temporary test directory with unique name
 */
export async function createTempTestDir(prefix = 'mcp-toggle-test-'): Promise<string> {
  const { tmpdir } = await import('os');
  const testDir = path.join(
    tmpdir(),
    `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.ensureDir(testDir);
  return testDir;
}

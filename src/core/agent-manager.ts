/**
 * Agent Manager
 *
 * Feature: 004-comprehensive-context-management
 * User Story: US2 (Agent Discovery & Management)
 * Tasks: T021-T025
 *
 * Discovers, loads, and manages subagents from project and user directories.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import fg from 'fast-glob';
import { parseFrontmatter } from '../utils/frontmatter-parser';
import { estimateMarkdownTokens } from '../utils/token-estimator';
import type { SubAgent, AgentSource } from '../models/types';

/**
 * Load and parse a single agent file
 *
 * Task: T021
 *
 * @param filePath - Absolute path to agent markdown file
 * @param source - Source location (project or user)
 * @returns Parsed SubAgent object
 * @throws Error if file cannot be read or parsed
 */
export async function loadAgentFile(
  filePath: string,
  source: AgentSource
): Promise<SubAgent> {
  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');

  // Parse frontmatter
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    throw new Error(`Invalid frontmatter in agent file: ${filePath}`);
  }

  const { frontmatter } = parsed;

  // Validate required fields
  if (!frontmatter.name || typeof frontmatter.name !== 'string') {
    throw new Error(`Agent file missing required 'name' field: ${filePath}`);
  }
  if (!frontmatter.description || typeof frontmatter.description !== 'string') {
    throw new Error(`Agent file missing required 'description' field: ${filePath}`);
  }

  // Extract short description (first line or sentence)
  const description = extractShortDescription(frontmatter.description);

  // Parse tools if present
  const tools = frontmatter.tools
    ? frontmatter.tools.split(',').map((t: string) => t.trim())
    : undefined;

  return {
    name: frontmatter.name,
    description,
    filePath,
    source,
    isOverride: false, // Will be determined by mergeWithOverrides
    isBlocked: false,  // Will be determined by checkAgentBlockedStatus
    model: frontmatter.model,
    tools,
    color: frontmatter.color,
    estimatedTokens: estimateMarkdownTokens(content),
  };
}

/**
 * Extract short description from potentially multiline frontmatter value
 *
 * @param description - Full description text
 * @returns Short description for display (first substantial line)
 */
function extractShortDescription(description: string): string {
  // Split by newlines and take first non-empty line
  const lines = description.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('<') && !trimmed.startsWith('user:')) {
      // Return first substantial line (not XML tags or examples)
      return trimmed;
    }
  }

  // Fallback: truncate at first sentence
  const firstSentence = description.match(/^[^.!?]+[.!?]/);
  if (firstSentence) {
    return firstSentence[0].trim();
  }

  // Last resort: truncate at 100 chars
  return description.slice(0, 100).trim() + (description.length > 100 ? '...' : '');
}

/**
 * Scan directory for agent markdown files
 *
 * Task: T022
 *
 * @param dir - Absolute path to agents directory
 * @param source - Source location (project or user)
 * @returns Array of parsed SubAgent objects
 */
export async function loadAgentsFromDir(
  dir: string,
  source: AgentSource
): Promise<SubAgent[]> {
  // Check if directory exists
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  // Find all .md files recursively
  const agentFiles = await fg('**/*.md', {
    cwd: dir,
    absolute: true,
    onlyFiles: true,
  });

  // Load each agent file
  const agents: SubAgent[] = [];
  for (const filePath of agentFiles) {
    try {
      const agent = await loadAgentFile(filePath, source);
      agents.push(agent);
    } catch (error) {
      // Log error but continue loading other agents
      console.warn(`Failed to load agent file ${filePath}:`, error);
    }
  }

  return agents;
}

/**
 * Merge project and user agents, detecting overrides
 *
 * Task: T023
 *
 * Project agents with the same name override user agents.
 * User agents that are overridden are marked with isOverride: true.
 *
 * @param projectAgents - Agents from project .claude/agents/
 * @param userAgents - Agents from ~/.claude/agents/
 * @returns Merged array with override status set
 */
export function mergeWithOverrides(
  projectAgents: SubAgent[],
  userAgents: SubAgent[]
): SubAgent[] {
  // Create a map of project agent names for quick lookup
  const projectNames = new Set(projectAgents.map(agent => agent.name));

  // Mark user agents as overridden if project has same name
  const processedUserAgents = userAgents.map(agent => ({
    ...agent,
    isOverride: projectNames.has(agent.name),
  }));

  // Combine: project agents first, then non-overridden user agents
  const nonOverriddenUserAgents = processedUserAgents.filter(
    agent => !agent.isOverride
  );

  return [...projectAgents, ...nonOverriddenUserAgents];
}

/**
 * Discover all available agents (project + user)
 *
 * Task: T024
 *
 * @param projectDir - Absolute path to project directory
 * @returns Complete list of agents with override detection
 */
export async function discoverAgents(projectDir: string): Promise<SubAgent[]> {
  // Load project agents
  const projectAgentsDir = path.join(projectDir, '.claude', 'agents');
  const projectAgents = await loadAgentsFromDir(projectAgentsDir, 'project');

  // Load user agents
  const userAgentsDir = path.join(os.homedir(), '.claude', 'agents');
  const userAgents = await loadAgentsFromDir(userAgentsDir, 'user');

  // Merge with override detection
  return mergeWithOverrides(projectAgents, userAgents);
}

/**
 * Check blocked status for all agents
 *
 * Task: T025
 *
 * @param projectDir - Absolute path to project directory
 * @param agents - List of agents to check
 * @returns Agents with isBlocked field updated
 */
export async function checkAgentBlockedStatus(
  projectDir: string,
  agents: SubAgent[]
): Promise<SubAgent[]> {
  const { isDenied } = await import('./settings-manager');

  const checkedAgents = await Promise.all(
    agents.map(async (agent) => {
      // Extract filename from agent filePath
      const fileName = path.basename(agent.filePath);

      // Check if agent is in deny patterns
      const isBlocked = await isDenied(projectDir, 'agent', fileName);

      return {
        ...agent,
        isBlocked,
      };
    })
  );

  return checkedAgents;
}

/**
 * Block an agent via permissions.deny
 *
 * Task: T029
 *
 * @param projectDir - Absolute path to project directory
 * @param agentName - Name of agent (without .md extension)
 */
export async function blockAgent(
  projectDir: string,
  agentName: string
): Promise<void> {
  const { addDenyPattern } = await import('./settings-manager');

  // Agent filename pattern
  const pattern = `${agentName}.md`;

  await addDenyPattern(projectDir, 'agent', pattern);
}

/**
 * Unblock an agent by removing from permissions.deny
 *
 * Task: T029
 *
 * @param projectDir - Absolute path to project directory
 * @param agentName - Name of agent (without .md extension)
 */
export async function unblockAgent(
  projectDir: string,
  agentName: string
): Promise<void> {
  const { removeDenyPattern } = await import('./settings-manager');

  // Agent filename pattern
  const pattern = `${agentName}.md`;

  await removeDenyPattern(projectDir, 'agent', pattern);
}

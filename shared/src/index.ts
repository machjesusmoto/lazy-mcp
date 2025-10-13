/**
 * @mcp-toggle/shared
 * Version: 2.0.0
 *
 * Shared core library for mcp-toggle plugin and CLI.
 * Provides common business logic, types, and utilities.
 */

// Export version constant
export const SHARED_VERSION = '2.0.0';

// Export all types
export * from './types';

// Export utilities
export { readMcpJson, isBlockedServer } from './utils/mcp-json-utils';

// Export core classes
export { ConfigLoader } from './config-loader';
export { MemoryLoader } from './memory-loader';
export { AgentLoader } from './agent-loader';
export { ProjectContextBuilder } from './project-context-builder';
export { LazyMCPGenerator } from './lazy-mcp-generator';
export type { LazyMCPConfig, LazyMCPGeneratorOptions } from './lazy-mcp-generator';
export { ProfileManager } from './profile-manager';
export type { Profile, ProfileSummary } from './profile-manager';

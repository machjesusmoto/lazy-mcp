/**
 * Creates a temporary test directory.
 * Returns the absolute path to the directory.
 */
export declare function createTempDir(prefix?: string): Promise<string>;
/**
 * Cleans up a temporary test directory.
 */
export declare function cleanupTempDir(dirPath: string): Promise<void>;
/**
 * Creates a mock .claude.json file with specified MCP servers.
 */
export declare function createMockClaudeJson(dirPath: string, servers: Record<string, unknown>): Promise<string>;
/**
 * Creates mock memory files in .claude/memories/ directory.
 */
export declare function createMockMemoryFiles(dirPath: string, files: Record<string, string>): Promise<string[]>;
/**
 * Creates a mock blocked.md file.
 */
export declare function createMockBlockedMd(dirPath: string, blockedItems: Array<{
    type: 'mcp' | 'memory';
    identifier: string;
}>): Promise<string>;
/**
 * Reads the content of a file.
 */
export declare function readFile(filePath: string): Promise<string>;
/**
 * Checks if a file exists.
 */
export declare function fileExists(filePath: string): Promise<boolean>;
//# sourceMappingURL=test-utils.d.ts.map
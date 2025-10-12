# API Documentation

**Version**: v0.4.0
**Last Updated**: 2025-10-09

This document provides comprehensive API documentation for all exported functions in mcp-toggle. Use these functions when building tools or scripts that integrate with mcp-toggle's context management capabilities.

## Table of Contents

1. [Settings Manager](#settings-manager)
2. [Agent Manager](#agent-manager)
3. [Memory Loader](#memory-loader)
4. [Project Context Builder](#project-context-builder)
5. [File Utilities](#file-utilities)
6. [Error Handling](#error-handling)

---

## Settings Manager

**Module**: `src/core/settings-manager.ts`

Manages `.claude/settings.json` using atomic write patterns for safe concurrent access.

### loadSettings

Load settings from `.claude/settings.json`. Creates file with defaults if it doesn't exist.

```typescript
async function loadSettings(projectDir: string): Promise<SettingsJson>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory

**Returns**: Promise<SettingsJson> - Parsed settings object

**Throws**:
- `Error` - If settings.json contains invalid JSON

**Example**:
```typescript
import { loadSettings } from 'mcp-toggle/core/settings-manager';

const settings = await loadSettings('/home/user/my-project');
console.log(settings.permissions.deny);
// Output: [{ type: 'memory', pattern: 'notes.md' }]
```

**Notes**:
- Creates `.claude/settings.json` if missing
- Ensures `permissions.deny` array exists
- Uses file locking to prevent concurrent access issues

---

### updateSettings

Update settings.json with partial updates using atomic write pattern.

```typescript
async function updateSettings(
  projectDir: string,
  updates: Partial<SettingsJson>
): Promise<void>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory
- `updates` (Partial<SettingsJson>): Partial settings to merge

**Returns**: Promise<void>

**Throws**:
- `Error` - If settings.json contains invalid JSON
- `Error` - If atomic write fails

**Example**:
```typescript
import { updateSettings } from 'mcp-toggle/core/settings-manager';

await updateSettings('/home/user/my-project', {
  permissions: {
    deny: [
      { type: 'memory', pattern: 'sensitive.md' }
    ]
  }
});
```

**Notes**:
- Preserves existing settings not included in updates
- Uses deep merge for `permissions` object
- Atomic write with automatic rollback on failure

---

### addDenyPattern

Add a deny pattern to settings. Prevents duplicates automatically.

```typescript
async function addDenyPattern(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<void>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory
- `type` ('agent' | 'memory'): Type of resource to deny
- `pattern` (string): Relative path pattern to block

**Returns**: Promise<void>

**Example**:
```typescript
import { addDenyPattern } from 'mcp-toggle/core/settings-manager';

// Block a memory file
await addDenyPattern(
  '/home/user/my-project',
  'memory',
  'notes.md'
);

// Block an agent
await addDenyPattern(
  '/home/user/my-project',
  'agent',
  'security-scanner.md'
);

// Block with subdirectory
await addDenyPattern(
  '/home/user/my-project',
  'memory',
  'archive/old-docs.md'
);
```

**Notes**:
- Idempotent - adding same pattern twice has no effect
- Pattern matching is exact (not regex)
- Relative paths should match file structure in `.claude/`

---

### removeDenyPattern

Remove a deny pattern from settings.

```typescript
async function removeDenyPattern(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<void>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory
- `type` ('agent' | 'memory'): Type of resource to unblock
- `pattern` (string): Relative path pattern to unblock

**Returns**: Promise<void>

**Example**:
```typescript
import { removeDenyPattern } from 'mcp-toggle/core/settings-manager';

// Unblock a memory file
await removeDenyPattern(
  '/home/user/my-project',
  'memory',
  'notes.md'
);
```

**Notes**:
- Only removes patterns that match both type AND pattern
- Idempotent - removing non-existent pattern has no effect

---

### isDenied

Check if a resource is currently denied.

```typescript
async function isDenied(
  projectDir: string,
  type: 'agent' | 'memory',
  pattern: string
): Promise<boolean>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory
- `type` ('agent' | 'memory'): Type of resource to check
- `pattern` (string): Relative path pattern to check

**Returns**: Promise<boolean> - True if pattern is denied

**Example**:
```typescript
import { isDenied } from 'mcp-toggle/core/settings-manager';

const isBlocked = await isDenied(
  '/home/user/my-project',
  'memory',
  'notes.md'
);

if (isBlocked) {
  console.log('notes.md is blocked');
}
```

**Notes**:
- Returns `false` if settings.json doesn't exist
- Returns `false` if pattern not found in deny list
- Safe to call on non-existent projects

---

## Agent Manager

**Module**: `src/core/agent-manager.ts`

Discovers and manages agents from project and user directories.

### discoverAgents

Discover agents from project and user directories.

```typescript
async function discoverAgents(
  projectDir: string,
  userAgentsDir?: string
): Promise<AgentFile[]>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory
- `userAgentsDir` (string, optional): Path to user agents directory (defaults to `~/.claude/agents/`)

**Returns**: Promise<AgentFile[]> - List of discovered agents with hierarchy information

**Example**:
```typescript
import { discoverAgents } from 'mcp-toggle/core/agent-manager';
import * as os from 'os';
import * as path from 'path';

const agents = await discoverAgents(
  '/home/user/my-project',
  path.join(os.homedir(), '.claude', 'agents')
);

for (const agent of agents) {
  console.log(`${agent.name}: level ${agent.hierarchyLevel}`);
}
// Output:
// rapid-prototyper.md: level 1 (project)
// test-writer.md: level 0 (user)
```

**Agent Discovery Logic**:
- Searches `.claude/agents/` in project directory (hierarchyLevel = 1)
- Searches `~/.claude/agents/` if `userAgentsDir` provided (hierarchyLevel = 0)
- Recursively finds all `.md` files
- Parses YAML frontmatter if present

**Notes**:
- Returns empty array if directories don't exist
- User agents only discovered if `userAgentsDir` explicitly provided
- Includes subdirectories (e.g., `category/agent.md`)

---

### loadAgentFile

Load and parse a single agent file.

```typescript
async function loadAgentFile(
  filePath: string,
  relativeName: string,
  hierarchyLevel: 0 | 1
): Promise<AgentFile>
```

**Parameters**:
- `filePath` (string): Absolute path to agent file
- `relativeName` (string): Relative name (e.g., "category/agent.md")
- `hierarchyLevel` (0 | 1): Hierarchy level (0=user, 1=project)

**Returns**: Promise<AgentFile> - Agent file with parsed frontmatter

**Example**:
```typescript
import { loadAgentFile } from 'mcp-toggle/core/agent-manager';

const agent = await loadAgentFile(
  '/home/user/my-project/.claude/agents/test-writer.md',
  'test-writer.md',
  1
);

console.log(agent.frontmatter?.name);
// Output: "Test Writer Agent"
```

**Frontmatter Example**:
```markdown
---
name: Test Writer Agent
description: Automated test generation
model: claude-3-opus-20240229
tools: ["read", "write", "bash"]
---

# Test Writer Agent

Agent instructions here...
```

**Notes**:
- Returns `undefined` for `frontmatter` if not present
- Frontmatter must be valid YAML
- Supports any custom frontmatter fields

---

### mergeWithOverrides

Merge agents and detect overrides. Project agents override user agents with the same name.

```typescript
function mergeWithOverrides(agents: AgentFile[]): AgentFile[]
```

**Parameters**:
- `agents` (AgentFile[]): List of discovered agents

**Returns**: AgentFile[] - Merged list with duplicates removed

**Example**:
```typescript
import { discoverAgents, mergeWithOverrides } from 'mcp-toggle/core/agent-manager';

const allAgents = await discoverAgents(projectDir, userAgentsDir);
const merged = mergeWithOverrides(allAgents);

// If both project and user have "test-writer.md"
// Only project version is returned
```

**Merge Logic**:
1. Group agents by name
2. Sort by hierarchyLevel (descending): project (1) before user (0)
3. Take highest level for each name
4. Return deduplicated list

**Notes**:
- Project agents (level 1) always win over user agents (level 0)
- Useful for displaying effective agent list
- Does not modify settings.json

---

### parseAgentFrontmatter

Parse YAML frontmatter from agent markdown content.

```typescript
function parseAgentFrontmatter(content: string): AgentFrontmatter | undefined
```

**Parameters**:
- `content` (string): Markdown file content

**Returns**: AgentFrontmatter | undefined - Parsed frontmatter or undefined

**Example**:
```typescript
import { parseAgentFrontmatter } from 'mcp-toggle/core/agent-manager';
import * as fs from 'fs-extra';

const content = await fs.readFile('agent.md', 'utf-8');
const frontmatter = parseAgentFrontmatter(content);

if (frontmatter) {
  console.log(frontmatter.name);
  console.log(frontmatter.description);
}
```

**Supported Fields**:
- `name` (string): Agent display name
- `version` (string): Agent version
- `description` (string): Agent description
- `tags` (string[]): Tags for categorization
- `enabled` (boolean): Whether agent is enabled
- Any custom fields

**Notes**:
- Returns `undefined` if no frontmatter found
- Returns `undefined` if YAML parsing fails
- Frontmatter must be at file start, enclosed in `---`

---

## Memory Loader

**Module**: `src/core/memory-loader.ts`

Loads memory files from the 2-scope hierarchy (project + user).

### loadMemoryFiles

Load all memory files from project and user directories.

```typescript
async function loadMemoryFiles(projectDir: string): Promise<MemoryFile[]>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory

**Returns**: Promise<MemoryFile[]> - Array of memory files with metadata

**Throws**:
- `Error` - If projectDir is not an absolute path
- `Error` - If projectDir is not a string

**Example**:
```typescript
import { loadMemoryFiles } from 'mcp-toggle/core/memory-loader';

const memories = await loadMemoryFiles('/home/user/my-project');

for (const memory of memories) {
  console.log(`${memory.name}: ${memory.sourceType}, ${memory.size} bytes`);
  if (memory.isBlocked) {
    console.log(`  ✗ Blocked at ${memory.blockedAt}`);
  }
}
```

**Memory File Structure**:
```typescript
interface MemoryFile {
  name: string;              // Basename (e.g., "notes.md")
  path: string;              // Absolute path
  relativePath: string;      // Relative to memories directory
  sourcePath: string;        // Path to .claude directory
  sourceType: 'local' | 'inherited';
  hierarchyLevel: number;    // 0=project, 1=user
  size: number;              // File size in bytes
  isBlocked: boolean;        // True if .md.blocked extension
  isSymlink: boolean;        // True if symlink
  blockedAt?: Date;          // When file was blocked
  symlinkTarget?: string;    // Symlink target path
  contentPreview?: string;   // First 200 characters
}
```

**Discovery Logic**:
1. Searches `<project>/.claude/memories/` (sourceType='local', hierarchyLevel=0)
2. Searches `~/.claude/memories/` (sourceType='inherited', hierarchyLevel=1)
3. Finds all `.md` and `.md.blocked` files recursively
4. Extracts metadata for each file

**Notes**:
- Returns empty array if directories don't exist
- Includes symlinks with target information
- Detects blocked files by `.md.blocked` extension (legacy v2.0.0 mechanism)
- Content preview is optional (first 200 chars)

---

## Project Context Builder

**Module**: `src/core/project-context-builder.ts`

Builds comprehensive project context combining MCP servers, memory files, and agents.

### buildProjectContext

Build complete project context.

```typescript
async function buildProjectContext(
  projectDir: string,
  options?: {
    includeUserAgents?: boolean;
    userAgentsDir?: string;
  }
): Promise<ProjectContext>
```

**Parameters**:
- `projectDir` (string): Absolute path to project directory
- `options` (object, optional):
  - `includeUserAgents` (boolean): Include user-global agents
  - `userAgentsDir` (string): Path to user agents directory

**Returns**: Promise<ProjectContext> - Complete context object

**Example**:
```typescript
import { buildProjectContext } from 'mcp-toggle/core/project-context-builder';

const context = await buildProjectContext('/home/user/my-project', {
  includeUserAgents: true
});

console.log(`MCP Servers: ${context.mcpServers.length}`);
console.log(`Memory Files: ${context.memoryFiles.length}`);
console.log(`Agents: ${context.agents.length}`);
```

**ProjectContext Structure**:
```typescript
interface ProjectContext {
  mcpServers: MCPServer[];
  memoryFiles: MemoryFile[];
  agents: AgentFile[];
  projectDir: string;
}
```

**Notes**:
- Combines data from all discovery functions
- Applies merge logic for agent overrides
- Single function for complete context snapshot

---

## File Utilities

**Module**: `src/utils/file-utils.ts`

Low-level file operations with atomic write support.

### atomicWrite

Write file atomically with automatic rollback on failure.

```typescript
async function atomicWrite(
  filePath: string,
  content: string
): Promise<void>
```

**Parameters**:
- `filePath` (string): Absolute path to file
- `content` (string): Content to write

**Returns**: Promise<void>

**Throws**:
- `Error` - If write fails (after rollback)

**Example**:
```typescript
import { atomicWrite } from 'mcp-toggle/utils/file-utils';

await atomicWrite('/path/to/settings.json', JSON.stringify(data, null, 2));
```

**Atomic Write Logic**:
1. Create backup of existing file (if exists)
2. Write to temporary file
3. Rename temporary file to target (atomic operation)
4. Delete backup on success
5. Restore from backup on failure

**Notes**:
- Ensures directory exists before writing
- Uses OS-level atomic rename operation
- Automatic rollback prevents data loss
- Thread-safe with file locking

---

### safeRead

Read file safely, returning null if file doesn't exist.

```typescript
async function safeRead(filePath: string): Promise<string | null>
```

**Parameters**:
- `filePath` (string): Absolute path to file

**Returns**: Promise<string | null> - File content or null if not found

**Example**:
```typescript
import { safeRead } from 'mcp-toggle/utils/file-utils';

const content = await safeRead('/path/to/file.json');
if (content === null) {
  console.log('File does not exist');
} else {
  const data = JSON.parse(content);
}
```

**Notes**:
- Returns `null` for non-existent files (not an error)
- Throws on other errors (permission denied, etc.)
- Useful for optional configuration files

---

## Error Handling

### Common Errors

**ENOENT: no such file or directory**
```typescript
try {
  const settings = await loadSettings('/invalid/path');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Project directory does not exist');
  }
}
```

**Invalid JSON**
```typescript
try {
  const settings = await loadSettings(projectDir);
} catch (error) {
  if (error.message.includes('Failed to parse')) {
    console.error('settings.json contains invalid JSON');
  }
}
```

**Permission Denied**
```typescript
try {
  await addDenyPattern(projectDir, 'memory', 'test.md');
} catch (error) {
  if (error.code === 'EACCES') {
    console.error('No write permission to .claude/ directory');
  }
}
```

### Best Practices

**Always validate input paths**:
```typescript
import * as path from 'path';

const projectDir = path.resolve(process.argv[2]);
if (!path.isAbsolute(projectDir)) {
  throw new Error('projectDir must be absolute');
}
```

**Handle concurrent access**:
```typescript
// Settings manager uses file locking automatically
await addDenyPattern(projectDir, 'memory', 'notes.md');
// No need for manual locking
```

**Check existence before operations**:
```typescript
import * as fs from 'fs-extra';

if (await fs.pathExists(projectDir)) {
  const context = await buildProjectContext(projectDir);
}
```

---

## TypeScript Types

### Core Types

```typescript
// Settings
interface DenyPattern {
  type: 'agent' | 'memory';
  pattern: string;
}

interface SettingsJson {
  permissions: {
    deny: DenyPattern[];
  };
  [key: string]: unknown;
}

// Agents
interface AgentFrontmatter {
  name?: string;
  version?: string;
  description?: string;
  tags?: string[];
  enabled?: boolean;
  [key: string]: unknown;
}

interface AgentFile {
  name: string;
  path: string;
  hierarchyLevel: 0 | 1;
  frontmatter?: AgentFrontmatter;
}

// Memory Files
interface MemoryFile {
  name: string;
  path: string;
  relativePath: string;
  sourcePath: string;
  sourceType: 'local' | 'inherited';
  hierarchyLevel: number;
  size: number;
  isBlocked: boolean;
  isSymlink: boolean;
  blockedAt?: Date;
  symlinkTarget?: string;
  contentPreview?: string;
}
```

---

## Complete Example

```typescript
import {
  loadSettings,
  addDenyPattern,
  removeDenyPattern,
  discoverAgents,
  loadMemoryFiles,
  mergeWithOverrides
} from 'mcp-toggle';
import * as os from 'os';
import * as path from 'path';

async function manageContext(projectDir: string) {
  // 1. Load current settings
  const settings = await loadSettings(projectDir);
  console.log('Current deny patterns:', settings.permissions.deny);

  // 2. Discover agents
  const userAgentsDir = path.join(os.homedir(), '.claude', 'agents');
  const allAgents = await discoverAgents(projectDir, userAgentsDir);
  const agents = mergeWithOverrides(allAgents);

  console.log(`Found ${agents.length} agents`);

  // 3. Load memory files
  const memories = await loadMemoryFiles(projectDir);
  console.log(`Found ${memories.length} memory files`);

  // 4. Block a memory file
  await addDenyPattern(projectDir, 'memory', 'sensitive-notes.md');
  console.log('Blocked sensitive-notes.md');

  // 5. Block an agent
  await addDenyPattern(projectDir, 'agent', 'experimental-agent.md');
  console.log('Blocked experimental-agent.md');

  // 6. Unblock a memory file
  await removeDenyPattern(projectDir, 'memory', 'old-blocked-file.md');
  console.log('Unblocked old-blocked-file.md');
}

// Usage
manageContext('/home/user/my-project').catch(console.error);
```

---

## Version Compatibility

- **v0.4.0**: Current version, all APIs stable
- **v0.3.0**: Memory blocking used file renaming (deprecated)
- **v0.2.0**: No agent management support
- **v0.1.0**: Initial release, MCP servers only

**Migration Guide**: See [migration-v0.4.0.md](./migration-v0.4.0.md) for upgrading from older versions.

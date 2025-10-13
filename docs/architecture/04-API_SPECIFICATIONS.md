# API Specifications
*mcp-toggle Claude Code Plugin*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## 1. Internal APIs

### 1.1 Configuration Manager API

**Purpose**: Centralized configuration file operations

#### `loadMCPServers(projectDir: string): Promise<MCPServer[]>`

Load all MCP servers from the 3-scope hierarchy.

**Parameters:**
- `projectDir` - Absolute path to project directory

**Returns:**
- Array of MCPServer objects with scope metadata

**Throws:**
- `Error` if projectDir is invalid or not absolute

**Example:**
```typescript
const servers = await loadMCPServers('/home/user/project');
// Returns: [{ name: 'context7', sourceType: 'inherited', hierarchyLevel: 2, ... }]
```

---

#### `blockInheritedServer(projectDir: string, server: MCPServer): Promise<void>`

Block an inherited MCP server by creating dummy override.

**Parameters:**
- `projectDir` - Project directory for override
- `server` - MCPServer object (must have `sourceType === 'inherited'`)

**Returns:**
- `Promise<void>` - Resolves when override written

**Throws:**
- `Error` if server is not inherited
- `Error` if override already exists
- `Error` if file write fails

**Side Effects:**
- Creates/modifies `.mcp.json` in project directory
- Adds blocking metadata to server configuration

**Example:**
```typescript
await blockInheritedServer('/home/user/project', {
  name: 'context7',
  sourceType: 'inherited',
  hierarchyLevel: 2,
  command: 'npx',
  args: ['-y', '@context7/server']
});
// Result: .mcp.json contains dummy override
```

---

#### `unblockInheritedServer(projectDir: string, serverName: string): Promise<void>`

Unblock an inherited server by removing override.

**Parameters:**
- `projectDir` - Project directory containing override
- `serverName` - Name of server to unblock

**Returns:**
- `Promise<void>` - Resolves when override removed

**Throws:**
- `Error` if override not found
- `Error` if override doesn't have blocking metadata
- `Error` if file write fails

**Example:**
```typescript
await unblockInheritedServer('/home/user/project', 'context7');
// Result: override removed from .mcp.json
```

---

#### `blockLocalServer(projectDir: string, serverName: string): Promise<void>`

Block a local server by removing it from `.mcp.json`.

**Parameters:**
- `projectDir` - Project directory
- `serverName` - Name of server to block

**Returns:**
- `Promise<void>` - Resolves when server removed

**Throws:**
- `Error` if server not found in local config
- `Error` if server is already a blocked override
- `Error` if file write fails

**Example:**
```typescript
await blockLocalServer('/home/user/project', 'my-custom-server');
// Result: server removed from .mcp.json
```

---

#### `unblockLocalServer(projectDir: string, serverName: string): Promise<UnblockResult>`

Unblock a local server (requires manual re-add).

**Parameters:**
- `projectDir` - Project directory
- `serverName` - Name of server to unblock

**Returns:**
- `UnblockResult` object:
  ```typescript
  {
    success: true,
    requiresManualAdd: true,
    message: "Local server 'X' unblocked. You must manually add configuration..."
  }
  ```

**Example:**
```typescript
const result = await unblockLocalServer('/home/user/project', 'my-server');
// Returns instruction message for user
```

---

### 1.2 Profile Manager API

**Purpose**: Profile creation, loading, and application

#### `listProfiles(projectDir: string): Promise<ProfileMetadata[]>`

List all available profiles (built-in + custom).

**Parameters:**
- `projectDir` - Project directory (for project-specific profiles)

**Returns:**
- Array of profile metadata objects

**Example:**
```typescript
const profiles = await listProfiles('/home/user/project');
// Returns: [
//   { name: 'minimal', description: '...', isBuiltIn: true },
//   { name: 'react-dev', description: '...', isBuiltIn: true },
//   { name: 'my-custom', description: '...', isBuiltIn: false }
// ]
```

---

#### `loadProfile(projectDir: string, profileName: string): Promise<Profile>`

Load a profile configuration.

**Parameters:**
- `projectDir` - Project directory
- `profileName` - Profile identifier

**Returns:**
- Profile configuration object

**Throws:**
- `Error` if profile not found
- `Error` if profile is invalid

**Example:**
```typescript
const profile = await loadProfile('/home/user/project', 'react-dev');
// Returns: { name: 'react-dev', servers: { enabled: [...], disabled: [...] }, ... }
```

---

#### `applyProfile(projectDir: string, profile: Profile): Promise<ProfileApplicationResult>`

Apply a profile to current project configuration.

**Parameters:**
- `projectDir` - Project directory
- `profile` - Profile object to apply

**Returns:**
- `ProfileApplicationResult` object:
  ```typescript
  {
    success: boolean;
    serversEnabled: string[];
    serversDisabled: string[];
    memoryEnabled: string[];
    memoryDisabled: string[];
    agentsEnabled: string[];
    agentsDisabled: string[];
    tokenReduction: number;
    errors?: string[];
  }
  ```

**Side Effects:**
- Modifies `.mcp.json`
- Renames memory files (`.md` ↔ `.md.blocked`)
- Updates `settings.json` deny patterns
- Creates `.claude/active-profile.json`

**Example:**
```typescript
const result = await applyProfile('/home/user/project', profile);
// Returns: { success: true, serversEnabled: ['context7', 'magic'], ... }
```

---

#### `createProfile(projectDir: string, name: string, config: Partial<Profile>): Promise<void>`

Create a new custom profile.

**Parameters:**
- `projectDir` - Project directory
- `name` - Profile name (must match `/^[a-z0-9-]+$/`)
- `config` - Profile configuration

**Returns:**
- `Promise<void>` - Resolves when profile saved

**Throws:**
- `Error` if name is invalid
- `Error` if profile already exists
- `Error` if file write fails

**Example:**
```typescript
await createProfile('/home/user/project', 'my-workflow', {
  description: 'My custom workflow',
  servers: { enabled: ['context7'], disabled: ['magic'] }
});
// Result: .claude/profiles/my-workflow.json created
```

---

### 1.3 Block State Tracker API

**Purpose**: Query and track blocking state

#### `getBlockedServers(projectDir: string): Promise<string[]>`

Get list of currently blocked server names.

**Parameters:**
- `projectDir` - Project directory

**Returns:**
- Array of blocked server names

**Example:**
```typescript
const blocked = await getBlockedServers('/home/user/project');
// Returns: ['sequential-thinking', 'database']
```

---

#### `getBlockedMemory(projectDir: string): Promise<string[]>`

Get list of currently blocked memory files.

**Parameters:**
- `projectDir` - Project directory

**Returns:**
- Array of blocked memory file paths (relative to `.claude/memories/`)

**Example:**
```typescript
const blocked = await getBlockedMemory('/home/user/project');
// Returns: ['production-notes.md', 'archived-specs.md']
```

---

#### `getBlockedAgents(projectDir: string): Promise<string[]>`

Get list of currently blocked agent names.

**Parameters:**
- `projectDir` - Project directory

**Returns:**
- Array of blocked agent names

**Example:**
```typescript
const blocked = await getBlockedAgents('/home/user/project');
// Returns: ['security-audit', 'performance-analyzer']
```

---

#### `isServerBlocked(projectDir: string, serverName: string): Promise<boolean>`

Check if a specific server is blocked.

**Parameters:**
- `projectDir` - Project directory
- `serverName` - Server name to check

**Returns:**
- `true` if blocked, `false` otherwise

**Example:**
```typescript
const blocked = await isServerBlocked('/home/user/project', 'context7');
// Returns: true or false
```

---

### 1.4 Migration Engine API

**Purpose**: Legacy format migration

#### `detectLegacyConfiguration(projectDir: string): Promise<LegacyDetectionResult>`

Detect if legacy configuration exists.

**Parameters:**
- `projectDir` - Project directory

**Returns:**
- Detection result object:
  ```typescript
  {
    hasLegacy: boolean;
    legacyFiles: string[];
    itemCount: { servers: number; memory: number; agents: number };
  }
  ```

**Example:**
```typescript
const result = await detectLegacyConfiguration('/home/user/project');
// Returns: { hasLegacy: true, legacyFiles: ['.claude/blocked.md'], itemCount: {...} }
```

---

#### `migrateLegacyConfiguration(projectDir: string, options?: MigrationOptions): Promise<MigrationResult>`

Migrate from legacy format to v2.0.0 format.

**Parameters:**
- `projectDir` - Project directory
- `options` - Optional migration options:
  ```typescript
  {
    dryRun?: boolean;      // Preview changes without applying
    archiveLegacy?: boolean; // Archive legacy files after migration
    force?: boolean;        // Overwrite existing configurations
  }
  ```

**Returns:**
- Migration result object

**Throws:**
- `Error` if no legacy configuration found
- `Error` if conflicts detected and not forced
- `Error` if file operations fail

**Side Effects:**
- Creates/modifies `.mcp.json`
- Renames memory files
- Updates `settings.json`
- Optionally archives legacy files

**Example:**
```typescript
const result = await migrateLegacyConfiguration('/home/user/project', {
  dryRun: false,
  archiveLegacy: true
});
// Returns: { migrated: true, serversCount: 2, memoryCount: 1, errors: [] }
```

---

### 1.5 Token Estimator API

**Purpose**: Estimate token usage for optimization

#### `estimateServerTokens(server: MCPServer): number`

Estimate token cost for a single MCP server.

**Parameters:**
- `server` - MCPServer object

**Returns:**
- Estimated token count

**Example:**
```typescript
const tokens = estimateServerTokens({ name: 'context7', command: '...', ... });
// Returns: 2800
```

---

#### `estimateProfileTokens(projectDir: string, profile: Profile): Promise<number>`

Estimate total token cost for a profile.

**Parameters:**
- `projectDir` - Project directory
- `profile` - Profile object

**Returns:**
- Estimated total token count

**Example:**
```typescript
const tokens = await estimateProfileTokens('/home/user/project', profile);
// Returns: 33800
```

---

#### `calculateTokenReduction(currentTokens: number, targetTokens: number): { absolute: number; percentage: number }`

Calculate token reduction metrics.

**Parameters:**
- `currentTokens` - Current token count
- `targetTokens` - Target token count after optimization

**Returns:**
- Reduction metrics:
  ```typescript
  {
    absolute: 74200,
    percentage: 69
  }
  ```

**Example:**
```typescript
const reduction = calculateTokenReduction(108000, 33800);
// Returns: { absolute: 74200, percentage: 69 }
```

---

## 2. Registry MCP Server API

### 2.1 Tool: `registry/list`

List all available MCP servers with metadata.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "filter": {
      "type": "string",
      "description": "Optional keyword filter"
    },
    "category": {
      "type": "string",
      "enum": ["all", "documentation", "development", "testing", "analysis"],
      "description": "Filter by category"
    }
  }
}
```

**Output:**
```json
{
  "servers": [
    {
      "name": "context7",
      "description": "Official library documentation lookup",
      "keywords": ["documentation", "library", "api"],
      "tokenCost": 2800,
      "category": "documentation",
      "isBlocked": false
    }
  ],
  "total": 19
}
```

---

### 2.2 Tool: `registry/info`

Get detailed information about a specific server.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "serverName": {
      "type": "string",
      "description": "Server name"
    }
  },
  "required": ["serverName"]
}
```

**Output:**
```json
{
  "name": "context7",
  "description": "Official library documentation lookup",
  "keywords": ["documentation", "library", "api", "reference"],
  "tokenCost": 2800,
  "category": "documentation",
  "tools": [
    "search_docs",
    "get_examples",
    "list_libraries"
  ],
  "dependencies": [],
  "compatibleWith": ["magic", "playwright"],
  "isBlocked": false,
  "estimatedLoadTime": "1-2 seconds"
}
```

---

### 2.3 Tool: `registry/suggest`

Suggest servers based on keywords in prompt.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "keywords": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Keywords extracted from user prompt"
    }
  },
  "required": ["keywords"]
}
```

**Output:**
```json
{
  "suggestions": [
    {
      "name": "magic",
      "score": 5,
      "description": "UI component generation",
      "tokenCost": 5200,
      "matchedKeywords": ["react", "component"],
      "reason": "Best match for UI component creation"
    },
    {
      "name": "context7",
      "score": 2,
      "description": "Library documentation",
      "tokenCost": 2800,
      "matchedKeywords": ["react"],
      "reason": "Provides React documentation"
    }
  ],
  "command": "/toggle server magic on",
  "estimatedTokenIncrease": 5200
}
```

---

### 2.4 Tool: `registry/load`

Request server activation (requires restart).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "serverName": {
      "type": "string",
      "description": "Server to activate"
    }
  },
  "required": ["serverName"]
}
```

**Output:**
```json
{
  "success": true,
  "message": "Server 'magic' marked for activation",
  "nextSteps": [
    "Server will be available after restart",
    "Restart Claude Code to apply changes",
    "Run /context-stats to verify token impact"
  ],
  "tokenIncrease": 5200
}
```

**Note:** This tool updates configuration but doesn't actually load the server. User must restart Claude Code.

---

## 3. Hook APIs

### 3.1 PreToolUse Hook

**Input (stdin):**
```json
{
  "session_id": "abc-123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/project/directory",
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__context7__search_docs",
  "tool_input": {
    "query": "react hooks",
    "limit": 10
  }
}
```

**Output (stdout):**
```json
{
  "continue": false,
  "decision": "block",
  "stopReason": "MCP server 'context7' is currently disabled",
  "systemMessage": "⚠️ Server 'context7' is disabled. Run /toggle server context7 on to enable it.",
  "suppressOutput": false
}
```

**Exit Codes:**
- `0` - Success (with decision in JSON)
- `2` - Blocking error (stop execution)
- Other - Non-blocking error (log and continue)

---

### 3.2 sessionStart Hook

**Input (stdin):**
```json
{
  "session_id": "abc-123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/project/directory",
  "hook_event_name": "SessionStart"
}
```

**Output (stdout):**
```json
{
  "systemMessage": "✓ Profile 'react-dev' loaded (React development workflow)"
}
```

---

### 3.3 sessionEnd Hook

**Input (stdin):**
```json
{
  "session_id": "abc-123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/project/directory",
  "hook_event_name": "SessionEnd"
}
```

**Output (stdout):**
```json
{
  "systemMessage": "✓ Session saved. Run /context-stats for optimization suggestions."
}
```

---

## 4. Error Handling

### Standard Error Response

All APIs return errors in consistent format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Error code (e.g., 'SERVER_NOT_FOUND')
    message: string;        // Human-readable message
    details?: unknown;      // Optional additional context
    recoverable: boolean;   // Can operation be retried?
  };
}
```

### Error Codes

| Code | Description | Recoverable |
|------|-------------|-------------|
| `SERVER_NOT_FOUND` | Server doesn't exist | No |
| `SERVER_ALREADY_BLOCKED` | Server is already blocked | No |
| `SERVER_NOT_BLOCKED` | Server is not blocked | No |
| `INVALID_PROFILE` | Profile format is invalid | No |
| `PROFILE_NOT_FOUND` | Profile doesn't exist | No |
| `FILE_WRITE_ERROR` | Failed to write configuration | Yes |
| `FILE_READ_ERROR` | Failed to read configuration | Yes |
| `PERMISSION_DENIED` | Insufficient file permissions | Maybe |
| `VALIDATION_ERROR` | Input validation failed | No |
| `MIGRATION_ERROR` | Migration failed | Maybe |

### Retry Logic

**Retry-eligible operations:**
- File writes (transient permission issues)
- File reads (race conditions)
- Configuration updates (concurrent modifications)

**Retry strategy:**
- Max 3 attempts
- Exponential backoff: 100ms, 200ms, 400ms
- Rollback on final failure

**Non-retry operations:**
- Validation errors
- Not found errors
- Already blocked/unblocked errors

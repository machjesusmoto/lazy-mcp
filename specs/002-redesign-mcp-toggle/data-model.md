# Data Model: Actual MCP Server Blocking via .claude.json Modification

**Feature**: 002-redesign-mcp-toggle
**Date**: 2025-10-08
**Status**: Complete

## Overview

This document defines the data structures used in the mcp-toggle architectural redesign. All models support the new blocking mechanism via direct .claude.json modification.

## Core Entities

### 1. ClaudeJsonConfig

Complete structure of a .claude.json file as it exists on disk.

**Purpose**: Represents the entire Claude Code configuration file that defines MCP servers and other settings.

**Fields**:
- `mcpServers`: Record<string, MCPServerConfig> - Dictionary of MCP server configurations keyed by server name
- `[key: string]`: unknown - Additional properties (future Claude Code extensions)

**Validation Rules**:
- MUST be valid JSON (no comments)
- `mcpServers` object MUST exist (created if missing)
- Server names MUST be unique within the file
- Additional properties MUST NOT conflict with reserved names

**State Transitions**: None (static configuration)

**Example**:
```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/cli"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

---

### 2. MCPServerConfig

Individual MCP server configuration as stored in .claude.json.

**Purpose**: Defines how to launch an MCP server with command, arguments, and environment.

**Fields**:
- `command`: string - Executable command (e.g., "npx", "python", "node")
- `args`: string[] | undefined - Command arguments (optional)
- `env`: Record<string, string> | undefined - Environment variables (optional)
- `[key: string]`: unknown - Additional properties for extensibility

**Validation Rules**:
- `command` MUST be non-empty string
- `args` if present MUST be array of strings
- `env` if present MUST be string-to-string dictionary
- Command MUST be executable or in PATH

**State Transitions**:
- Unblocked → Removed (local server blocking)
- Unblocked → BlockedMCPServerConfig (inherited server blocking)

**Example** (standard server):
```json
{
  "command": "npx",
  "args": ["-y", "@21st-dev/cli"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

### 3. BlockedMCPServerConfig

MCP server configuration with blocking metadata (extends MCPServerConfig).

**Purpose**: Represents a dummy override that prevents an inherited server from loading while preserving the original configuration.

**Fields** (extends MCPServerConfig):
- `command`: "echo" - Dummy command that does nothing
- `args`: ["[mcp-toggle] Server '{name}' is blocked"] - Descriptive message
- `_mcpToggleBlocked`: true - Marker for tool recognition (required)
- `_mcpToggleBlockedAt`: string - ISO 8601 timestamp when blocked
- `_mcpToggleOriginal`: MCPServerConfig - Original server configuration (required)

**Validation Rules**:
- `_mcpToggleBlocked` MUST be exactly `true`
- `_mcpToggleBlockedAt` MUST be valid ISO 8601 timestamp
- `_mcpToggleOriginal` MUST be valid MCPServerConfig
- `command` MUST be "echo" (enforced by tool)
- `args[0]` SHOULD contain server name for clarity

**State Transitions**:
- Unblocked server → BlockedMCPServerConfig (block inherited)
- BlockedMCPServerConfig → Removed from config (unblock inherited)

**Example**:
```json
{
  "command": "echo",
  "args": ["[mcp-toggle] Server 'magic' is blocked"],
  "_mcpToggleBlocked": true,
  "_mcpToggleBlockedAt": "2025-10-08T16:30:00.000Z",
  "_mcpToggleOriginal": {
    "command": "npx",
    "args": ["-y", "@21st-dev/cli"]
  }
}
```

---

### 4. MCPServer

Runtime representation of an MCP server including metadata about its source and blocking state.

**Purpose**: Used by the TUI and blocking logic to display and manipulate servers regardless of where they're defined in the hierarchy.

**Fields**:
- `name`: string - Server name (key in mcpServers object)
- `command`: string - Executable command
- `args`: string[] | undefined - Command arguments
- `env`: Record<string, string> | undefined - Environment variables
- `sourcePath`: string - Absolute path to directory containing the .claude.json
- `sourceType`: 'local' | 'inherited' - Whether server is from project or parent
- `hierarchyLevel`: number - Distance from project (0=local, 1=parent, 2=grandparent, etc.)
- `isBlocked`: boolean - Whether server is currently blocked (derived from config)

**Validation Rules**:
- `name` MUST be non-empty
- `sourceType` MUST be 'local' (level 0) or 'inherited' (level > 0)
- `hierarchyLevel` MUST be >=0
- `isBlocked` MUST match actual config state (has _mcpToggleBlocked or removed)

**Relationships**:
- Source of truth: .claude.json files in hierarchy
- Derived from: MCPServerConfig or BlockedMCPServerConfig
- Used by: TUI (display), blocking logic (operations)

**State Transitions**:
- Loaded unblocked → Block requested → Blocked (updated in config)
- Loaded blocked → Unblock requested → Unblocked (updated in config)

**Example**:
```typescript
{
  name: "magic",
  command: "npx",
  args: ["-y", "@21st-dev/cli"],
  env: undefined,
  sourcePath: "/Users/dev/.claude.json",
  sourceType: "inherited",
  hierarchyLevel: 2,
  isBlocked: false
}
```

---

### 5. MemoryFile

Represents a Claude Code memory file (.md) with its blocking state.

**Purpose**: Tracks memory files in .claude/memories/ and whether they're blocked (renamed with .blocked extension).

**Fields**:
- `name`: string - Display name (without .blocked if present)
- `path`: string - Absolute path to current file location
- `isBlocked`: boolean - Whether file is currently blocked (has .blocked extension)
- `size`: number - File size in bytes
- `lastModified`: Date - Last modification timestamp

**Validation Rules**:
- `name` MUST end with .md (original name without .blocked)
- `path` MUST be absolute path to existing file
- `isBlocked` MUST match actual filename (ends with .blocked or not)
- `size` MUST be >=0
- File MUST exist at `path`

**State Transitions**:
- file.md (unblocked) → file.md.blocked (blocked)
- file.md.blocked (blocked) → file.md (unblocked)

**Example** (blocked file):
```typescript
{
  name: "project-context.md",
  path: "/path/to/project/.claude/memories/project-context.md.blocked",
  isBlocked: true,
  size: 4096,
  lastModified: new Date("2025-10-08T10:00:00Z")
}
```

---

## Supporting Types

### UnblockResult

Result of unblocking a local server operation.

**Purpose**: Communicates to user that manual re-add is required for local servers.

**Fields**:
- `success`: boolean - Whether unblock operation completed
- `requiresManualAdd`: boolean - Whether user must manually re-add config
- `message`: string - User-facing message with instructions

**Example**:
```typescript
{
  success: true,
  requiresManualAdd: true,
  message: "Local server 'magic' has been unblocked. You must manually add its configuration to .claude.json to use it again."
}
```

---

### MigrationResult

Result of migrating from legacy .claude/blocked.md format.

**Purpose**: Tracks migration success and provides feedback to user.

**Fields**:
- `migrated`: boolean - Whether migration was performed
- `reason`: string | undefined - Why migration didn't run (if not migrated)
- `serversCount`: number | undefined - Number of servers migrated
- `memoryCount`: number | undefined - Number of memory files migrated
- `errors`: string[] | undefined - Any non-fatal errors during migration

**Example** (successful migration):
```typescript
{
  migrated: true,
  reason: undefined,
  serversCount: 5,
  memoryCount: 2,
  errors: []
}
```

**Example** (no migration needed):
```typescript
{
  migrated: false,
  reason: "no-legacy-file",
  serversCount: undefined,
  memoryCount: undefined,
  errors: undefined
}
```

---

## Entity Relationships

```
ClaudeJsonConfig (file on disk)
    ├─ mcpServers: Record<string, MCPServerConfig | BlockedMCPServerConfig>
    │   ├─ MCPServerConfig (standard server)
    │   │   └─ transforms to → MCPServer (runtime)
    │   └─ BlockedMCPServerConfig (blocked server)
    │       ├─ _mcpToggleOriginal: MCPServerConfig
    │       └─ transforms to → MCPServer (runtime, isBlocked=true)
    └─ Additional properties

MemoryFile (runtime)
    └─ represents file at path:
        ├─ file.md (isBlocked=false)
        └─ file.md.blocked (isBlocked=true)

Migration
    └─ .claude/blocked.md → applies blocks → ClaudeJsonConfig + MemoryFile renames
```

---

## Type Hierarchy

```
MCPServerConfig (base)
    └─ BlockedMCPServerConfig (extends with blocking metadata)

MCPServer (runtime view of both types above)

MemoryFile (standalone)

ClaudeJsonConfig (container for servers)

UnblockResult (operation result)

MigrationResult (operation result)
```

---

## Data Flow

### Blocking Flow

1. **User selects server to block in TUI**
   - Input: MCPServer (runtime representation)

2. **Tool determines server type**
   - Local (hierarchyLevel=0) → Remove from project .claude.json
   - Inherited (hierarchyLevel>0) → Create BlockedMCPServerConfig override in project .claude.json

3. **Write updated ClaudeJsonConfig**
   - Atomic write with backup/restore
   - Validate JSON structure
   - Set file permissions to 644

4. **Next Claude Code launch**
   - Reads .claude.json hierarchy
   - Local: Server not present → doesn't load
   - Inherited: Sees dummy echo command in project config → doesn't load real server

### Unblocking Flow

1. **User selects blocked server to unblock in TUI**
   - Input: MCPServer (with isBlocked=true)

2. **Tool determines server type**
   - Local → Show UnblockResult with requiresManualAdd=true
   - Inherited → Extract original config from `_mcpToggleOriginal`, remove override

3. **Write updated ClaudeJsonConfig** (inherited only)
   - Remove server entry from project .claude.json
   - Atomic write with backup/restore

4. **Next Claude Code launch**
   - Local: Still not present (user must manually re-add)
   - Inherited: No override in project → loads from parent config

---

## Persistence

### .claude.json Format

```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["./server.js"]
    },
    "inherited-blocked": {
      "command": "echo",
      "args": ["[mcp-toggle] Server 'inherited-blocked' is blocked"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-08T16:30:00.000Z",
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@some/server"]
      }
    }
  }
}
```

### File System Structure

```
project/
├── .claude.json              # Contains overrides for inherited, removal of local
├── .claude.json.backup       # Automatic backup during writes (transient)
├── .claude.json.tmp          # Temporary file during atomic writes (transient)
└── .claude/
    ├── blocked.md            # Legacy file (deprecated, preserved with notice)
    └── memories/
        ├── active.md         # Unblocked memory file
        └── blocked.md.blocked # Blocked memory file
```

---

## Validation & Invariants

### ClaudeJsonConfig Invariants
- MUST be valid JSON (enforced by JSON.parse)
- MUST have `mcpServers` object (created if missing)
- Server names MUST be unique within file

### BlockedMCPServerConfig Invariants
- MUST have `_mcpToggleBlocked: true`
- MUST have `_mcpToggleOriginal` with valid MCPServerConfig
- `command` MUST be "echo"
- MUST have ISO 8601 timestamp in `_mcpToggleBlockedAt`

### MCPServer Invariants
- `sourceType` MUST match `hierarchyLevel` (0=local, >0=inherited)
- `isBlocked` MUST match config state
- `sourcePath` MUST be absolute path to existing directory

### MemoryFile Invariants
- `isBlocked` MUST match filename (ends with .blocked)
- `path` MUST point to existing file
- `name` MUST be original name without .blocked

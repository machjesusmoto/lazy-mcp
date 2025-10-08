# Data Model: MCP Toggle

**Date**: 2025-10-07
**Status**: Complete
**Related**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)

## Overview

This document defines the core data entities and their relationships for the MCP Toggle tool. All entities are designed to be serializable for testing and easily mappable to TypeScript interfaces.

---

## Core Entities

### MCPServer

Represents an MCP (Model Context Protocol) server configuration discovered from .claude.json files.

**Attributes**:
- `name` (string, required): Unique identifier for the MCP server (key in mcpServers object)
- `command` (string, required): Executable command to start the server
- `args` (string[], optional): Command-line arguments for the server
- `env` (Record<string, string>, optional): Environment variables for the server
- `sourcePath` (string, required): Absolute path to .claude.json containing this server
- `sourceType` ('local' | 'inherited', required): Whether from current directory or parent
- `hierarchyLevel` (number, required): Directory levels from current (0 = current, 1 = parent, etc.)
- `isBlocked` (boolean, required): Current blocked state from blocked.md
- `blockedAt` (Date, optional): Timestamp when blocked (if isBlocked = true)

**Validation Rules**:
- `name` must be non-empty string
- `command` must be non-empty string
- `sourcePath` must be absolute path
- `hierarchyLevel` must be >= 0
- If `isBlocked` is true, `blockedAt` should be set

**Example**:
```typescript
{
  name: "filesystem",
  command: "node",
  args: ["/home/user/.config/mcp/servers/filesystem/index.js"],
  env: { "ROOT_DIR": "/home/user/projects" },
  sourcePath: "/home/user/.claude.json",
  sourceType: "inherited",
  hierarchyLevel: 2,
  isBlocked: false,
  blockedAt: null
}
```

---

### MemoryFile

Represents a Claude Code memory file (.md file in .claude/memories/).

**Attributes**:
- `name` (string, required): File name (e.g., "project-context.md")
- `path` (string, required): Absolute path to the memory file
- `relativePath` (string, required): Path relative to .claude/memories/ directory
- `sourcePath` (string, required): Absolute path to .claude directory containing this file
- `sourceType` ('local' | 'inherited', required): Whether from current directory or parent
- `hierarchyLevel` (number, required): Directory levels from current (0 = current, 1 = parent, etc.)
- `size` (number, required): File size in bytes
- `contentPreview` (string, optional): First 200 characters of file content
- `isSymlink` (boolean, required): Whether the file is a symlink
- `symlinkTarget` (string, optional): Target path if isSymlink = true
- `isBlocked` (boolean, required): Current blocked state from blocked.md
- `blockedAt` (Date, optional): Timestamp when blocked (if isBlocked = true)

**Validation Rules**:
- `name` must end with .md
- `path` and `sourcePath` must be absolute paths
- `relativePath` must be relative (no leading slash)
- `hierarchyLevel` must be >= 0
- If `isSymlink` is true, `symlinkTarget` must be set
- If `isBlocked` is true, `blockedAt` should be set

**Example**:
```typescript
{
  name: "architecture.md",
  path: "/home/user/project/.claude/memories/architecture.md",
  relativePath: "architecture.md",
  sourcePath: "/home/user/project/.claude",
  sourceType: "local",
  hierarchyLevel: 0,
  size: 4096,
  contentPreview: "# Architecture Overview\n\nThis project uses a microservices architecture...",
  isSymlink: false,
  symlinkTarget: null,
  isBlocked: true,
  blockedAt: new Date("2025-10-07T10:30:00Z")
}
```

---

### ConfigSource

Represents a source of configuration (a .claude.json file or .claude directory).

**Attributes**:
- `path` (string, required): Absolute path to .claude.json or .claude directory
- `type` ('mcp' | 'memory', required): What this source provides
- `sourceType` ('local' | 'inherited', required): Relationship to current directory
- `hierarchyLevel` (number, required): Directory levels from current (0 = current, 1 = parent, etc.)
- `exists` (boolean, required): Whether the file/directory currently exists
- `isReadable` (boolean, required): Whether user has read permission
- `lastModified` (Date, optional): Last modification time if exists

**Validation Rules**:
- `path` must be absolute
- `hierarchyLevel` must be >= 0
- If `exists` is false, `isReadable` should be false
- If `exists` is true, `lastModified` should be set

**Example**:
```typescript
{
  path: "/home/user/.claude.json",
  type: "mcp",
  sourceType: "inherited",
  hierarchyLevel: 2,
  exists: true,
  isReadable: true,
  lastModified: new Date("2025-10-01T14:20:00Z")
}
```

---

### BlockedItem

Represents an item that has been blocked via blocked.md.

**Attributes**:
- `identifier` (string, required): Unique identifier (MCP name or memory file relative path)
- `type` ('mcp' | 'memory', required): What kind of item is blocked
- `blockedAt` (Date, required): When this item was blocked
- `blockedBy` (string, optional): Tool/user that created the block (default: "mcp-toggle")

**Validation Rules**:
- `identifier` must be non-empty string
- `blockedAt` must be valid date
- For `type='mcp'`: identifier should match an MCPServer name
- For `type='memory'`: identifier should be a relative path ending in .md

**Serialization Format** (for blocked.md):
```
mcp:{identifier}
memory:{identifier}
```

**Example**:
```typescript
{
  identifier: "filesystem",
  type: "mcp",
  blockedAt: new Date("2025-10-07T10:30:00Z"),
  blockedBy: "mcp-toggle"
}
```

---

### ProjectContext

Aggregates all discovered configuration and blocked state for the current project.

**Attributes**:
- `projectPath` (string, required): Absolute path to current working directory
- `mcpServers` (MCPServer[], required): All discovered MCP servers
- `memoryFiles` (MemoryFile[], required): All discovered memory files
- `configSources` (ConfigSource[], required): All configuration sources found
- `blockedItems` (BlockedItem[], required): All currently blocked items
- `claudeDotClaudePath` (string, optional): Path to .claude directory if exists
- `blockedMdPath` (string, optional): Path to blocked.md if it exists or would be created
- `claudeMdPath` (string, optional): Path to claude.md if exists or would be created
- `hasWritePermission` (boolean, required): Whether can write to .claude directory
- `enumerationTime` (number, required): Milliseconds taken to enumerate everything

**Validation Rules**:
- `projectPath` must be absolute
- `mcpServers`, `memoryFiles`, `configSources`, `blockedItems` must be arrays (can be empty)
- `enumerationTime` must be >= 0
- If `hasWritePermission` is false, blocking operations should fail gracefully

**Computed Properties** (derived, not stored):
- `totalMcpServers`: count of mcpServers
- `totalMemoryFiles`: count of memoryFiles
- `blockedMcpServers`: count of blocked MCP servers
- `blockedMemoryFiles`: count of blocked memory files
- `localMcpServers`: mcpServers with sourceType='local'
- `inheritedMcpServers`: mcpServers with sourceType='inherited'
- `localMemoryFiles`: memoryFiles with sourceType='local'
- `inheritedMemoryFiles`: memoryFiles with sourceType='inherited'

**Example**:
```typescript
{
  projectPath: "/home/user/my-project",
  mcpServers: [/* array of MCPServer objects */],
  memoryFiles: [/* array of MemoryFile objects */],
  configSources: [/* array of ConfigSource objects */],
  blockedItems: [/* array of BlockedItem objects */],
  claudeDotClaudePath: "/home/user/my-project/.claude",
  blockedMdPath: "/home/user/my-project/.claude/blocked.md",
  claudeMdPath: "/home/user/my-project/claude.md",
  hasWritePermission: true,
  enumerationTime: 342
}
```

---

## Entity Relationships

```
ProjectContext
├── mcpServers: MCPServer[]
│   └── Each MCPServer references a ConfigSource via sourcePath
├── memoryFiles: MemoryFile[]
│   └── Each MemoryFile references a ConfigSource via sourcePath
├── configSources: ConfigSource[]
│   └── Discovered sources of MCP and memory configuration
└── blockedItems: BlockedItem[]
    └── Matches to MCPServer (by name) or MemoryFile (by relativePath)
```

**Key Relationships**:
1. **MCPServer → ConfigSource**: MCPServer.sourcePath matches ConfigSource.path
2. **MemoryFile → ConfigSource**: MemoryFile.sourcePath matches ConfigSource.path (directory)
3. **BlockedItem → MCPServer**: BlockedItem.identifier matches MCPServer.name when type='mcp'
4. **BlockedItem → MemoryFile**: BlockedItem.identifier matches MemoryFile.relativePath when type='memory'

---

## State Transitions

### MCPServer and MemoryFile Blocking

```
┌─────────┐           block()           ┌─────────┐
│ Enabled │ ─────────────────────────> │ Blocked │
│         │                             │         │
└─────────┘ <─────────────────────────┘ └─────────┘
                     unblock()
```

**State Rules**:
- Default state: `isBlocked = false`
- When blocked: `isBlocked = true`, `blockedAt = Date.now()`
- When unblocked: `isBlocked = false`, `blockedAt = null`
- Block/unblock operations are idempotent (blocking already-blocked item is no-op)

---

## Data Flow

### Enumeration Flow
1. **Discover ConfigSources**: Walk directory tree, find .claude.json and .claude/memories/
2. **Load MCPServers**: Parse each .claude.json, create MCPServer entities
3. **Load MemoryFiles**: Enumerate .claude/memories/ directories, create MemoryFile entities
4. **Load BlockedItems**: Parse blocked.md if exists, create BlockedItem entities
5. **Apply Blocks**: Match BlockedItems to MCPServers/MemoryFiles, set isBlocked flags
6. **Create ProjectContext**: Aggregate all entities into ProjectContext

### Blocking Flow
1. **User Selects Item**: MCPServer or MemoryFile to block
2. **Create BlockedItem**: identifier from name/relativePath, type from entity type
3. **Update Entity**: Set isBlocked=true, blockedAt=Date.now()
4. **Persist to blocked.md**: Write BlockedItem in line format
5. **Update claude.md**: Add integration instructions if not present

### Unblocking Flow
1. **User Selects Item**: Blocked MCPServer or MemoryFile to unblock
2. **Remove BlockedItem**: Delete from blockedItems array
3. **Update Entity**: Set isBlocked=false, blockedAt=null
4. **Persist to blocked.md**: Remove line from file
5. **claude.md**: Leave instructions in place (harmless if blocked.md is empty)

---

## TypeScript Interface Definitions

```typescript
// Core Entities
export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  sourcePath: string;
  sourceType: 'local' | 'inherited';
  hierarchyLevel: number;
  isBlocked: boolean;
  blockedAt?: Date;
}

export interface MemoryFile {
  name: string;
  path: string;
  relativePath: string;
  sourcePath: string;
  sourceType: 'local' | 'inherited';
  hierarchyLevel: number;
  size: number;
  contentPreview?: string;
  isSymlink: boolean;
  symlinkTarget?: string;
  isBlocked: boolean;
  blockedAt?: Date;
}

export interface ConfigSource {
  path: string;
  type: 'mcp' | 'memory';
  sourceType: 'local' | 'inherited';
  hierarchyLevel: number;
  exists: boolean;
  isReadable: boolean;
  lastModified?: Date;
}

export interface BlockedItem {
  identifier: string;
  type: 'mcp' | 'memory';
  blockedAt: Date;
  blockedBy?: string;
}

export interface ProjectContext {
  projectPath: string;
  mcpServers: MCPServer[];
  memoryFiles: MemoryFile[];
  configSources: ConfigSource[];
  blockedItems: BlockedItem[];
  claudeDotClaudePath?: string;
  blockedMdPath?: string;
  claudeMdPath?: string;
  hasWritePermission: boolean;
  enumerationTime: number;
}
```

---

## Persistence Format

### blocked.md Format
```markdown
# Blocked MCP Servers and Memory Files
# Generated by mcp-toggle
# Last updated: 2025-10-07T10:30:00Z

## MCP Servers
mcp:filesystem
mcp:sequential-thinking

## Memory Files
memory:old-architecture.md
memory:deprecated/legacy-docs.md
```

### .claude.json Format (existing)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": { "ROOT_DIR": "/home/user" }
    }
  }
}
```

---

## Summary

This data model provides:
- **Clear entity definitions** for all domain concepts
- **Validation rules** to ensure data integrity
- **State transitions** for blocking/unblocking workflow
- **Relationships** between entities
- **TypeScript interfaces** for implementation
- **Persistence formats** for file storage

All entities are designed to be:
- **Serializable**: Can be converted to/from JSON
- **Testable**: Clear structure for unit testing
- **Immutable-friendly**: Can be used with functional programming patterns
- **Type-safe**: Full TypeScript type definitions

Ready for contract definition and implementation.

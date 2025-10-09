# Data Model: Migrate to Global

**Phase**: 1 - Design & Contracts
**Date**: 2025-10-09
**Purpose**: Define data structures and entities for migration operations

## Core Entities

### 1. MigrationOperation

Represents a complete migration transaction from project-local to global configuration.

**Purpose**: Encapsulates all state required to execute, validate, and potentially rollback a migration operation.

**Lifecycle States**:
```
idle → validating → conflict_resolution → ready → executing → complete
                                                             ↘ error → rollback
```

**Entity Definition**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier (timestamp-based) |
| `projectDir` | `string` | Yes | Absolute path to project directory |
| `state` | `MigrationState` | Yes | Current workflow state |
| `selectedServers` | `MCPServer[]` | Yes | Servers selected for migration (hierarchyLevel === 1) |
| `conflicts` | `ConflictResolution[]` | No | Detected conflicts (empty if none) |
| `backupPaths` | `BackupPaths` | No | Paths to backup files (created during execution) |
| `result` | `MigrationResult` | No | Operation outcome (populated on completion) |
| `createdAt` | `Date` | Yes | Operation start timestamp |
| `completedAt` | `Date` | No | Operation completion timestamp |
| `error` | `Error` | No | Error details if operation failed |

**State Transitions**:
- `idle` → User triggers migration from main menu
- `validating` → System loads configurations and detects conflicts
- `conflict_resolution` → User resolves detected conflicts (if any)
- `ready` → User confirms migration
- `executing` → System performs file operations
- `complete` → Migration succeeded, context reloaded
- `error` → Migration failed, rollback initiated

**Validation Rules**:
- `selectedServers` must contain at least 1 server
- All servers in `selectedServers` must have `hierarchyLevel === 1` (project-local)
- All conflicts in `conflicts` must have resolution set before proceeding to `ready` state
- `projectDir` must exist and contain `.mcp.json` file
- State transitions must follow defined progression (cannot skip states)

---

### 2. ConflictResolution

Represents a single name conflict between project and global servers with user-selected resolution.

**Purpose**: Captures user's decision on how to handle duplicate server names during migration.

**Entity Definition**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serverName` | `string` | Yes | Name of conflicting server |
| `projectConfig` | `MCPServerConfig` | Yes | Server configuration from `.mcp.json` |
| `globalConfig` | `MCPServerConfig` | Yes | Server configuration from `~/.claude.json` |
| `resolution` | `ResolutionType` | Yes | User's chosen resolution strategy |
| `newName` | `string` | Conditional | New name for server (required if resolution === 'rename') |
| `configDiff` | `ConfigDiff` | No | Differences between project and global configs |

**ResolutionType Enum**:
```typescript
type ResolutionType = 'skip' | 'overwrite' | 'rename';
```

**Resolution Semantics**:
- `skip`: Keep global config, don't migrate this server
- `overwrite`: Replace global config with project config
- `rename`: Migrate project server with new name (avoids conflict)

**Validation Rules**:
- `serverName` must match both `projectConfig.name` and `globalConfig.name`
- If `resolution === 'rename'`, `newName` is required and must:
  - Not be empty
  - Not match any existing server name in global config
  - Not match any other renamed server in same migration operation
  - Match naming pattern: alphanumeric, hyphens, underscores only
- `resolution` must be one of the three valid types

**ConfigDiff Structure**:
```typescript
interface ConfigDiff {
  command: { project: string; global: string };
  args?: { project: string[]; global: string[] };
  env?: { project: Record<string, string>; global: Record<string, string> };
  hasBlockingMetadata: { project: boolean; global: boolean };
}
```

---

### 3. MCPServerConfig

Represents the JSON configuration for a single MCP server (subset of MCPServer type).

**Purpose**: Lightweight representation of server config for conflict comparison and file operations.

**Entity Definition**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command` | `string` | Yes | Executable command |
| `args` | `string[]` | No | Command arguments |
| `env` | `Record<string, string>` | No | Environment variables |
| `_mcpToggleBlocked` | `boolean` | No | v2.0.0 blocking metadata |
| `_mcpToggleBlockedAt` | `string` | No | ISO timestamp of blocking |
| `_mcpToggleOriginal` | `MCPServerConfig` | No | Original config before blocking |

**Validation Rules**:
- `command` must be non-empty string
- If `_mcpToggleBlocked === true`, metadata fields must be preserved during migration
- Config must be valid JSON (no circular references)

---

### 4. BackupPaths

Tracks backup file locations for rollback capability.

**Purpose**: Maintain record of backup files created before migration for atomic rollback.

**Entity Definition**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectBackup` | `string` | Yes | Absolute path to `.mcp.json` backup |
| `globalBackup` | `string` | Yes | Absolute path to `~/.claude.json` backup |
| `timestamp` | `number` | Yes | Backup creation timestamp (ms since epoch) |

**Naming Pattern**:
```typescript
const timestamp = Date.now();
projectBackup = `${projectConfigPath}.backup.${timestamp}`;
globalBackup = `${globalConfigPath}.backup.${timestamp}`;
```

**Cleanup Rules**:
- Backups deleted on successful migration
- Backups retained on error for manual recovery
- Backup retention: 24 hours (cleanup on next mcp-toggle start)

---

### 5. MigrationResult

Captures the outcome of a migration operation.

**Purpose**: Provide detailed feedback on migration success/failure for user display and logging.

**Entity Definition**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Overall operation success |
| `migratedCount` | `number` | Yes | Number of servers successfully migrated |
| `skippedCount` | `number` | Yes | Number of servers skipped due to conflicts |
| `errors` | `MigrationError[]` | No | List of errors encountered (if any) |
| `backupsRetained` | `boolean` | Yes | Whether backup files were retained (true if errors) |
| `duration` | `number` | Yes | Operation duration in milliseconds |

**MigrationError Structure**:
```typescript
interface MigrationError {
  serverName: string;
  phase: 'validation' | 'backup' | 'write' | 'verification' | 'rollback';
  message: string;
  code?: string; // e.g., 'EACCES', 'ENOENT'
}
```

**User Display Format**:
```
✓ Migration complete: 5 servers migrated, 1 skipped in 2.3s
⚠ Migration failed: 3 servers migrated, 2 errors (backups retained)
```

---

## Entity Relationships

```
MigrationOperation (1) ──┬── (0..n) ConflictResolution
                          │
                          ├── (0..n) MCPServer (selectedServers)
                          │
                          ├── (0..1) BackupPaths
                          │
                          └── (0..1) MigrationResult

ConflictResolution (1) ──┬── (1) MCPServerConfig (projectConfig)
                          │
                          └── (1) MCPServerConfig (globalConfig)
```

**Relationship Rules**:
- Each MigrationOperation has 0 or more ConflictResolutions (one per conflicting server)
- Each MigrationOperation references multiple MCPServers (from project context)
- BackupPaths created only during execution phase
- MigrationResult populated only after execution phase completes

---

## State Persistence

**In-Memory Only**:
- MigrationOperation state maintained in React component state (TUI session lifetime)
- No persistent storage required (migration is interactive, one-time operation)
- State lost on application exit (intentional - user must complete or cancel)

**File System State**:
- Backup files persist until successful completion or manual cleanup
- Configuration files (`.mcp.json`, `~/.claude.json`) updated atomically
- No transaction log or audit trail required

---

## Type Definitions (TypeScript)

**Summary of new types to add to `src/models/types.ts`**:

```typescript
// Migration workflow state machine
export type MigrationState =
  | 'idle'
  | 'validating'
  | 'conflict_resolution'
  | 'ready'
  | 'executing'
  | 'complete'
  | 'error';

// Conflict resolution strategy
export type ResolutionType = 'skip' | 'overwrite' | 'rename';

// Main migration operation
export interface MigrationOperation {
  id: string;
  projectDir: string;
  state: MigrationState;
  selectedServers: MCPServer[];
  conflicts: ConflictResolution[];
  backupPaths?: BackupPaths;
  result?: MigrationResult;
  createdAt: Date;
  completedAt?: Date;
  error?: Error;
}

// Conflict resolution
export interface ConflictResolution {
  serverName: string;
  projectConfig: MCPServerConfig;
  globalConfig: MCPServerConfig;
  resolution: ResolutionType;
  newName?: string;
  configDiff?: ConfigDiff;
}

// Server configuration (lightweight)
export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  _mcpToggleBlocked?: boolean;
  _mcpToggleBlockedAt?: string;
  _mcpToggleOriginal?: MCPServerConfig;
}

// Configuration differences
export interface ConfigDiff {
  command: { project: string; global: string };
  args?: { project: string[]; global: string[] };
  env?: { project: Record<string, string>; global: Record<string, string> };
  hasBlockingMetadata: { project: boolean; global: boolean };
}

// Backup file paths
export interface BackupPaths {
  projectBackup: string;
  globalBackup: string;
  timestamp: number;
}

// Migration result
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors?: MigrationError[];
  backupsRetained: boolean;
  duration: number;
}

// Migration error details
export interface MigrationError {
  serverName: string;
  phase: 'validation' | 'backup' | 'write' | 'verification' | 'rollback';
  message: string;
  code?: string;
}
```

---

## Design Validation

**Entity Completeness**: ✅
- All user stories map to entity operations
- All functional requirements supported by data model
- All edge cases have entity representations

**Testability**: ✅
- Each entity has clear validation rules
- State transitions are explicit and testable
- Error scenarios captured in MigrationError type

**Simplicity**: ✅
- No unnecessary abstraction
- Reuses existing MCPServer type where appropriate
- Clear separation between config (MCPServerConfig) and runtime state (MigrationOperation)

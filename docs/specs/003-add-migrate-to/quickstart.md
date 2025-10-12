# Developer Quick Start: Migrate to Global

**Feature**: 003-add-migrate-to
**Purpose**: Get developers up to speed on implementing migration functionality

## Overview

The "Migrate to Global" feature adds functionality to move MCP servers from project-local configuration (`.mcp.json`) to global configuration (`~/.claude.json`). This enables unified blocking mechanism and prevents data loss when blocking/unblocking servers.

**Key Files**:
- `src/core/migration-manager.ts` - Core migration logic (NEW)
- `src/tui/components/migration-menu.tsx` - Migration UI (NEW)
- `src/tui/hooks/use-migration.ts` - State management (NEW)
- `src/models/types.ts` - Type definitions (MODIFY)
- `tests/unit/migration-manager.test.ts` - Unit tests (NEW)
- `tests/integration/migration-flow.test.ts` - Integration tests (NEW)

## Architecture

### Component Structure

```
User Interaction (TUI)
    ↓
Migration Menu Component (migration-menu.tsx)
    ↓
Migration Hook (use-migration.ts)
    ↓
Migration Manager (migration-manager.ts)
    ↓
File Operations (utils/file-operations.ts - existing)
    ↓
Configuration Files (.mcp.json, ~/.claude.json)
```

### State Flow

```
idle
  ↓ [User presses 'M' key]
validating (load configs, detect conflicts)
  ↓
conflict_resolution (if conflicts detected)
  ↓ [User resolves all conflicts]
ready (show confirmation)
  ↓ [User confirms]
executing (backup → write → verify)
  ↓
complete (success) OR error (rollback)
```

## Implementation Phases

### Phase 1: Core Types and Migration Manager (P1 MVP)

**Goal**: Implement basic migration logic without UI

**Tasks**:
1. Add migration types to `src/models/types.ts` (from contracts)
2. Create `src/core/migration-manager.ts` with functions:
   - `initiateMigration()` - Start migration, detect conflicts
   - `detectConflicts()` - Compare server names
   - `executeMigration()` - Atomic file operations
   - `rollbackMigration()` - Restore from backups
3. Write unit tests: `tests/unit/migration-manager.test.ts`
   - Test conflict detection (various scenarios)
   - Test server merging logic
   - Test validation functions
   - Mock all file I/O

**Acceptance Criteria**:
- All migration manager functions have unit tests
- Conflict detection correctly identifies name collisions
- Migration logic validated without file I/O

**Estimated Effort**: 4-6 hours

---

### Phase 2: TUI Integration (P1 MVP)

**Goal**: Add migration menu to TUI

**Tasks**:
1. Create `src/tui/components/migration-menu.tsx`:
   - Server selection interface
   - Progress indicator
   - Result display
2. Create `src/tui/hooks/use-migration.ts`:
   - State management for migration operation
   - Keyboard input handling
3. Modify `src/tui/app.tsx`:
   - Add 'M' key binding for migration
   - Render migration overlay when active
4. Write integration tests: `tests/integration/migration-flow.test.ts`
   - Test full migration flow with real file operations
   - Test in temporary directories
   - Test rollback on failure

**Acceptance Criteria**:
- User can initiate migration from main menu
- Selected servers migrate successfully
- Context reloads after migration (servers show [global] label)
- Integration tests cover happy path and error scenarios

**Estimated Effort**: 6-8 hours

---

### Phase 3: Conflict Resolution UI (P2)

**Goal**: Add conflict resolution interface

**Tasks**:
1. Create `src/tui/components/conflict-resolver.tsx`:
   - List conflicts with diff display
   - Resolution options (skip/overwrite/rename)
   - Validation for rename option
2. Modify migration workflow to pause at conflict resolution
3. Add conflict resolution tests

**Acceptance Criteria**:
- Conflicts detected and displayed to user
- User can choose resolution for each conflict
- Rename validation prevents duplicate names
- Tests cover all resolution types

**Estimated Effort**: 4-5 hours

---

### Phase 4: Polish and Validation (P3)

**Goal**: Add preview, validation, and edge case handling

**Tasks**:
1. Add preview mode (show changes before committing)
2. Add validation error messages (permissions, malformed JSON)
3. Add backup cleanup on next app start
4. Handle edge cases (missing files, empty projects)
5. Performance testing (verify <30 second completion)

**Acceptance Criteria**:
- User can preview changes before migration
- Clear error messages for all failure modes
- All edge cases handled gracefully
- Performance targets met

**Estimated Effort**: 3-4 hours

---

## Development Workflow

### 1. Setup Development Environment

```bash
# Clone and install dependencies (if not already done)
cd ~/motodev/projects/mcp_toggle
npm install

# Checkout feature branch
git checkout 003-add-migrate-to

# Run existing tests to ensure baseline
npm test
# All 80 tests should pass
```

### 2. Implement with TDD

```bash
# Write test first
# Example: tests/unit/migration-manager.test.ts

# Run tests (should fail - red)
npm test migration-manager

# Implement functionality
# Example: src/core/migration-manager.ts

# Run tests (should pass - green)
npm test migration-manager

# Refactor if needed
# Re-run tests to ensure no regression
```

### 3. Local Testing with Real Configs

```bash
# Build the project
npm run build

# Create test project
mkdir -p ~/test-migration
cd ~/test-migration

# Create test .mcp.json
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "test-server-1": {
      "command": "echo",
      "args": ["hello"]
    },
    "test-server-2": {
      "command": "date"
    }
  }
}
EOF

# Run mcp-toggle
mcp-toggle

# Expected behavior:
# 1. Press 'M' to open migration menu
# 2. Select servers to migrate
# 3. Confirm migration
# 4. Verify servers moved to ~/.claude.json
# 5. Verify servers removed from .mcp.json
# 6. Verify servers show [global] label in TUI
```

### 4. Verify with Claude Code

```bash
# Start Claude Code in test project
cd ~/test-migration
claude-code

# In Claude Code:
# Run /mcp command to verify servers loaded
# Should see test-server-1 and test-server-2

# Verify blocking works without deletion
# Run mcp-toggle, block a server, verify it stays in list
```

## Code Examples

### Example 1: Basic Migration

```typescript
// src/core/migration-manager.ts

export async function executeMigration(
  operation: MigrationOperation
): Promise<MigrationOperation> {
  if (operation.state !== 'ready') {
    throw new Error('Migration not ready for execution');
  }

  const startTime = Date.now();
  operation.state = 'executing';

  try {
    // Phase 1: Create backups
    const backupPaths = await createBackups(operation.projectDir);
    operation.backupPaths = backupPaths;

    // Phase 2: Read configurations
    const projectConfig = await safeReadJSON(
      path.join(operation.projectDir, '.mcp.json')
    );
    const globalConfig = await safeReadJSON(
      path.join(os.homedir(), '.claude.json')
    ) || {};

    // Phase 3: Apply resolutions and merge servers
    const serversToMigrate = applyResolutions(
      operation.selectedServers,
      operation.conflicts
    );

    // Update global config
    globalConfig.mcpServers = globalConfig.mcpServers || {};
    for (const server of serversToMigrate) {
      globalConfig.mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        env: server.env,
        // Preserve blocking metadata
        _mcpToggleBlocked: (server as any)._mcpToggleBlocked,
        _mcpToggleBlockedAt: (server as any)._mcpToggleBlockedAt,
        _mcpToggleOriginal: (server as any)._mcpToggleOriginal,
      };
    }

    // Remove from project config
    for (const server of serversToMigrate) {
      delete projectConfig.mcpServers[server.name];
    }

    // Phase 4: Write both files atomically
    await atomicWriteJSON(
      path.join(os.homedir(), '.claude.json'),
      globalConfig
    );
    await atomicWriteJSON(
      path.join(operation.projectDir, '.mcp.json'),
      projectConfig
    );

    // Phase 5: Verify writes
    const verifyGlobal = await safeReadJSON(
      path.join(os.homedir(), '.claude.json')
    );
    const verifyProject = await safeReadJSON(
      path.join(operation.projectDir, '.mcp.json')
    );

    if (!verifyGlobal || !verifyProject) {
      throw new Error('Verification failed');
    }

    // Success - cleanup backups
    await fs.remove(backupPaths.projectBackup);
    await fs.remove(backupPaths.globalBackup);

    // Populate result
    operation.result = {
      success: true,
      migratedCount: serversToMigrate.length,
      skippedCount: operation.conflicts.filter(c => c.resolution === 'skip').length,
      backupsRetained: false,
      duration: Date.now() - startTime,
    };

    operation.state = 'complete';
    operation.completedAt = new Date();

    return operation;
  } catch (error) {
    // Rollback on error
    if (operation.backupPaths) {
      await rollbackMigration(operation.backupPaths);
    }

    operation.state = 'error';
    operation.error = error as Error;
    operation.completedAt = new Date();

    operation.result = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [{
        serverName: 'migration',
        phase: 'write',
        message: (error as Error).message,
      }],
      backupsRetained: true,
      duration: Date.now() - startTime,
    };

    return operation;
  }
}
```

### Example 2: Conflict Detection

```typescript
export function detectConflicts(
  projectServers: MCPServer[],
  globalConfig: any
): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];
  const globalServerNames = new Set(
    Object.keys(globalConfig.mcpServers || {})
  );

  for (const server of projectServers) {
    if (globalServerNames.has(server.name)) {
      const globalServer = globalConfig.mcpServers[server.name];

      conflicts.push({
        serverName: server.name,
        projectConfig: {
          command: server.command,
          args: server.args,
          env: server.env,
        },
        globalConfig: {
          command: globalServer.command,
          args: globalServer.args,
          env: globalServer.env,
        },
        resolution: 'skip', // default
        configDiff: {
          command: { project: server.command, global: globalServer.command },
          args: server.args && globalServer.args ? {
            project: server.args,
            global: globalServer.args,
          } : undefined,
          hasBlockingMetadata: {
            project: !!(server as any)._mcpToggleBlocked,
            global: !!globalServer._mcpToggleBlocked,
          },
        },
      });
    }
  }

  return conflicts;
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/migration-manager.test.ts

describe('detectConflicts', () => {
  it('should detect name conflicts between project and global servers', () => {
    const projectServers: MCPServer[] = [
      { name: 'server-1', command: 'cmd1', hierarchyLevel: 1, /* ... */ },
      { name: 'server-2', command: 'cmd2', hierarchyLevel: 1, /* ... */ },
    ];

    const globalConfig = {
      mcpServers: {
        'server-1': { command: 'different-cmd' },
        'server-3': { command: 'cmd3' },
      },
    };

    const conflicts = detectConflicts(projectServers, globalConfig);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].serverName).toBe('server-1');
    expect(conflicts[0].resolution).toBe('skip');
  });
});
```

### Integration Tests

```typescript
// tests/integration/migration-flow.test.ts

describe('Full Migration Flow', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should migrate servers from project to global config', async () => {
    // Setup: Create .mcp.json with test servers
    await fs.writeJSON(path.join(tempDir, '.mcp.json'), {
      mcpServers: {
        'test-server': { command: 'echo', args: ['test'] },
      },
    });

    // Load servers
    const servers = await loadMCPServers(tempDir);
    const projectServers = servers.filter(s => s.hierarchyLevel === 1);

    // Initiate migration
    const operation = await initiateMigration(tempDir, projectServers);
    expect(operation.state).toBe('ready'); // no conflicts

    // Execute migration
    const result = await executeMigration(operation);
    expect(result.state).toBe('complete');
    expect(result.result?.success).toBe(true);

    // Verify: Server moved to ~/.claude.json
    const globalConfig = await fs.readJSON(
      path.join(os.homedir(), '.claude.json')
    );
    expect(globalConfig.mcpServers['test-server']).toBeDefined();

    // Verify: Server removed from .mcp.json
    const projectConfig = await fs.readJSON(path.join(tempDir, '.mcp.json'));
    expect(projectConfig.mcpServers['test-server']).toBeUndefined();
  });
});
```

## Common Pitfalls

### 1. Not Preserving Blocking Metadata

**Problem**: `_mcpToggleBlocked` markers lost during migration

**Solution**: Explicitly copy all metadata fields when moving servers

```typescript
globalConfig.mcpServers[server.name] = {
  ...server, // Include all fields
  _mcpToggleBlocked: (server as any)._mcpToggleBlocked,
  _mcpToggleBlockedAt: (server as any)._mcpToggleBlockedAt,
  _mcpToggleOriginal: (server as any)._mcpToggleOriginal,
};
```

### 2. Partial Migration Success

**Problem**: Global config updated but project config update fails

**Solution**: Use backup/rollback pattern - restore both files on any error

### 3. Race Conditions with Claude Code

**Problem**: Claude Code reloads configs while migration in progress

**Solution**: Use atomic write operations - Claude Code will see complete state

### 4. Invalid Rename Names

**Problem**: User provides rename that conflicts with other servers

**Solution**: Validate rename against all servers (both existing global and other renames in same operation)

## Next Steps

After completing implementation:

1. Run full test suite: `npm test` (should have ~95-100 tests passing)
2. Perform manual testing in real project with Claude Code
3. Update version to v0.3.0 in `package.json`
4. Create PR with reference to GitHub Issue #6
5. Update CHANGELOG.md with migration feature details

## Questions?

Refer to:
- **Specification**: `specs/003-add-migrate-to/spec.md`
- **Data Model**: `specs/003-add-migrate-to/data-model.md`
- **Research**: `specs/003-add-migrate-to/research.md`
- **GitHub Issue**: https://github.com/machjesusmoto/mcp-toggle/issues/6

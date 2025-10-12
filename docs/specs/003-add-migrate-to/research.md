# Research Document: Migrate to Global

**Phase**: 0 - Technical Research
**Date**: 2025-10-09
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Tasks

### 1. Atomic Write Pattern for Multi-File Operations

**Context**: Migration requires atomic updates to two files (`.mcp.json` and `~/.claude.json`) where both must succeed or both must fail.

**Research Question**: How to ensure atomicity across two separate file operations?

**Investigation**:
- Reviewed existing `blocked-manager.ts` implementation
- Current pattern: write-to-temp → atomic rename → cleanup
- Challenge: Two files need coordinated updates

**Decision**: Two-Phase Commit with Rollback

**Rationale**:
1. **Phase 1 - Preparation**: Create backup of both files before any modifications
2. **Phase 2 - Execution**: Perform both write operations atomically
3. **Phase 3 - Verification**: Validate both files were written successfully
4. **Phase 4 - Cleanup**: Delete backups on success, restore from backups on failure

**Implementation Pattern**:
```typescript
async function atomicMigration(servers: MCPServer[], projectDir: string) {
  const projectConfigPath = path.join(projectDir, '.mcp.json');
  const globalConfigPath = path.join(os.homedir(), '.claude.json');

  // Create backups
  const projectBackup = `${projectConfigPath}.backup.${Date.now()}`;
  const globalBackup = `${globalConfigPath}.backup.${Date.now()}`;

  try {
    // Backup phase
    if (await fs.pathExists(projectConfigPath)) {
      await fs.copy(projectConfigPath, projectBackup);
    }
    if (await fs.pathExists(globalConfigPath)) {
      await fs.copy(globalConfigPath, globalBackup);
    }

    // Write phase (using existing atomic write utility)
    await atomicWriteJSON(globalConfigPath, updatedGlobalConfig);
    await atomicWriteJSON(projectConfigPath, updatedProjectConfig);

    // Verification phase
    const verifyGlobal = await safeReadJSON(globalConfigPath);
    const verifyProject = await safeReadJSON(projectConfigPath);
    if (!verifyGlobal || !verifyProject) {
      throw new Error('Verification failed');
    }

    // Success - remove backups
    await fs.remove(projectBackup);
    await fs.remove(globalBackup);

    return { success: true };
  } catch (error) {
    // Rollback - restore from backups
    if (await fs.pathExists(projectBackup)) {
      await fs.move(projectBackup, projectConfigPath, { overwrite: true });
    }
    if (await fs.pathExists(globalBackup)) {
      await fs.move(globalBackup, globalConfigPath, { overwrite: true });
    }

    throw error;
  }
}
```

**Alternatives Considered**:
- **Option A**: Write to global first, then project - rejected because partial success leaves inconsistent state
- **Option B**: Transaction log with replay - rejected as over-engineered for this use case
- **Option C**: Lock files - rejected due to cross-platform complexity

**Best Practice**: Backup-based rollback provides simple, reliable atomicity for multi-file operations

---

### 2. Conflict Detection Strategy

**Context**: Need to detect when servers being migrated have name conflicts with existing global servers.

**Research Question**: When to detect conflicts (pre-migration validation vs. during migration)?

**Investigation**:
- Early detection prevents user frustration
- Allows user to resolve conflicts before committing changes
- Reduces need for rollback scenarios

**Decision**: Pre-Migration Validation with Conflict Preview

**Rationale**:
1. Load both configurations before starting migration
2. Compare server names between source (project) and destination (global)
3. Present conflicts to user with resolution options before any file modifications
4. User must resolve all conflicts before proceeding

**Implementation Pattern**:
```typescript
interface ConflictResolution {
  serverName: string;
  projectConfig: MCPServer;
  globalConfig: MCPServer;
  resolution: 'skip' | 'overwrite' | 'rename';
  newName?: string; // if resolution === 'rename'
}

async function detectConflicts(
  projectServers: MCPServer[],
  globalConfig: any
): Promise<ConflictResolution[]> {
  const conflicts: ConflictResolution[] = [];
  const globalServerNames = new Set(
    Object.keys(globalConfig.mcpServers || {})
  );

  for (const server of projectServers) {
    if (globalServerNames.has(server.name)) {
      conflicts.push({
        serverName: server.name,
        projectConfig: server,
        globalConfig: globalConfig.mcpServers[server.name],
        resolution: 'skip', // default
      });
    }
  }

  return conflicts;
}
```

**Best Practice**: Fail-fast validation with user control over conflict resolution

---

### 3. TUI Navigation Pattern for Migration Workflow

**Context**: Need to design multi-step migration workflow within existing TUI structure.

**Research Question**: How to implement multi-screen workflow while maintaining existing TUI patterns?

**Investigation**:
- Reviewed existing TUI navigation in `app.tsx`
- Current pattern: Single-screen with panel switching (Tab key)
- Migration needs: Server selection → Conflict resolution → Confirmation → Result

**Decision**: Modal-Style Overlay with State Machine

**Rationale**:
1. Preserves main TUI view (users can see current servers)
2. Overlay approach minimizes navigation complexity
3. State machine ensures clear progression through workflow steps
4. Follows React patterns already in use (Ink components)

**Implementation Pattern**:
```typescript
type MigrationState =
  | 'idle'
  | 'server-selection'
  | 'conflict-resolution'
  | 'confirmation'
  | 'executing'
  | 'complete'
  | 'error';

interface MigrationContext {
  state: MigrationState;
  selectedServers: MCPServer[];
  conflicts: ConflictResolution[];
  error?: string;
}

// Main app renders migration overlay based on state
{migrationState !== 'idle' && (
  <MigrationOverlay
    state={migrationState}
    context={migrationContext}
    onComplete={handleMigrationComplete}
    onCancel={handleMigrationCancel}
  />
)}
```

**Screen Flow**:
1. **Main Menu**: Add "M" key binding for "Migrate to Global"
2. **Server Selection**: Show checkboxes for project-local servers
3. **Conflict Resolution**: Show conflicts with resolution options (if any)
4. **Confirmation**: Show summary of changes to be made
5. **Execution**: Show progress indicator
6. **Result**: Show success/error message with server count

**Best Practice**: State machine pattern provides clear workflow progression with easy cancellation at any step

---

### 4. Testing Strategy for Migration Operations

**Context**: Need comprehensive test coverage for critical data migration operations.

**Research Question**: What test levels are required to ensure migration safety?

**Investigation**:
- Reviewed existing test structure (unit + integration tests)
- Migration involves file I/O, state management, and user interaction
- Need to test both happy path and error scenarios

**Decision**: Three-Level Testing Strategy

**Test Levels**:

1. **Unit Tests** (`tests/unit/migration-manager.test.ts`):
   - Conflict detection logic
   - Server merging logic
   - Backup/rollback operations
   - Validation functions
   - Mock all file I/O

2. **Integration Tests** (`tests/integration/migration-flow.test.ts`):
   - End-to-end migration with real file operations (in temp directories)
   - Test atomic write patterns
   - Test rollback on failure
   - Test various conflict scenarios
   - Use real fs-extra operations

3. **Component Tests** (TUI components):
   - Ink component rendering
   - User input handling
   - State transitions
   - Use Ink testing utilities

**Critical Test Scenarios**:
- ✓ Successful migration (no conflicts)
- ✓ Migration with conflicts (all resolution types)
- ✓ Cancellation at each workflow step
- ✓ Rollback on write failure
- ✓ Permission errors
- ✓ Malformed JSON in source/destination
- ✓ Empty project (no servers to migrate)
- ✓ Non-existent global config (create new)
- ✓ Selective migration (subset of servers)
- ✓ Preservation of metadata (_mcpToggleBlocked markers)

**Best Practice**: Comprehensive test coverage at all levels ensures migration safety and data integrity

---

### 5. Performance Optimization for Large Server Lists

**Context**: TUI must remain responsive with up to 50 servers.

**Research Question**: Are any performance optimizations needed for Ink rendering?

**Investigation**:
- Ink uses React reconciliation (efficient by default)
- Server list rendering already handles current scale well
- Migration adds temporary overhead (conflict detection, backup operations)

**Decision**: No Pre-Optimization Required

**Rationale**:
1. Current TUI handles 20+ servers efficiently
2. Migration is one-time operation (not performance-critical)
3. File I/O is the bottleneck, not rendering
4. Premature optimization violates simplicity principle

**Performance Considerations**:
- Use async/await for file operations (already implemented)
- Show progress indicator during execution (user feedback)
- Validate input before heavy operations (fail-fast)

**Monitoring**:
- Add timing metrics to integration tests
- Verify <30 second completion for typical projects (10 servers)
- Only optimize if tests reveal performance issues

**Best Practice**: Measure first, optimize only if needed

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Atomicity** | Two-phase commit with backup/rollback | Simple, reliable, reuses existing patterns |
| **Conflict Detection** | Pre-migration validation | Fail-fast with user control |
| **TUI Navigation** | Modal overlay with state machine | Clear workflow, minimal complexity |
| **Testing** | Three-level strategy (unit/integration/component) | Comprehensive coverage for critical operations |
| **Performance** | No pre-optimization | Measure first, current scale is adequate |

## Implementation Dependencies

**Required Before Implementation**:
- ✅ TypeScript types for MigrationOperation and ConflictResolution
- ✅ Atomic write utility (already exists in codebase)
- ✅ State management pattern (React hooks, already in use)

**No New Dependencies**:
- All required functionality available in existing dependencies (fs-extra, ink, jest)
- No additional npm packages needed

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Backup/rollback pattern, comprehensive testing |
| Incomplete migration (partial success) | Atomic operation pattern, validation phase |
| User confusion in workflow | Clear step-by-step UI, cancellation at any point |
| Conflicts go unresolved | Pre-migration validation, mandatory conflict resolution |
| Test coverage gaps | 15-20 new tests covering all scenarios |

## Next Phase

Ready to proceed to **Phase 1: Design & Contracts**
- Create data-model.md (MigrationOperation, ConflictResolution entities)
- Create TypeScript interface contracts
- Create quickstart.md for developers
- Update agent context (CLAUDE.md)

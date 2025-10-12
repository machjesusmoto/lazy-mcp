---
description: "Implementation tasks for Migrate to Global feature"
---

# Tasks: Migrate to Global

**Input**: Design documents from `/specs/003-add-migrate-to/`
**Prerequisites**: plan.md (tech stack), spec.md (user stories), data-model.md (entities), contracts/ (interfaces), research.md (decisions)

**Tests**: Comprehensive testing required per specification (all edge cases, error scenarios, atomic operations)

**Organization**: Tasks grouped by user story priority (P1, P2, P3) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Single TypeScript project structure: `src/`, `tests/` at repository root
- Paths assume existing mcp-toggle project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions shared across all user stories

- [ ] T001 Add migration type definitions to `src/models/types.ts` from `contracts/migration-operation.ts` (MigrationState, ResolutionType, MigrationOperation, ConflictResolution, MCPServerConfig, ConfigDiff, BackupPaths, MigrationResult, MigrationError, validation constants)

**Checkpoint**: Type definitions available for all implementation tasks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core migration logic that MUST be complete before ANY user story UI can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Create `src/core/migration-manager.ts` stub with function signatures from contracts (initiateMigration, detectConflicts, executeMigration, rollbackMigration, validateResolutions, applyResolutions)
- [ ] T003 [P] Create `tests/unit/migration-manager.test.ts` with test structure for all migration functions
- [ ] T004 Implement `detectConflicts()` function in `src/core/migration-manager.ts` - compares server names between project and global configs, returns ConflictResolution[] (research.md: pre-migration validation strategy)
- [ ] T005 Write unit tests for `detectConflicts()` in `tests/unit/migration-manager.test.ts` - test scenarios: no conflicts, single conflict, multiple conflicts, various config differences
- [ ] T006 Implement `validateResolutions()` function in `src/core/migration-manager.ts` - validates all conflicts have valid resolutions, rename validation (no duplicates, valid pattern)
- [ ] T007 Write unit tests for `validateResolutions()` in `tests/unit/migration-manager.test.ts` - test all resolution types, edge cases (empty newName, duplicate rename, invalid pattern)
- [ ] T008 Implement `applyResolutions()` function in `src/core/migration-manager.ts` - transforms server list based on conflict resolutions (skip, overwrite, rename)
- [ ] T009 Write unit tests for `applyResolutions()` in `tests/unit/migration-manager.test.ts` - test each resolution type, preserve metadata
- [ ] T010 Implement atomic backup functions in `src/core/migration-manager.ts` - `createBackups()` and `rollbackMigration()` using research.md two-phase commit pattern
- [ ] T011 Write unit tests for backup/rollback in `tests/unit/migration-manager.test.ts` - mock fs-extra, test backup creation, rollback restoration
- [ ] T012 Implement `executeMigration()` function in `src/core/migration-manager.ts` - full atomic migration with backup, write, verify, cleanup (research.md: atomic write pattern)
- [ ] T013 Write unit tests for `executeMigration()` in `tests/unit/migration-manager.test.ts` - mock file operations, test success path, error rollback
- [ ] T014 Implement `initiateMigration()` function in `src/core/migration-manager.ts` - creates MigrationOperation, loads configs, detects conflicts, sets initial state
- [ ] T015 Write unit tests for `initiateMigration()` in `tests/unit/migration-manager.test.ts` - test operation creation, conflict detection integration, state transitions

**Checkpoint**: Foundation ready - all core migration logic tested and functional, UI implementation can now begin

---

## Phase 3: User Story 1 - Migrate Project Servers to Global (Priority: P1) 🎯 MVP

**Goal**: User can migrate all project-local MCP servers to global configuration via TUI

**Independent Test**: Run mcp-toggle in project with servers in .mcp.json → Press 'M' → Confirm migration → Verify servers moved to ~/.claude.json, removed from .mcp.json, show [global] label in TUI

### Integration Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Create `tests/integration/migration-flow.test.ts` with successful migration test - setup temp project with .mcp.json, run migration, verify files updated, context reloaded (happy path, no conflicts)
- [ ] T017 [P] [US1] Add rollback test to `tests/integration/migration-flow.test.ts` - simulate write failure, verify backups restored, no file corruption
- [ ] T018 [P] [US1] Add edge case tests to `tests/integration/migration-flow.test.ts` - missing ~/.claude.json (create new), empty project (no servers), malformed JSON handling

### Implementation for User Story 1

- [ ] T019 [US1] Create `src/tui/hooks/use-migration.ts` hook - manages MigrationOperation state, handles state transitions (idle → validating → ready → executing → complete/error), keyboard input
- [ ] T020 [US1] Create `src/tui/components/migration-menu.tsx` component - displays migration UI overlay, shows server selection (all project-local servers), progress indicator, result display
- [ ] T021 [US1] Modify `src/tui/app.tsx` - add 'M' key binding for migration, render MigrationMenu overlay when migrationState !== 'idle', handle migration completion (reload context)
- [ ] T022 [US1] Wire up migration flow in `use-migration.ts` - call initiateMigration() on start, call executeMigration() on confirm, handle errors with rollback
- [ ] T023 [US1] Add context reload after migration in `src/tui/app.tsx` - call buildProjectContext() after successful migration to update hierarchyLevel values (servers now level 2)
- [ ] T024 [US1] Add migration result display in `migration-menu.tsx` - show success message with server count and duration, or error message with backup retention notice

**Checkpoint**: At this point, User Story 1 should be fully functional - users can migrate all project servers to global, atomic operations guaranteed, context reloads showing [global] labels

---

## Phase 4: User Story 2 - Selective Migration (Priority: P2)

**Goal**: User can choose specific servers to migrate instead of migrating all servers

**Independent Test**: Run mcp-toggle in project with 5 servers → Press 'M' → Select 3 servers (uncheck 2) → Confirm → Verify only 3 migrated, 2 remain in .mcp.json

### Integration Tests for User Story 2

- [ ] T025 [US2] Add selective migration test to `tests/integration/migration-flow.test.ts` - create project with 5 servers, select 3, verify 3 migrated and 2 remain, verify context shows correct hierarchy levels

### Implementation for User Story 2

- [ ] T026 [US2] Add server selection state to `src/tui/hooks/use-migration.ts` - track which servers are selected (initially all selected), handle toggle selection, pass selected servers to initiateMigration()
- [ ] T027 [US2] Add checkbox UI to `src/tui/components/migration-menu.tsx` - display checkboxes next to each server, handle Space key to toggle selection, show selection count
- [ ] T028 [US2] Add select/deselect all functionality to `migration-menu.tsx` - 'A' key to select all, 'N' key to deselect all, show keyboard hints
- [ ] T029 [US2] Add validation in `use-migration.ts` - prevent migration if no servers selected, show error message "No servers selected for migration"

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can migrate all or selective servers independently

---

## Phase 5: User Story 3 - Migration Validation and Rollback (Priority: P3)

**Goal**: User can preview changes before committing and has confidence in atomic operations

**Independent Test**: Run mcp-toggle → Initiate migration → View preview showing before/after state → Cancel without changes → Verify no files modified. Alternatively: Complete migration → Verify backups deleted on success

### Integration Tests for User Story 3

- [ ] T030 [P] [US3] Add preview test to `tests/integration/migration-flow.test.ts` - initiate migration, verify preview shows accurate before/after state, cancel and verify no changes
- [ ] T031 [P] [US3] Add backup cleanup test to `tests/integration/migration-flow.test.ts` - verify backups created before write, deleted on success, retained on error

### Implementation for User Story 3

- [ ] T032 [US3] Add preview state to `src/tui/hooks/use-migration.ts` - new state 'preview' between ready and executing, load both configs, generate preview data
- [ ] T033 [US3] Add preview display to `src/tui/components/migration-menu.tsx` - show before/after state for both .mcp.json and ~/.claude.json, highlight servers being migrated
- [ ] T034 [US3] Add preview navigation to `migration-menu.tsx` - 'P' key to show preview from ready state, 'Enter' to proceed with migration, 'Esc' to cancel
- [ ] T035 [US3] Add validation display in `migration-menu.tsx` - show validation errors (malformed JSON, permissions) with specific error messages and remediation steps

**Checkpoint**: All user stories should now be independently functional - full validation and preview capability

---

## Phase 6: Conflict Resolution (Cross-Story Enhancement)

**Goal**: Handle name conflicts between project and global servers

**Purpose**: This phase adds conflict resolution UI that enhances all user stories when conflicts are detected

### Integration Tests for Conflict Resolution

- [ ] T036 [P] Add conflict resolution tests to `tests/integration/migration-flow.test.ts` - create project with conflicting server names, test all resolution types (skip, overwrite, rename), verify outcomes
- [ ] T037 [P] Create `tests/unit/conflict-resolution.test.ts` - unit tests for conflict detection, resolution validation, config diff generation

### Implementation for Conflict Resolution

- [ ] T038 Create `src/tui/components/conflict-resolver.tsx` component - displays list of conflicts, shows config diff for each conflict, resolution options (skip/overwrite/rename)
- [ ] T039 Add conflict resolution state to `src/tui/hooks/use-migration.ts` - handle conflicts detected in validating state, transition to conflict_resolution state, track resolution choices
- [ ] T040 Wire conflict resolver into migration flow in `src/tui/app.tsx` - render ConflictResolver component when state === 'conflict_resolution', proceed to ready state when all resolved
- [ ] T041 Implement resolution UI in `conflict-resolver.tsx` - navigation between conflicts (up/down arrows), select resolution (1=skip, 2=overwrite, 3=rename), text input for rename
- [ ] T042 Add rename validation in `conflict-resolver.tsx` - validate pattern (alphanumeric, hyphens, underscores), check for duplicates, show validation errors
- [ ] T043 Add config diff display in `conflict-resolver.tsx` - show command, args, env differences between project and global, highlight blocking metadata

**Checkpoint**: Conflict resolution fully integrated - all three user stories now handle conflicts gracefully

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T044 [P] Add help text to migration menu showing keyboard shortcuts ('M'=migrate, Space=toggle, 'A'=all, 'N'=none, 'P'=preview, Enter=confirm, Esc=cancel, 'Q'=quit)
- [ ] T045 [P] Add loading indicators during file operations - show spinner during validation, backup, write, verify phases
- [ ] T046 Add error handling for permission errors - catch EACCES, display clear message "Permission denied: Cannot write to ~/.claude.json", suggest chmod solution
- [ ] T047 Add error handling for malformed JSON - catch parse errors, display specific error with line number, prevent migration until fixed
- [ ] T048 Add backup cleanup on app start - check for backup files older than 24 hours (MIGRATION_VALIDATION.BACKUP_RETENTION_MS), delete stale backups
- [ ] T049 [P] Add performance timing to `executeMigration()` - measure duration of each phase (backup, write, verify), log timing metrics for performance validation
- [ ] T050 [P] Update quickstart.md with final implementation details - add actual code snippets, update test commands, verify all examples work
- [ ] T051 Run full test suite and verify all 95-100 tests pass (80 existing + 15-20 new migration tests)
- [ ] T052 Manual testing with real Claude Code instance - create test project, migrate servers, verify Claude Code loads them correctly with /mcp command
- [ ] T053 [P] Update package.json version to v0.3.0
- [ ] T054 [P] Update CHANGELOG.md with migration feature details

**Checkpoint**: Production-ready feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T002-T015) - Core MVP functionality
- **User Story 2 (Phase 4)**: Depends on User Story 1 (T016-T024) - Extends migration menu
- **User Story 3 (Phase 5)**: Depends on User Story 1 (T016-T024) - Adds preview capability
- **Conflict Resolution (Phase 6)**: Depends on Foundational (T002-T015) - Can be done in parallel with User Story 2/3 but enhances all stories
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: Depends on US1 UI components - Extends migration menu with selection
- **User Story 3 (P3)**: Depends on US1 UI components - Adds preview before US1 execution
- **Conflict Resolution**: Independent of user stories - Can integrate with any/all stories

### Within Each Phase

**Foundational Phase**:
- T002-T003 can run in parallel (different files)
- T004-T005 sequential (test after implementation)
- T006-T015 sequential (each builds on previous validation)

**User Story 1**:
- T016-T018 can run in parallel (different test scenarios)
- T019-T020 can run in parallel (different files)
- T021-T024 sequential (wiring up components)

**User Story 2**:
- T025 standalone test
- T026-T029 sequential (state → UI → validation)

**User Story 3**:
- T030-T031 can run in parallel (different test scenarios)
- T032-T035 sequential (state → UI → integration)

**Conflict Resolution**:
- T036-T037 can run in parallel (different test files)
- T038-T043 sequential (component → state → integration)

**Polish**:
- T044-T045, T049-T050, T053-T054 can run in parallel (different files)
- T046-T048, T051-T052 sequential (require previous tasks)

### Parallel Opportunities

**Maximum Parallelization** (with sufficient team):
1. Complete T001 (setup)
2. Launch T002-T003 in parallel
3. Complete T004-T015 sequentially (foundational logic)
4. **SPLIT TEAM**:
   - Track A: T016-T024 (User Story 1 - MVP)
   - Track B: T036-T043 (Conflict Resolution)
5. After Track A completes:
   - Track C: T025-T029 (User Story 2)
   - Track D: T030-T035 (User Story 3)
6. Merge all tracks, complete T044-T054 (polish)

---

## Parallel Example: Foundational Phase

```bash
# Launch test structure and manager stub together:
Task T002: "Create src/core/migration-manager.ts stub"
Task T003: "Create tests/unit/migration-manager.test.ts structure"

# After stubs complete, implement and test sequentially:
# T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015
```

## Parallel Example: User Story 1 Integration Tests

```bash
# Launch all integration tests together (they use temp directories):
Task T016: "Successful migration test (happy path)"
Task T017: "Rollback test (write failure)"
Task T018: "Edge case tests (missing files, malformed JSON)"
```

## Parallel Example: Polish Phase

```bash
# Launch documentation and metadata updates together:
Task T044: "Add help text to migration menu"
Task T045: "Add loading indicators"
Task T049: "Add performance timing"
Task T050: "Update quickstart.md"
Task T053: "Update package.json version"
Task T054: "Update CHANGELOG.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended for Initial Release

1. Complete Phase 1: Setup (T001) - ~30 minutes
2. Complete Phase 2: Foundational (T002-T015) - ~4-6 hours (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T016-T024) - ~6-8 hours
4. **STOP and VALIDATE**: Test User Story 1 independently with real Claude Code
5. **Release v0.3.0-alpha**: MVP migration functionality without conflicts or selective migration

**MVP Scope**: 9 tasks (T016-T024) delivering core value - users can migrate all project servers to global

### Incremental Delivery (Recommended Full Release)

1. Complete Setup + Foundational → Foundation ready (~5-7 hours)
2. Add User Story 1 → Test independently → MVP Ready! (~6-8 hours)
3. Add Conflict Resolution → Test with conflicting servers (~4-5 hours)
4. Add User Story 2 → Test selective migration (~4-5 hours)
5. Add User Story 3 → Test preview capability (~3-4 hours)
6. Add Polish → Production ready (~3-4 hours)

**Full Release Scope**: All 54 tasks, ~25-33 hours total

### Parallel Team Strategy

With 2 developers after foundational phase:

1. **Team completes Setup + Foundational together** (T001-T015)
2. **SPLIT after T015**:
   - Developer A: User Story 1 (T016-T024) - Core migration UI
   - Developer B: Conflict Resolution (T036-T043) - Conflict handling UI
3. **MERGE at T025**: Both developers ready for User Story 2/3
4. Developer A: User Story 2 (T025-T029)
5. Developer B: User Story 3 (T030-T035)
6. **MERGE for Polish**: Both developers on T044-T054

**Estimated Time with 2 Developers**: ~15-20 hours (vs 25-33 solo)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability (US1, US2, US3)
- **Each user story**: Independently completable and testable (MVP = US1 only)
- **TDD Approach**: Integration tests (T016-T018) written FIRST, must FAIL before implementation
- **Verify tests fail**: Run `npm test` after writing tests, ensure failures before implementing
- **Commit frequency**: Commit after each task or logical group (T004+T005, T006+T007, etc.)
- **Checkpoint validation**: At each checkpoint, run full test suite and manual testing
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence

## Test Execution

```bash
# Run all tests
npm test

# Run only migration tests
npm test migration

# Run specific test file
npm test migration-manager.test.ts

# Run integration tests only
npm test tests/integration/

# Watch mode for TDD
npm test -- --watch
```

## Success Criteria Validation

After completing all tasks, verify against spec.md success criteria:

- ✅ **SC-001**: Migration completes in <30 seconds (verify with T049 timing metrics)
- ✅ **SC-002**: Block/unblock without data loss (verify with T016 + manual test T052)
- ✅ **SC-003**: 100% atomic operations (verify with T017 rollback test)
- ✅ **SC-004**: Selective migration in <45 seconds (verify with T025 + timing)
- ✅ **SC-005**: Zero name conflicts (verify with T036 conflict test)
- ✅ **SC-006**: Permission errors in <2 seconds (verify with T046 error handling)
- ✅ **SC-007**: Immediate availability in Claude Code (verify with T052 manual test)
- ✅ **SC-008**: 90% first-attempt success (gather user feedback after release)

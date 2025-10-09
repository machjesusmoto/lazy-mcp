# Tasks: Actual MCP Server Blocking via .claude.json Modification

**Input**: Design documents from `/specs/002-redesign-mcp-toggle/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Execution Context**: Tasks will be executed by Claude Code (primary AI agent) with potential delegation to specialized sub-agents for complex operations.

**Tests**: Included - Test-Driven Development approach with existing Jest infrastructure (78 tests to update/extend).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, Setup, Foundation)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Project uses: `src/core/`, `src/models/`, `src/services/`, `src/ui/`, `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare existing project for architectural redesign

- [ ] T001 [P] [Setup] Review and update TypeScript types in `src/models/types.ts` to include blocking metadata interfaces (ClaudeJsonConfig, MCPServerConfig, BlockedMCPServerConfig, UnblockResult, MigrationResult)
- [ ] T002 [P] [Setup] Update Jest configuration if needed for new test files (migration.test.ts, blocking-workflow.test.ts)
- [ ] T003 [P] [Setup] Create backup of existing v0.1.1 implementation (tag git commit as `v0.1.1-pre-redesign`)

**Checkpoint**: Project structure ready for foundational changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [Foundation] Implement `readClaudeJson()` in `src/utils/claude-json-utils.ts` - Read .claude.json with empty config fallback
- [ ] T005 [Foundation] Implement `writeClaudeJson()` in `src/utils/claude-json-utils.ts` - Atomic write with backup/restore
- [ ] T006 [Foundation] Implement `isBlockedServer()` in `src/utils/claude-json-utils.ts` - Type guard for BlockedMCPServerConfig
- [ ] T007 [Foundation] Implement `createDummyOverride()` in `src/utils/claude-json-utils.ts` - Generate override with metadata
- [ ] T008 [Foundation] Implement `extractOriginalConfig()` in `src/utils/claude-json-utils.ts` - Extract from _mcpToggleOriginal
- [ ] T009 [P] [Foundation] Implement `removeBlockingMetadata()` in `src/utils/claude-json-utils.ts` - Clean blocking fields
- [ ] T010 [P] [Foundation] Implement `ensureClaudeDirectory()` in `src/utils/claude-json-utils.ts` - Create .claude/ with 755 permissions
- [ ] T011 [P] [Foundation] Implement `claudeJsonExists()` in `src/utils/claude-json-utils.ts` - Check file existence
- [ ] T012 [P] [Foundation] Implement `ensureClaudeJson()` in `src/utils/claude-json-utils.ts` - Create minimal config if missing
- [ ] T013 [Foundation] Write unit tests for all claude-json-utils functions in `tests/unit/claude-json-utils.test.ts` (atomic write, backup/restore, type guards, dummy override generation)
- [ ] T014 [Foundation] Update `src/models/types.ts` with all interfaces from data-model.md (ensure BlockedMCPServerConfig extends MCPServerConfig)
- [ ] T015 [Foundation] Update `loadMCPServers()` in `src/core/config-loader.ts` to detect and flag blocked servers (set isBlocked=true when _mcpToggleBlocked detected)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Block Local MCP Server (Priority: P1) 🎯 MVP

**Goal**: Enable users to block locally-configured MCP servers by removing them from project .claude.json

**Independent Test**: Create .claude.json with one server → run blocking → verify server removed → confirm Claude Code doesn't load it

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Write integration test "block local server" in `tests/integration/blocking-workflow.test.ts` - Create project with local server, block it, verify removal from .claude.json
- [ ] T017 [P] [US1] Write integration test "blocked local server doesn't load" in `tests/integration/blocking-workflow.test.ts` - Mock Claude Code startup, verify blocked server not in loaded list
- [ ] T018 [P] [US1] Write unit test "blockLocalServer removes config" in `tests/unit/blocked-manager.test.ts` - Test removal logic

### Implementation for User Story 1

- [ ] T019 [US1] Implement `blockLocalServer()` in `src/core/blocked-manager.ts` - Read project config, remove server entry, write atomically
- [ ] T020 [US1] Add validation in `blockLocalServer()` - Throw error if server not found in local config
- [ ] T021 [US1] Add validation in `blockLocalServer()` - Throw error if server is inherited (wrong function)
- [ ] T022 [US1] Update TUI in `src/ui/app.tsx` to show blocking status indicator for local servers (📁 Local + ❌ Blocked)
- [ ] T023 [US1] Wire up TUI toggle action to call `blockLocalServer()` when local server selected
- [ ] T024 [US1] Add confirmation prompt in TUI before saving changes with list of servers to be blocked
- [ ] T025 [US1] Verify all US1 tests pass

**Checkpoint**: At this point, User Story 1 should be fully functional - users can block local servers and they won't load

---

## Phase 4: User Story 2 - Unblock Local MCP Server (Priority: P1)

**Goal**: Enable users to unblock local servers with clear messaging that manual re-add is required

**Independent Test**: Block a local server → unblock it → see message about manual re-add → manually add config → verify server loads

### Tests for User Story 2

- [ ] T026 [P] [US2] Write integration test "unblock local server shows manual re-add message" in `tests/integration/blocking-workflow.test.ts` - Verify UnblockResult has requiresManualAdd=true
- [ ] T027 [P] [US2] Write unit test "unblockLocalServer returns correct result" in `tests/unit/blocked-manager.test.ts` - Test UnblockResult structure

### Implementation for User Story 2

- [ ] T028 [US2] Implement `unblockLocalServer()` in `src/core/blocked-manager.ts` - Return UnblockResult with requiresManualAdd=true and instructions
- [ ] T029 [US2] Update TUI in `src/ui/app.tsx` to display UnblockResult message when unblocking local server
- [ ] T030 [US2] Add help text in TUI showing example configuration for manual re-add
- [ ] T031 [US2] Verify all US2 tests pass

**Checkpoint**: Users can unblock local servers and understand they need to manually re-add configuration

---

## Phase 5: User Story 3 - Block Inherited MCP Server (Priority: P2)

**Goal**: Enable users to block inherited MCP servers (from parent/home) by creating project-level override with dummy command

**Independent Test**: Have parent .claude.json with server → block in project → verify override created → confirm server doesn't load in project but still loads elsewhere

### Tests for User Story 3

- [ ] T032 [P] [US3] Write integration test "block inherited server creates override" in `tests/integration/blocking-workflow.test.ts` - Verify dummy override with _mcpToggleOriginal
- [ ] T033 [P] [US3] Write integration test "blocked inherited server project-specific" in `tests/integration/blocking-workflow.test.ts` - Verify isolation (blocked in project A, active in project B)
- [ ] T034 [P] [US3] Write unit test "blockInheritedServer creates correct override" in `tests/unit/blocked-manager.test.ts` - Test override structure

### Implementation for User Story 3

- [ ] T035 [US3] Implement `blockInheritedServer()` in `src/core/blocked-manager.ts` - Create dummy override using createDummyOverride(), write to project config
- [ ] T036 [US3] Add validation in `blockInheritedServer()` - Ensure server is actually inherited (hierarchyLevel > 0)
- [ ] T037 [US3] Add validation in `blockInheritedServer()` - Preserve original config in _mcpToggleOriginal field
- [ ] T038 [US3] Update TUI in `src/ui/app.tsx` to distinguish inherited servers (🏠 Inherited icon)
- [ ] T039 [US3] Wire up TUI toggle action to call `blockInheritedServer()` when inherited server selected
- [ ] T040 [US3] Verify all US3 tests pass

**Checkpoint**: Users can block inherited servers project-specifically without affecting other projects

---

## Phase 6: User Story 4 - Unblock Inherited MCP Server (Priority: P2)

**Goal**: Enable users to unblock inherited servers by removing override from project .claude.json

**Independent Test**: Block inherited server → unblock it → verify override removed → confirm server loads from parent config

### Tests for User Story 4

- [ ] T041 [P] [US4] Write integration test "unblock inherited server removes override" in `tests/integration/blocking-workflow.test.ts` - Verify override deleted, server loads from parent
- [ ] T042 [P] [US4] Write unit test "unblockInheritedServer removes override" in `tests/unit/blocked-manager.test.ts` - Test override removal

### Implementation for User Story 4

- [ ] T043 [US4] Implement `unblockInheritedServer()` in `src/core/blocked-manager.ts` - Read project config, remove server entry (override), write atomically
- [ ] T044 [US4] Add validation in `unblockInheritedServer()` - Handle case where override doesn't exist (already unblocked)
- [ ] T045 [US4] Update TUI to show clear message that server will restore from parent config
- [ ] T046 [US4] Verify all US4 tests pass

**Checkpoint**: Users can unblock inherited servers and they restore from parent configuration

---

## Phase 7: User Story 5 - Block Memory Files (Priority: P3)

**Goal**: Enable users to block memory files by renaming them with .blocked extension

**Independent Test**: Have .md file → block it → verify renamed to .md.blocked → confirm Claude Code doesn't load it

### Tests for User Story 5

- [ ] T047 [P] [US5] Write integration test "block memory file renames correctly" in `tests/integration/blocking-workflow.test.ts` - Verify file.md → file.md.blocked
- [ ] T048 [P] [US5] Write unit test "blockMemoryFile handles path correctly" in `tests/unit/blocked-manager.test.ts` - Test rename operation

### Implementation for User Story 5

- [ ] T049 [US5] Implement `blockMemoryFile()` in `src/core/blocked-manager.ts` - Rename file.md to file.md.blocked using fs.move()
- [ ] T050 [US5] Add validation in `blockMemoryFile()` - Check file exists before rename
- [ ] T051 [US5] Add error handling in `blockMemoryFile()` - Handle permission errors, disk full
- [ ] T052 [US5] Update memory file loading in `src/services/memory-loader.ts` to skip .blocked files
- [ ] T053 [US5] Update TUI to show memory files with blocking indicators
- [ ] T054 [US5] Verify all US5 tests pass

**Checkpoint**: Users can block memory files and they won't load

---

## Phase 8: User Story 6 - Unblock Memory Files (Priority: P3)

**Goal**: Enable users to unblock memory files by removing .blocked extension

**Independent Test**: Have .md.blocked file → unblock it → verify renamed to .md → confirm Claude Code loads it

### Tests for User Story 6

- [ ] T055 [P] [US6] Write integration test "unblock memory file renames correctly" in `tests/integration/blocking-workflow.test.ts` - Verify file.md.blocked → file.md
- [ ] T056 [P] [US6] Write integration test "handles nested .blocked extensions" in `tests/integration/blocking-workflow.test.ts` - Test file.md.blocked.blocked case
- [ ] T057 [P] [US6] Write unit test "unblockMemoryFile handles path correctly" in `tests/unit/blocked-manager.test.ts` - Test rename operation

### Implementation for User Story 6

- [ ] T058 [US6] Implement `unblockMemoryFile()` in `src/core/blocked-manager.ts` - Rename file.md.blocked to file.md
- [ ] T059 [US6] Add validation in `unblockMemoryFile()` - Handle nested .blocked extensions gracefully (remove one level)
- [ ] T060 [US6] Add error handling in `unblockMemoryFile()` - Handle permission errors, file conflicts
- [ ] T061 [US6] Verify all US6 tests pass

**Checkpoint**: Users can unblock memory files and they will load normally

---

## Phase 9: User Story 7 - Migrate from Legacy Blocked.md (Priority: P3)

**Goal**: Automatically migrate users from v0.1.x .claude/blocked.md format to v2.0.0 .claude.json mechanism

**Independent Test**: Create legacy blocked.md with servers/files → run tool → verify blocks applied via .claude.json → confirm legacy file marked deprecated

### Tests for User Story 7

- [ ] T062 [P] [US7] Write integration test "migration detects legacy file" in `tests/integration/migration.test.ts` - Test legacy file detection
- [ ] T063 [P] [US7] Write integration test "migration applies blocks correctly" in `tests/integration/migration.test.ts` - Verify servers blocked, memory files renamed
- [ ] T064 [P] [US7] Write integration test "migration preserves legacy file" in `tests/integration/migration.test.ts` - Verify deprecation notice prepended
- [ ] T065 [P] [US7] Write integration test "migration handles missing legacy file" in `tests/integration/migration.test.ts` - Test no-op when file doesn't exist
- [ ] T066 [P] [US7] Write unit test "migration parses legacy format" in `tests/unit/blocked-manager.test.ts` - Test parsing mcp: and memory: lines

### Implementation for User Story 7

- [ ] T067 [US7] Implement `migrateFromLegacyBlocked()` in `src/core/blocked-manager.ts` - Check for .claude/blocked.md existence
- [ ] T068 [US7] Implement legacy file parser in `migrateFromLegacyBlocked()` - Extract server names (mcp: lines) and memory files (memory: lines)
- [ ] T069 [US7] Implement block application in `migrateFromLegacyBlocked()` - Call blockLocalServer/blockInheritedServer for each server
- [ ] T070 [US7] Implement memory file migration in `migrateFromLegacyBlocked()` - Call blockMemoryFile for each memory entry
- [ ] T071 [US7] Implement legacy file deprecation in `migrateFromLegacyBlocked()` - Prepend deprecation notice, preserve original content
- [ ] T072 [US7] Add migration call to CLI entry point in `src/cli.ts` - Run before TUI launch (one-time, conditional)
- [ ] T073 [US7] Add migration logging to console - Show counts and results
- [ ] T074 [US7] Verify all US7 tests pass

**Checkpoint**: v0.1.x users automatically migrate to v2.0.0 without data loss

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T075 [P] [Polish] Deprecate `src/core/claude-md-updater.ts` - Add deprecation notice, document that CLAUDE.md integration no longer needed (FR-027)
- [ ] T076 [P] [Polish] Update tests in `tests/unit/claude-md-updater.test.ts` to mark as deprecated
- [ ] T077 [P] [Polish] Remove CLAUDE.md integration from save workflow (no longer needed)
- [ ] T078 [P] [Polish] Update README.md with v2.0.0 architecture explanation (reference quickstart.md)
- [ ] T079 [P] [Polish] Update CHANGELOG.md for v2.0.0 release - Major version bump, breaking changes, migration guide
- [ ] T080 [P] [Polish] Add edge case handling for malformed .claude.json (backup to .claude.json.backup, create new valid file)
- [ ] T081 [P] [Polish] Add edge case handling for concurrent modifications (last-write-wins with atomic operations)
- [ ] T082 [P] [Polish] Add edge case handling for disk full errors (fail gracefully, restore backup)
- [ ] T083 [P] [Polish] Add TUI emoji fallback for terminals without emoji support (--no-emoji flag)
- [ ] T084 [P] [Polish] Cross-platform testing on Windows, macOS, Linux (file permissions, atomic writes)
- [ ] T085 [Polish] Run complete test suite - Verify all 78+ tests pass
- [ ] T086 [Polish] Performance testing - Verify <2s blocking operations, <500ms memory operations (SC-002, SC-011)
- [ ] T087 [Polish] End-to-end validation using quickstart.md examples
- [ ] T088 [Polish] Security audit - File permissions, no credential exposure, path traversal protection

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel (if multiple AI agents available)
  - OR sequentially in priority order: US1 → US2 → US3 → US4 → US5 → US6 → US7
- **Polish (Phase 10)**: Depends on desired user stories being complete

### User Story Dependencies

**Independent Stories** (can be implemented in parallel after Foundation):
- **User Story 1 (P1)**: Block local servers - No dependencies
- **User Story 2 (P1)**: Unblock local servers - Depends on US1 (needs blocking first)
- **User Story 3 (P2)**: Block inherited servers - No dependencies on US1/US2
- **User Story 4 (P2)**: Unblock inherited servers - Depends on US3 (needs inherited blocking first)
- **User Story 5 (P3)**: Block memory files - No dependencies on US1-4
- **User Story 6 (P3)**: Unblock memory files - Depends on US5 (needs memory blocking first)
- **User Story 7 (P3)**: Migration - Depends on US1, US3, US5 (uses blocking functions)

**Recommended Order**:
1. US1 + US2 (local server blocking/unblocking) - Core MVP
2. US3 + US4 (inherited server blocking/unblocking) - Essential for multi-project
3. US5 + US6 (memory file blocking/unblocking) - Nice-to-have enhancement
4. US7 (migration) - Backward compatibility (can be done anytime after US1/US3/US5)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Foundation utilities before blocking logic
- Blocking logic before TUI integration
- Core implementation before edge cases
- Story complete and tested before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundation)**: Tasks T009-T012 can run in parallel (different functions, no dependencies)

**Phase 3 (US1)**: Tests T016-T018 can run in parallel

**Phase 5 (US3)**: Tests T032-T034 can run in parallel

**Phase 7 (US5)**: Tests T047-T048 can run in parallel

**Phase 8 (US6)**: Tests T055-T057 can run in parallel

**Phase 9 (US7)**: Tests T062-T066 can run in parallel

**Phase 10 (Polish)**: Tasks T075-T084 can run in parallel (documentation, testing, edge cases)

**Multi-Agent Parallel Strategy** (if multiple AI agents available):
- After Foundation completes:
  - Agent 1: US1 + US2 (local blocking)
  - Agent 2: US3 + US4 (inherited blocking)
  - Agent 3: US5 + US6 (memory blocking)
  - Agent 4: US7 (migration - waits for 1/2/3)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (Claude Code with parallel tool calls):
Agent: "Write integration test 'block local server' in tests/integration/blocking-workflow.test.ts"
Agent: "Write integration test 'blocked local server doesn't load' in tests/integration/blocking-workflow.test.ts"
Agent: "Write unit test 'blockLocalServer removes config' in tests/unit/blocked-manager.test.ts"

# Results: 3 tests created, all should FAIL initially
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T015) - **CRITICAL - blocks all stories**
3. Complete Phase 3: User Story 1 (T016-T025) - Block local servers
4. Complete Phase 4: User Story 2 (T026-T031) - Unblock local servers
5. **STOP and VALIDATE**: Test US1+US2 independently with real Claude Code
6. Decision point: Ship v2.0.0-beta OR continue to full feature set

### Incremental Delivery

1. Setup + Foundation → ~15 tasks → **Foundation ready**
2. Add US1+US2 → +16 tasks → Test independently → **MVP (local blocking)**
3. Add US3+US4 → +15 tasks → Test independently → **v2.0.0-beta (inherited blocking)**
4. Add US5+US6 → +14 tasks → Test independently → **Enhanced (memory management)**
5. Add US7 → +13 tasks → Test independently → **Complete (backward compatible)**
6. Polish → +14 tasks → **v2.0.0 production ready**

### Parallel AI Agent Strategy

With multiple Claude Code instances or sub-agents:

1. **Single agent completes Setup + Foundation** (sequential, ~18 tasks)
2. Once Foundation done, **split user stories across agents**:
   - Primary Agent: US1+US2 (local blocking/unblocking)
   - Sub-Agent 1: US3+US4 (inherited blocking/unblocking)
   - Sub-Agent 2: US5+US6 (memory file management)
   - Sub-Agent 3: US7 (migration) - starts after others complete
3. Stories complete and integrate independently
4. **Merge and validate** with complete test suite
5. Final agent does Polish phase

**Estimated Task Count**: 88 tasks total
- Setup: 3 tasks
- Foundation: 12 tasks (BLOCKING)
- US1 (P1): 10 tasks
- US2 (P1): 6 tasks
- US3 (P2): 9 tasks
- US4 (P2): 6 tasks
- US5 (P3): 9 tasks
- US6 (P3): 7 tasks
- US7 (P3): 13 tasks
- Polish: 14 tasks

**Parallel Opportunities Identified**: 28 tasks marked [P] can run in parallel
**Independent Test Criteria**: Each user story has 2-5 tests verifying independence

**Suggested MVP Scope**: User Story 1 + 2 (local server blocking/unblocking) = 16 implementation tasks + foundation

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD approach**: Verify tests fail before implementing
- Commit after each task or logical group (use conventional commits)
- Stop at any checkpoint to validate story independently
- Use Task tool to delegate complex multi-file operations to sub-agents
- Foundation phase (T004-T015) is CRITICAL - no user story work can proceed until complete
- Atomic writes with backup/restore prevent .claude.json corruption (SC-003)
- Performance targets: <2s blocking, <500ms memory ops (SC-002, SC-011)

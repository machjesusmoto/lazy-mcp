# Tasks: MCP Toggle

**Input**: Design documents from `/specs/001-mcp-toggle-a/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included per spec.md requirement (Jest + ts-jest for unit and integration tests)

**Organization**: Tasks grouped by user story to enable independent implementation and testing. Optimized for parallel execution by agentic workers.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
Single project structure (src/, tests/ at repository root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] **T001** Create project root structure (src/, tests/, bin/, specs/)
- [X] **T002** Initialize Node.js project with package.json (node >=18.0.0, TypeScript 5.x)
- [X] **T003** [P] Create tsconfig.json with ES2022 target, strict mode, module: commonjs
- [X] **T004** [P] Create jest.config.js with ts-jest preset and coverage thresholds
- [X] **T005** [P] Install core dependencies: ink, react, commander, fs-extra, fast-glob
- [X] **T006** [P] Install dev dependencies: typescript, @types/node, @types/react, jest, ts-jest
- [X] **T007** [P] Create .gitignore (node_modules/, dist/, coverage/, *.log)
- [X] **T008** [P] Create README.md with project overview and installation instructions
- [X] **T009** [P] Setup ESLint and Prettier configurations for TypeScript

**Checkpoint**: Project structure and tooling ready for development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Data Models (Required by All Stories)

- [X] **T010** [P] Create src/models/mcp-server.ts with MCPServer interface per data-model.md
- [X] **T011** [P] Create src/models/memory-file.ts with MemoryFile interface per data-model.md
- [X] **T012** [P] Create src/models/config-source.ts with ConfigSource interface per data-model.md
- [X] **T013** [P] Create src/models/blocked-item.ts with BlockedItem interface per data-model.md
- [X] **T014** [P] Create src/models/project-context.ts with ProjectContext interface per data-model.md
- [X] **T015** [P] Create src/models/index.ts to export all model interfaces

### Core Utilities (Required by All Stories)

- [X] **T016** [P] Create src/utils/file-utils.ts with atomic file write, read, and directory creation functions
- [X] **T017** [P] Create src/utils/path-utils.ts with cross-platform path handling and normalization
- [X] **T018** [P] Create src/utils/json-parser.ts with safe JSON parsing and error handling
- [X] **T019** Create src/utils/index.ts to export all utility functions

### Test Infrastructure

- [X] **T020** [P] Create tests/fixtures/sample-projects/ directory structure
- [X] **T021** [P] Create tests/fixtures/mock-configs/ with sample .claude.json files
- [X] **T022** [P] Create tests/fixtures/sample-projects/simple/ with basic test project
- [X] **T023** [P] Create tests/fixtures/sample-projects/nested/ with hierarchical test project
- [X] **T024** [P] Create tests/fixtures/sample-projects/complex/ with full-featured test project
- [X] **T025** [P] Create tests/helpers/test-utils.ts with common test utilities

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Available MCP Servers and Memory (Priority: P1) 🎯 MVP

**Goal**: Enumerate all MCP servers and memory files (local + inherited) and display them to the user

**Independent Test**: Run tool in any project directory, verify it displays all MCP servers and memory files with source annotations

### Unit Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] **T026** [P] [US1] Unit test for config-loader in tests/unit/config-loader.test.ts
  - Test parsing .claude.json files
  - Test hierarchy traversal (current → parent → home)
  - Test merging configurations (child overrides parent)
  - Test error handling (invalid JSON, missing files)

- [ ] **T027** [P] [US1] Unit test for memory-loader in tests/unit/memory-loader.test.ts
  - Test enumerating .claude/memories/ directories
  - Test recursive file discovery
  - Test symlink handling
  - Test hierarchy traversal

- [ ] **T028** [P] [US1] Unit test for blocked-manager (read operations) in tests/unit/blocked-manager.test.ts
  - Test parsing blocked.md format per spec
  - Test empty/missing blocked.md
  - Test invalid entries (graceful skipping)

### Implementation for User Story 1

- [ ] **T029** [P] [US1] Implement src/core/config-loader.ts
  - Function: `loadMCPServers(startDir: string): MCPServer[]`
  - Walk directory tree from startDir to home directory
  - Parse .claude.json at each level using json-parser
  - Create MCPServer objects with hierarchy metadata
  - Handle errors gracefully (log and continue)

- [ ] **T030** [P] [US1] Implement src/core/memory-loader.ts
  - Function: `loadMemoryFiles(startDir: string): MemoryFile[]`
  - Walk directory tree finding .claude/memories/ directories
  - Enumerate .md files recursively
  - Handle symlinks with fs.realpath
  - Create MemoryFile objects with metadata
  - Get file previews (first 200 chars)

- [ ] **T031** [P] [US1] Implement src/core/blocked-manager.ts (read operations only)
  - Function: `loadBlockedItems(projectDir: string): BlockedItem[]`
  - Read .claude/blocked.md if exists
  - Parse line-by-line per blocked-md-format.md spec
  - Handle sections (MCP Servers, Memory Files)
  - Return BlockedItem array

- [ ] **T032** [US1] Implement src/core/project-context-builder.ts
  - Function: `buildProjectContext(projectDir: string): ProjectContext`
  - Orchestrates loading: MCPServers (T029) + MemoryFiles (T030) + BlockedItems (T031)
  - Applies blocked state to servers and files
  - Calculates hierarchy levels and source types
  - Returns complete ProjectContext with timing metrics

- [ ] **T033** [P] [US1] Create src/tui/components/server-list.tsx
  - Display list of MCPServer items using ink components
  - Show name, source path, source type [local/inherited]
  - Show blocked status (✓/✗) and timestamp if blocked
  - Highlight selected item
  - Handle keyboard navigation (↑/↓)

- [ ] **T034** [P] [US1] Create src/tui/components/memory-list.tsx
  - Display list of MemoryFile items using ink components
  - Show name, path, source type [local/inherited]
  - Show content preview (truncated)
  - Show blocked status and timestamp
  - Handle keyboard navigation

- [ ] **T035** [P] [US1] Create src/tui/components/status-bar.tsx
  - Display project path, counts (total, blocked)
  - Display keyboard hints (Space: Toggle, Enter: Save, Esc: Cancel)
  - Update dynamically based on state

- [ ] **T036** [P] [US1] Create src/tui/hooks/use-keyboard.ts
  - Custom hook for keyboard event handling
  - Support navigation keys (↑/↓/j/k, Home, End, Tab)
  - Support action keys (Space, Enter, Esc/q)
  - Return keyboard state and handlers

- [ ] **T037** [US1] Create src/tui/app.tsx (view-only mode for US1)
  - Main TUI component using ink
  - Tab switching between MCP and Memory views
  - Display ServerList or MemoryList based on active tab
  - Display StatusBar
  - Handle keyboard navigation (use-keyboard hook)
  - Exit on Esc/q (no save functionality yet - US2)

- [ ] **T038** [US1] Create src/cli/index.ts (basic CLI)
  - Setup commander for CLI parsing
  - Handle --version, --help flags per cli-contract.md
  - Load ProjectContext from current directory (T032)
  - Launch ink TUI with app component (T037)
  - Handle errors with appropriate exit codes

- [ ] **T039** [US1] Create bin/mcp-toggle executable script
  - Shebang: #!/usr/bin/env node
  - Import and execute src/cli/index.ts
  - Set as executable (chmod +x)

### Integration Tests for User Story 1

- [ ] **T040** [US1] Integration test in tests/integration/enumeration.test.ts
  - Test complete enumeration flow using fixture projects
  - Verify MCPServers loaded correctly from hierarchy
  - Verify MemoryFiles loaded correctly from hierarchy
  - Verify source types and hierarchy levels correct
  - Verify blocked state applied correctly
  - Test with simple, nested, and complex fixtures

**Checkpoint**: User Story 1 complete - tool can enumerate and display all items

---

## Phase 4: User Story 2 - Toggle MCP Servers and Memory On/Off (Priority: P2)

**Goal**: Allow users to interactively toggle items and persist changes to blocked.md

**Independent Test**: Toggle items in TUI, save, verify blocked.md created/updated correctly, re-run tool to confirm state persists

### Unit Tests for User Story 2

- [ ] **T041** [P] [US2] Unit test for blocked-manager (write operations) in tests/unit/blocked-manager.test.ts (extend existing file)
  - Test writing blocked.md format per spec
  - Test creating .claude/ directory if missing
  - Test atomic file writes (temp file + rename)
  - Test updating existing blocked.md
  - Test removing items from blocked.md

### Implementation for User Story 2

- [ ] **T042** [US2] Extend src/core/blocked-manager.ts with write operations
  - Function: `saveBlockedItems(projectDir: string, items: BlockedItem[]): void`
  - Generate blocked.md content per format spec (blocked-md-format.md)
  - Create .claude/ directory if missing (755 permissions)
  - Atomic write: temp file + rename
  - Update timestamp in header

- [ ] **T043** [US2] Extend src/tui/app.tsx with toggle functionality
  - Add state management for pending changes
  - Handle Space key to toggle selected item (blocked ⇄ enabled)
  - Update visual indicator immediately (optimistic UI)
  - Track changes in memory (don't persist until Enter)

- [ ] **T044** [US2] Extend src/tui/app.tsx with save/cancel functionality
  - Handle Enter key to save changes
  - Call saveBlockedItems (T042) with updated state
  - Show success message "✓ Saved N changes to .claude/blocked.md"
  - Handle Esc/q to cancel without saving
  - Show "No changes made" message on cancel

- [ ] **T045** [US2] Extend src/tui/components/server-list.tsx and memory-list.tsx
  - Add visual indication for pending changes
  - Show "pending" state with different styling
  - Update blocked status immediately on toggle

- [ ] **T046** [US2] Add error handling to src/cli/index.ts
  - Catch permission denied errors (exit code 3)
  - Catch disk full errors (exit code 1)
  - Display user-friendly error messages per cli-contract.md
  - Provide recovery instructions

### Integration Tests for User Story 2

- [ ] **T047** [US2] Integration test in tests/integration/blocking.test.ts
  - Test blocking MCP server: toggle → save → verify blocked.md
  - Test blocking memory file: toggle → save → verify blocked.md
  - Test unblocking items: toggle back → save → verify removed from blocked.md
  - Test cancel: toggle → cancel → verify no changes to blocked.md
  - Test persistence: block → save → reload tool → verify state persists
  - Test .claude/ directory creation if missing
  - Test atomic writes (no corruption on failure)

**Checkpoint**: User Story 2 complete - users can toggle items and changes persist

---

## Phase 5: User Story 3 - Automatic Claude.md Integration (Priority: P3)

**Goal**: Automatically update claude.md with integration instructions when items are blocked

**Independent Test**: Block items, verify claude.md created/updated with integration block, verify existing content preserved

### Unit Tests for User Story 3

- [ ] **T048** [P] [US3] Unit test for claude-md-updater in tests/unit/claude-md-updater.test.ts
  - Test creating claude.md from scratch
  - Test appending integration to existing claude.md
  - Test detecting existing integration (no-op)
  - Test preserving existing content
  - Test marker detection (start/end comments)
  - Test atomic writes

### Implementation for User Story 3

- [ ] **T049** [US3] Implement src/core/claude-md-updater.ts
  - Function: `updateClaudeMd(projectDir: string): boolean`
  - Define integration template per claude-md-integration.md spec
  - Function: `hasIntegration(content: string): boolean` - detect markers
  - Function: `addIntegration(content: string): string` - append block
  - Read existing claude.md or create new
  - Check for integration, add if missing
  - Atomic write with preservation of existing content
  - Return success/failure

- [ ] **T050** [US3] Extend src/cli/index.ts to call claude-md-updater
  - After saving blocked.md (T044), call updateClaudeMd (T049)
  - Handle success: show "✓ Updated claude.md with integration instructions"
  - Handle failure: show warning, blocked.md still works
  - Don't block on claude.md errors (graceful degradation)

- [ ] **T051** [US3] Update src/tui/app.tsx success message
  - After save, show status for both files:
    - "✓ Saved N changes to .claude/blocked.md"
    - "✓ Updated claude.md with integration instructions" (or "already present")

### Integration Tests for User Story 3

- [ ] **T052** [US3] Integration test in tests/integration/claude-integration.test.ts
  - Test creating claude.md from scratch
  - Test appending to existing claude.md (preserve content)
  - Test idempotency (already integrated → no changes)
  - Test integration block format matches spec
  - Test marker detection
  - Test permission errors (graceful degradation)
  - Test full workflow: block → save → verify both blocked.md and claude.md

**Checkpoint**: User Story 3 complete - full MVP functionality implemented

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, final polish for MVP release

### Documentation

- [ ] **T053** [P] Update README.md with complete installation and usage instructions
- [ ] **T054** [P] Create CONTRIBUTING.md with development setup and guidelines
- [ ] **T055** [P] Create CHANGELOG.md with version 0.1.0 release notes
- [ ] **T056** [P] Add inline code documentation (JSDoc) to all public functions

### Package Configuration

- [ ] **T057** Configure package.json for npm publishing
  - Set name: "mcp-toggle"
  - Set version: "0.1.0"
  - Set bin entry: "./bin/mcp-toggle"
  - Set files: ["dist", "bin", "README.md"]
  - Set engines: "node >=18.0.0"
  - Add build script: "tsc"
  - Add test script: "jest"
  - Add prepublish script

- [ ] **T058** [P] Create .npmignore to exclude unnecessary files from package
- [ ] **T059** [P] Add repository, bugs, homepage URLs to package.json

### Performance & Quality

- [ ] **T060** [P] Add performance metrics to project-context-builder (T032)
  - Track enumeration time
  - Log warning if >2s (per SC-001)
  - Add debug output with MCP_TOGGLE_DEBUG env var

- [ ] **T061** [P] Add input validation to all public functions
  - Validate directory paths
  - Validate BlockedItem data
  - Validate file permissions before operations

- [ ] **T062** [P] Implement error boundaries in TUI components
  - Catch render errors
  - Display user-friendly error screens
  - Provide recovery options

### Build & Distribution

- [ ] **T063** Build TypeScript to JavaScript in dist/ directory
  - Run: `npm run build` (tsc)
  - Verify output in dist/
  - Test bin/mcp-toggle works with compiled code

- [ ] **T064** [P] Add GitHub Actions CI workflow (if repository exists)
  - Run tests on push
  - Run build verification
  - Test on Node 18, 20

### Final Testing

- [ ] **T065** Manual cross-platform testing
  - Test on Linux (Ubuntu, Arch)
  - Test on macOS
  - Test on Windows (native + WSL)
  - Verify path handling
  - Verify TUI rendering

- [ ] **T066** Performance validation against success criteria
  - SC-001: Enumeration <2s (test with 20+ servers, 50+ files)
  - SC-002: Toggle in ≤3 interactions (usability test)
  - SC-003: 100% persistence (reliability test)
  - SC-006: No degradation with scale (performance test)

**Checkpoint**: MVP ready for release - all success criteria validated

---

## Dependency Graph

### User Story Completion Order

```
Phase 1: Setup
└─> Phase 2: Foundational
    └─> Phase 3: User Story 1 (P1) 🎯 MVP Core
        └─> Phase 4: User Story 2 (P2) ⚡ MVP Complete
            └─> Phase 5: User Story 3 (P3) ✨ Enhanced MVP
                └─> Phase 6: Polish 🚀 Release Ready
```

### Story Dependencies

- **US1**: No dependencies (can start after Foundation)
- **US2**: Depends on US1 (needs enumeration to toggle)
- **US3**: Depends on US2 (needs save functionality to trigger integration)

### Parallel Execution Opportunities Within Each Phase

**Phase 1 Setup**: Tasks T003-T009 can run in parallel (8 parallel tasks)

**Phase 2 Foundational**:
- Models (T010-T015): 6 parallel tasks
- Utils (T016-T018): 3 parallel tasks
- Test fixtures (T020-T025): 6 parallel tasks

**Phase 3 US1 - Tests**: T026-T028 can run in parallel (3 parallel tasks)

**Phase 3 US1 - Implementation**:
- Core logic (T029-T031): 3 parallel tasks
- TUI components (T033-T036): 4 parallel tasks
- T032 depends on T029-T031 completing
- T037-T039 sequential (depend on previous)

**Phase 4 US2**: T041-T042 parallel, T043-T046 sequential

**Phase 5 US3**: T048-T049 parallel, T050-T052 sequential

**Phase 6 Polish**: T053-T056, T058-T062, T064 can run in parallel (14 parallel tasks)

---

## Parallel Execution Strategy for Agentic Workers

### Optimal Sharding for Agent Workers

**Agent Pool Configuration**: 4-6 parallel workers optimal for this project

**Phase 1: 2 agents**
- Agent A: T001-T002 (project structure, initialization) → T003-T004
- Agent B: T005-T009 (dependencies, configs, docs)

**Phase 2: 3 agents**
- Agent A: Models (T010-T015) → Utils index (T019)
- Agent B: Utils (T016-T018)
- Agent C: Test fixtures (T020-T025)

**Phase 3 US1: 4 agents**
- Agent A: config-loader test (T026) → config-loader impl (T029)
- Agent B: memory-loader test (T027) → memory-loader impl (T030)
- Agent C: blocked-manager test (T028) → blocked-manager impl (T031)
- Agent D: TUI components (T033-T036 parallel)
- Sequential: T032 (all A,B,C done) → T037 → T038-T040 (agent D)

**Phase 4 US2: 2 agents**
- Agent A: Test (T041) → blocked-manager writes (T042)
- Agent B: TUI extensions (T043-T045) → error handling (T046) → integration test (T047)

**Phase 5 US3: 2 agents**
- Agent A: Test (T048) → claude-md-updater (T049)
- Agent B: CLI integration (T050-T051) → integration test (T052)

**Phase 6 Polish: 3 agents**
- Agent A: Documentation (T053-T056)
- Agent B: Package config (T057-T059), build (T063)
- Agent C: Quality (T060-T062), CI (T064), testing (T065-T066)

### Agent Handoff Points

**Critical Synchronization Points**:
1. After Phase 1: All agents wait before starting Phase 2
2. After Phase 2: All agents wait before starting Phase 3
3. Within Phase 3: T032 waits for T029-T031 completion
4. After each Phase: Checkpoint validation before proceeding

### Workload Distribution

**Total Tasks**: 66 tasks
- **Parallel-capable**: 42 tasks (64%)
- **Sequential-required**: 24 tasks (36%)

**Per User Story**:
- US1: 15 tasks (5 parallel tests, 4 parallel core, 4 parallel TUI, 2 sequential)
- US2: 7 tasks (6 tasks with some parallelism)
- US3: 5 tasks (2 parallel tests/impl, 3 sequential integration)

**Estimated Completion Time** (with 4 agents):
- Sequential only: ~66 hours
- With optimal parallelization: ~28-32 hours (58% reduction)

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phase 1 + Phase 2 + Phase 3 (US1 only)** = Core MVP
- Can enumerate and view MCP servers and memory files
- Value: Diagnostic tool for Claude Code configuration
- Estimated: 40 tasks, ~18-20 hours with 4 agents

### Enhanced MVP (Recommended First Release)

**MVP + Phase 4 (US2)** = Functional MVP
- Can enumerate, view, and toggle items
- Changes persist to blocked.md
- Value: Full blocking functionality
- Estimated: 47 tasks, ~24-26 hours with 4 agents

### Complete MVP (v0.1.0 Target)

**All Phases** = Complete MVP
- Full feature set as specified
- claude.md integration
- Production-ready polish
- Value: Professional tool ready for distribution
- Estimated: 66 tasks, ~28-32 hours with 4 agents

### Incremental Delivery Approach

1. **Week 1**: Foundation + US1 → Diagnostic tool (demonstrable value)
2. **Week 2**: US2 → Functional blocking (MVP complete)
3. **Week 3**: US3 + Polish → Production release (v0.1.0)

This approach allows early user feedback and validates assumptions before completing all features.

---

## Task Execution Notes

### Test-Driven Development

Tests are written FIRST in TDD style:
1. Write test (should FAIL)
2. Verify test fails
3. Implement feature
4. Verify test passes
5. Refactor if needed

### File Path Guidelines

All paths are relative to project root:
- Source: `src/core/config-loader.ts`
- Tests: `tests/unit/config-loader.test.ts`
- Models: `src/models/mcp-server.ts`
- TUI: `src/tui/components/server-list.tsx`

### Success Criteria Validation

Each phase checkpoint should validate against spec.md Success Criteria:
- **US1**: SC-001 (<2s enumeration), SC-004 (accurate enumeration)
- **US2**: SC-002 (≤3 interactions), SC-003 (persistence), SC-005 (usability)
- **US3**: SC-007 (claude.md correctness)
- **Polish**: SC-006 (scale), all criteria revalidated

---

## Summary

**Total Tasks**: 66
**Parallel Tasks**: 42 (64%)
**User Stories**: 3 (US1=P1, US2=P2, US3=P3)
**MVP Scope**: 40 tasks (US1 only) or 47 tasks (US1+US2 recommended)
**Agent Optimization**: 4-6 workers optimal, 58% time reduction with parallelization
**Estimated Completion**: 28-32 hours with 4 agents (vs 66 hours sequential)

**Independent Test Criteria**:
- **US1**: Run in any project, displays all items with sources
- **US2**: Toggle items, save, reload → state persists
- **US3**: Block items, verify claude.md updated, existing content preserved

Each user story delivers independently testable value and can be demonstrated/released separately.

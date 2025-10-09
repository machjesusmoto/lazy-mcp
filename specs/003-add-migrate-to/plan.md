# Implementation Plan: Migrate to Global

**Branch**: `003-add-migrate-to` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-add-migrate-to/spec.md`

## Summary

Add "Migrate to Global" functionality to mcp-toggle TUI that moves project-local MCP servers from `.mcp.json` to `~/.claude.json`. This enables unified blocking mechanism by converting project-specific servers to global servers, preventing data loss when blocking/unblocking servers. Primary technical approach: extend existing TUI with migration menu, reuse atomic write patterns for file operations, implement conflict resolution UI, and reload project context after migration.

## Technical Context

**Language/Version**: TypeScript 5.5.2 with Node.js >=18.0.0
**Primary Dependencies**: ink 3.2.0 (TUI), fs-extra 11.2.0 (file operations), commander 12.1.0 (CLI), fast-glob 3.3.2 (file discovery)
**Storage**: JSON configuration files (`.mcp.json` in project directories, `~/.claude.json` in user home)
**Testing**: Jest 29.x with existing test infrastructure (unit + integration tests)
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows)
**Project Type**: Single TypeScript project with TUI interface
**Performance Goals**: Migration operations complete in <30 seconds for typical projects (<10 servers), file I/O <100ms per operation
**Constraints**: Must preserve atomic write guarantees, maintain backward compatibility with v2.0.0 blocking mechanism, zero data loss requirement
**Scale/Scope**: Projects with 1-20 MCP servers typical, migration is one-time operation per project, UI must handle up to 50 servers gracefully

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Not yet established for mcp-toggle project (template constitution present but not ratified)

**Assumed Core Principles** (based on existing codebase patterns):

1. ✅ **Atomic Operations**: All file modifications use write-to-temp + atomic-move pattern
   - **Evidence**: Existing `blocked-manager.ts` uses atomic write pattern
   - **Compliance**: Migration will reuse atomic write utilities

2. ✅ **Error Safety**: Graceful error handling with clear user messaging
   - **Evidence**: Existing error handling in TUI and core modules
   - **Compliance**: Migration will follow established error handling patterns

3. ✅ **Test Coverage**: Comprehensive unit and integration tests
   - **Evidence**: 80 tests passing in test suite
   - **Compliance**: Migration will add tests for new functionality (estimated 15-20 new tests)

4. ✅ **Backward Compatibility**: New features don't break existing functionality
   - **Evidence**: v2.0.0 preserved v1.x compatibility
   - **Compliance**: Migration is additive feature, doesn't modify existing blocking mechanism

5. ✅ **User-Centric Design**: TUI interactions follow established patterns
   - **Evidence**: Consistent TUI patterns in `app.tsx` and component files
   - **Compliance**: Migration UI will follow existing navigation and feedback patterns

**Pre-Phase 0 Gate**: ✅ PASS - No constitution violations, follows established patterns

---

**Post-Phase 1 Constitution Re-Check**: ✅ PASS

After completing Phase 0 research and Phase 1 design, re-validation confirms:

1. ✅ **Atomic Operations**: Migration design uses two-phase commit with backup/rollback - maintains atomicity guarantee
2. ✅ **Error Safety**: Comprehensive error handling with MigrationError type and user-friendly messaging
3. ✅ **Test Coverage**: Test strategy defines 15-20 new tests across unit/integration/component levels
4. ✅ **Backward Compatibility**: Migration is additive feature, existing functionality unchanged
5. ✅ **User-Centric Design**: State machine provides clear workflow progression, modal overlay minimizes navigation complexity

**Design Validation**: No new risks or violations introduced by technical design

## Project Structure

### Documentation (this feature)

```
specs/003-add-migrate-to/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (Phase 0-1 planning)
├── research.md          # Phase 0: Technical research and decisions
├── data-model.md        # Phase 1: Migration operation data model
├── quickstart.md        # Phase 1: Developer quick start guide
├── contracts/           # Phase 1: API contracts (if applicable)
│   └── migration-operation.ts  # TypeScript interface contracts
└── checklists/
    └── requirements.md  # Specification quality checklist (completed)
```

### Source Code (repository root)

```
src/
├── models/
│   └── types.ts                    # Add: MigrationOperation, ConflictResolution types
├── core/
│   ├── config-loader.ts            # Existing: MCP server loading
│   ├── blocked-manager.ts          # Existing: Blocking operations
│   └── migration-manager.ts        # NEW: Migration operations
├── tui/
│   ├── app.tsx                     # Modify: Add migration menu option
│   ├── components/
│   │   ├── server-list.tsx         # Existing: Server display
│   │   ├── memory-list.tsx         # Existing: Memory file display
│   │   ├── migration-menu.tsx      # NEW: Migration interface
│   │   └── conflict-resolver.tsx   # NEW: Conflict resolution UI
│   └── hooks/
│       └── use-migration.ts        # NEW: Migration state management
└── utils/
    └── file-operations.ts          # Existing: Atomic write utilities

tests/
├── unit/
│   ├── migration-manager.test.ts   # NEW: Unit tests for migration logic
│   └── conflict-resolution.test.ts # NEW: Unit tests for conflict handling
├── integration/
│   └── migration-flow.test.ts      # NEW: End-to-end migration tests
└── helpers/
    └── test-utils.ts               # Existing: Test utilities (may extend)
```

**Structure Decision**: Single TypeScript project structure maintained. Migration feature adds new modules (`migration-manager.ts`, TUI components) without restructuring. Follows existing pattern of core logic in `src/core/`, UI components in `src/tui/components/`, and comprehensive test coverage in `tests/`.

## Complexity Tracking

*No constitution violations requiring justification*

**Complexity Considerations**:

- **Conflict Resolution UI**: Adds moderate complexity but necessary for data safety (prevents duplicate server names)
- **Selective Migration**: P2 feature adds UI complexity but provides important user flexibility
- **State Management**: Migration requires temporary state (selected servers, conflict resolutions) - using React hooks pattern consistent with existing TUI

**Simplicity Maintained**:
- Reuses atomic write pattern (no new file operation primitives)
- Reuses existing config-loader for validation
- Follows established TUI patterns (navigation, keyboard input, status messages)
- No new external dependencies required

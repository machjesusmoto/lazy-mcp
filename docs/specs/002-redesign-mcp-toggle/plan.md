# Implementation Plan: Actual MCP Server Blocking via .claude.json Modification

**Branch**: `002-redesign-mcp-toggle` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-redesign-mcp-toggle/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Redesign mcp-toggle to enforce MCP server blocking by directly modifying .claude.json files instead of relying on documentation-based blocking that Claude Code doesn't process. The new architecture removes local server configurations from project .claude.json (for local servers) and creates dummy override configurations (for inherited servers) to actually prevent MCP servers from loading at startup. Memory file blocking is implemented via file renaming with .blocked extension. This addresses the fundamental flaw where the v0.1.x tool created .claude/blocked.md documentation that was never enforced by Claude Code.

## Technical Context

**Language/Version**: TypeScript 5.5.2 with Node.js >=18.0.0
**Primary Dependencies**: fs-extra 11.2.0 (file operations), ink 3.2.0 (TUI), commander 12.1.0 (CLI), fast-glob 3.3.2 (file discovery)
**Storage**: File system - .claude.json files in project hierarchy, .md files in .claude/memories/
**Testing**: Jest 29.7.0 with ts-jest, 78 existing tests (unit + integration)
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows) via Node.js
**Project Type**: Single (CLI tool with TUI interface)
**Performance Goals**: <2 seconds blocking operations, <500ms memory file operations
**Constraints**: Atomic writes required (0% corruption), never modify parent/home .claude.json
**Scale/Scope**: 20 servers typical, 50+ memory files possible, <5MB total config size

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No constitution file exists yet - project predates SpecKit adoption.

**Implicit Requirements** (derived from existing codebase):
- ✅ Test coverage maintained (78 tests passing)
- ✅ Backward compatibility with TUI interface
- ✅ Atomic file operations (existing pattern in blocked-manager.ts)
- ✅ Cross-platform support (Node.js >=18)
- ✅ Security: file permissions 644/755, no credential exposure

**New Requirements for v2.0.0**:
- ✅ Data safety: backup/restore for .claude.json modifications
- ✅ Migration: automatic upgrade from v0.1.x blocked.md format
- ✅ User communication: clear messages for unrecoverable operations (local server removal)

**Violations**: None - all requirements align with existing patterns and reasonable defaults.

## Project Structure

### Documentation (this feature)

```
specs/002-redesign-mcp-toggle/
├── spec.md              # Feature specification (COMPLETED)
├── plan.md              # This file (IN PROGRESS)
├── research.md          # Phase 0 output (PENDING)
├── data-model.md        # Phase 1 output (PENDING)
├── quickstart.md        # Phase 1 output (PENDING)
├── contracts/           # Phase 1 output (PENDING)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── core/                # Core blocking logic
│   ├── config-loader.ts         # EXISTING - .claude.json hierarchy loader
│   ├── blocked-manager.ts       # MODIFY - update to use .claude.json
│   ├── claude-md-updater.ts     # DEPRECATE - no longer needed
│   └── claude-json-utils.ts     # NEW - .claude.json read/write utilities
├── models/              # Data structures
│   └── types.ts                 # MODIFY - add blocking metadata types
├── services/            # Business logic
│   └── memory-loader.ts         # EXISTING - memory file enumeration
├── ui/                  # Terminal UI
│   ├── app.tsx                  # MODIFY - update visual indicators
│   └── components/              # EXISTING - TUI components
└── cli.ts               # EXISTING - entry point

tests/
├── unit/
│   ├── config-loader.test.ts           # EXISTING - 78 tests total
│   ├── blocked-manager.test.ts         # MODIFY - update for new architecture
│   ├── claude-md-updater.test.ts       # DEPRECATE
│   └── claude-json-utils.test.ts       # NEW - test utilities
└── integration/
    ├── blocking-workflow.test.ts       # NEW - end-to-end blocking tests
    └── migration.test.ts               # NEW - legacy migration tests

docs/
└── ARCHITECTURE_REDESIGN.md      # EXISTING - original design document
```

**Structure Decision**: Single project structure maintained (Option 1). This is a CLI tool with TUI interface, not a web/mobile app. The existing src/ → tests/ layout is appropriate for a Node.js CLI tool with TypeScript. New utility module (claude-json-utils.ts) fits naturally into src/core/ alongside config-loader.ts. Testing structure remains unit/ + integration/ split with new tests for blocking workflows and migration.

## Complexity Tracking

*No constitution violations - section not needed*

## Phase 0: Outline & Research

### Research Tasks

Since this is an architectural redesign of an existing tool with a detailed design document already created (docs/ARCHITECTURE_REDESIGN.md), most technical decisions are already documented. Research tasks focus on validating approaches and edge cases:

1. **JSON Atomic Write Patterns in Node.js**
   - Research: Best practices for atomic file writes with fs-extra
   - Goal: Zero-corruption guarantee during write failures
   - Expected: Write to .tmp → fs.move() with overwrite → cleanup

2. **.claude.json Override Mechanism**
   - Research: Validate that Claude Code's first-wins hierarchy works as documented
   - Goal: Confirm child configs override parent for same-named servers
   - Expected: Test with actual Claude Code to verify blocking works

3. **File Permission Handling Across Platforms**
   - Research: Cross-platform file permission setting (Linux/macOS/Windows)
   - Goal: Ensure 644 for files, 755 for directories works everywhere
   - Expected: fs.chmod() is no-op on Windows, works on Unix

4. **Migration Strategy from v0.1.x**
   - Research: Best practices for data migration in CLI tools
   - Goal: Automatic, safe migration that preserves user data
   - Expected: Detect legacy file → parse → apply new blocks → mark deprecated

5. **TUI Update Requirements**
   - Research: ink patterns for conditional rendering and visual indicators
   - Goal: Show local vs inherited, blocked vs unblocked clearly
   - Expected: Use color/symbols (e.g., 🏠 for inherited, ❌ for blocked)

### Unknowns from Technical Context

None - all technical context items are known and documented:
- ✅ Language: TypeScript 5.5.2 with Node.js >=18
- ✅ Dependencies: All listed in package.json
- ✅ Storage: File system (.claude.json and .md files)
- ✅ Testing: Jest 29.7.0 established
- ✅ Platform: Cross-platform Node.js
- ✅ Performance: Goals documented in spec (SC-002, SC-011)
- ✅ Constraints: Atomic writes, no parent modification
- ✅ Scale: 20 servers typical

## Phase 1: Design & Contracts

### Data Model Design

Key entities to model in `data-model.md`:

1. **ClaudeJsonConfig** - Complete .claude.json file structure
2. **MCPServerConfig** - Individual server configuration
3. **BlockedMCPServerConfig** - Server with blocking metadata
4. **BlockingMetadata** - _mcpToggleBlocked, _mcpToggleBlockedAt, _mcpToggleOriginal
5. **MCPServer** - Runtime representation (includes sourceType, isBlocked)
6. **MemoryFile** - .md file with blocking state

### API Contracts

File system contracts (not REST APIs - this is a CLI tool):

1. **claude-json-utils.ts** - Core utilities module
   ```typescript
   readClaudeJson(projectDir: string): Promise<ClaudeJsonConfig>
   writeClaudeJson(projectDir: string, config: ClaudeJsonConfig): Promise<void>
   isBlockedServer(config: MCPServerConfig): boolean
   createDummyOverride(serverName: string, original: MCPServerConfig): BlockedMCPServerConfig
   extractOriginalConfig(blocked: BlockedMCPServerConfig): MCPServerConfig
   removeBlockingMetadata(config: MCPServerConfig): MCPServerConfig
   ensureClaudeJson(projectDir: string): Promise<void>
   claudeJsonExists(projectDir: string): Promise<boolean>
   ```

2. **blocked-manager.ts** - Blocking logic (updated)
   ```typescript
   blockLocalServer(projectDir: string, serverName: string): Promise<void>
   blockInheritedServer(projectDir: string, server: MCPServer): Promise<void>
   unblockLocalServer(projectDir: string, serverName: string): Promise<UnblockResult>
   unblockInheritedServer(projectDir: string, serverName: string): Promise<void>
   blockMemoryFile(filePath: string): Promise<void>
   unblockMemoryFile(filePath: string): Promise<void>
   migrateFromLegacyBlocked(projectDir: string): Promise<MigrationResult>
   ```

3. **config-loader.ts** - Discovery logic (minimal changes)
   ```typescript
   loadMCPServers(startDir: string): Promise<MCPServer[]>
   loadMemoryFiles(projectDir: string): Promise<MemoryFile[]>
   // Existing functions remain, add sourceType detection
   ```

### Quickstart Development

`quickstart.md` will contain:
- Overview of new blocking mechanism
- Quick comparison: v0.1.x (documentation) vs v2.0.0 (enforcement)
- Example: Blocking a local server (before/after .claude.json)
- Example: Blocking an inherited server (override creation)
- Example: Memory file blocking (rename operation)
- Migration guide from v0.1.x

### Agent Context Update

Will run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with:
- New architecture approach (direct .claude.json modification)
- Core utilities module (claude-json-utils.ts)
- Blocking workflow changes
- Migration strategy

## Phase 2: Implementation Tasks

*Created by `/speckit.tasks` command - not generated by `/speckit.plan`*

Expected task categories:
1. Core utilities implementation (FR-011 to FR-013)
2. Blocking mechanism (FR-001 to FR-007)
3. Unblocking mechanism (FR-007, FR-008)
4. Memory file handling (FR-009, FR-010)
5. Migration logic (FR-014 to FR-016)
6. TUI updates (FR-021, FR-022)
7. Testing (unit + integration + migration)
8. Documentation updates
9. CLAUDE.md deprecation (FR-027)

## Open Questions

None - specification is complete with all requirements clear and testable.

## Next Steps

1. ✅ Phase 0: Create research.md
2. ✅ Phase 1: Create data-model.md
3. ✅ Phase 1: Create contracts/ directory
4. ✅ Phase 1: Create quickstart.md
5. ⏳ Phase 1: Update agent context (CLAUDE.md)
6. ⏳ Phase 2: Run `/speckit.tasks` to generate implementation task list

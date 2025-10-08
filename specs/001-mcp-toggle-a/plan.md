# Implementation Plan: MCP Toggle

**Branch**: `001-mcp-toggle-a` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-mcp-toggle-a/spec.md`

## Summary

MCP Toggle is a command-line tool that enumerates Claude Code's MCP servers and memory files (both local and inherited from parent directories) and provides a TUI interface for selectively disabling them. The tool will be built with Node.js/TypeScript, distributed via npm, and automatically integrates with Claude Code by managing blocked.md and claude.md files.

## Technical Context

**Language/Version**: Node.js 18+ with TypeScript 5.x
**Primary Dependencies**:
- `@inkjs/ink` or `blessed` for TUI
- `commander` or `yargs` for CLI parsing
- `fs-extra` for file system operations
- `fast-glob` for .claude.json discovery

**Storage**: File-based (blocked.md, claude.md in .claude/ directory)
**Testing**: Jest with ts-jest for unit and integration tests
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows via Node.js)
**Project Type**: Single executable CLI tool with TUI interface
**Performance Goals**:
- Enumerate configurations in <2 seconds
- TUI response time <100ms for user interactions
- Support 20+ MCP servers and 50+ memory files without degradation

**Constraints**:
- Must work from any directory without prior setup
- No external services or network dependencies
- Preserve existing file content when updating claude.md
- Read-only access to parent directories, write access to project .claude/

**Scale/Scope**:
- Single-user tool for development environments
- Supports directory hierarchies up to 20 levels deep
- Handles projects with multiple .claude.json files in hierarchy

## Constitution Check

*No constitution file defined yet. Proceeding with standard software engineering practices.*

**Quality Gates**:
- ✅ Clear user value proposition (visibility and control over Claude Code context)
- ✅ Testable requirements (all functional requirements have clear acceptance criteria)
- ✅ Technology choice justified (Node.js aligns with MCP ecosystem, npm distribution)
- ✅ MVP scope well-defined (3 prioritized user stories)

## Project Structure

### Documentation (this feature)

```
specs/001-mcp-toggle-a/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI contracts)
├── tasks.md             # Phase 2 output (/speckit.tasks command)
└── checklists/
    └── requirements.md  # Quality checklist (completed)
```

### Source Code (repository root)

```
mcp-toggle/
├── src/
│   ├── core/              # Core domain logic
│   │   ├── config-loader.ts     # Load and parse .claude.json files
│   │   ├── memory-loader.ts     # Enumerate memory files
│   │   ├── blocked-manager.ts   # Manage blocked.md
│   │   └── claude-md-updater.ts # Update claude.md
│   ├── models/            # Data models
│   │   ├── mcp-server.ts
│   │   ├── memory-file.ts
│   │   ├── config-source.ts
│   │   └── project-context.ts
│   ├── tui/               # Terminal UI components
│   │   ├── app.tsx              # Main TUI application
│   │   ├── components/
│   │   │   ├── server-list.tsx
│   │   │   ├── memory-list.tsx
│   │   │   └── status-bar.tsx
│   │   └── hooks/
│   │       └── use-keyboard.ts
│   ├── cli/               # CLI entry point
│   │   └── index.ts
│   └── utils/             # Utilities
│       ├── file-utils.ts
│       └── path-utils.ts
│
├── tests/
│   ├── unit/              # Unit tests for core logic
│   │   ├── config-loader.test.ts
│   │   ├── memory-loader.test.ts
│   │   ├── blocked-manager.test.ts
│   │   └── claude-md-updater.test.ts
│   ├── integration/       # Integration tests
│   │   ├── enumeration.test.ts
│   │   ├── blocking.test.ts
│   │   └── claude-integration.test.ts
│   └── fixtures/          # Test fixtures
│       ├── sample-projects/
│       └── mock-configs/
│
├── bin/
│   └── mcp-toggle         # Executable entry point
│
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

**Structure Decision**: Single project structure chosen because:
- This is a standalone CLI tool, not a web or mobile application
- All functionality is self-contained within one executable
- No frontend/backend separation needed
- TUI interface is part of the CLI application, not a separate frontend

## Complexity Tracking

*No constitution violations to track.*

## Phase 0: Research & Technical Decisions

### Research Topics

1. **TUI Library Selection**
   - Decision needed: @inkjs/ink vs blessed vs terminal-kit
   - Criteria: TypeScript support, component model, keyboard handling, cross-platform

2. **Claude Code Configuration Format**
   - Research: Exact structure of .claude.json for MCP servers
   - Research: Memory file naming conventions and organization
   - Research: Hierarchy resolution rules (which .claude.json takes precedence)

3. **blocked.md Format Design**
   - Decision: Line-based format vs structured (JSON/YAML)
   - Criteria: Human-readable, easily parseable by Claude Code, version-controllable

4. **claude.md Integration Pattern**
   - Research: How Claude Code processes .claude/ directory files
   - Research: Best practices for claude.md instruction format
   - Decision: Instruction placement (top/bottom/section)

5. **Cross-platform Path Handling**
   - Research: Node.js path handling for Windows vs Unix
   - Research: Symlink following behavior across platforms

### Output

Research findings will be documented in `research.md` with:
- Decision: [Chosen technology/approach]
- Rationale: [Why this choice]
- Alternatives considered: [What else was evaluated]
- Trade-offs: [Benefits and limitations]

## Phase 1: Design & Contracts

### Prerequisites
- `research.md` complete with all technical decisions made
- TUI library and file formats finalized

### Deliverables

1. **data-model.md**:
   - MCPServer entity (name, source path, type, enabled state)
   - MemoryFile entity (name, path, content preview, enabled state)
   - ConfigSource entity (path, type, hierarchy level)
   - BlockedItem entity (identifier, type, timestamp)
   - ProjectContext entity (aggregates all above)

2. **contracts/**: CLI interface specifications
   - `cli-contract.md`: Command-line arguments, options, exit codes
   - `blocked-md-format.md`: blocked.md file format specification
   - `claude-md-integration.md`: claude.md update rules and format

3. **quickstart.md**:
   - Installation instructions (npm install -g mcp-toggle)
   - Basic usage examples
   - Configuration file examples
   - Troubleshooting guide

4. **Agent context update**: Run `.specify/scripts/bash/update-agent-context.sh claude`

## Phase 2: Task Generation

*To be executed via `/speckit.tasks` command after Phase 1 is complete.*

Tasks will be prioritized by user story priority (P1 → P2 → P3) and will include:
- Core enumeration logic (US1)
- TUI interface implementation (US2)
- blocked.md management (US2)
- claude.md integration (US3)
- Testing and documentation

## Success Metrics

Implementation success will be measured against spec.md Success Criteria:
- SC-001: <2s enumeration (performance test)
- SC-002: ≤3 interactions to toggle (usability test)
- SC-003: 100% persistence (reliability test)
- SC-004: Accurate enumeration (integration test)
- SC-005: 90% first-use success (UX test)
- SC-006: Handle 20+ servers/50+ memory files (scale test)
- SC-007: 100% claude.md integration correctness (integration test)

## Dependencies

### External
- Node.js 18+ runtime
- npm package manager

### Internal
- TUI library (determined in Phase 0)
- CLI parsing library (determined in Phase 0)
- File system utilities (fs-extra, fast-glob)
- TypeScript compiler and type definitions

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claude Code config format changes | Medium | High | Abstract config parsing, add version detection |
| TUI library limitations | Low | Medium | Prototype key interactions early, fallback to simpler UI |
| Cross-platform path issues | Medium | Medium | Extensive testing on all platforms, use path.normalize |
| Performance with many files | Low | Low | Lazy loading, pagination in TUI |
| Write permission denied | Medium | Low | Clear error messages, graceful degradation |

## Next Steps

1. Complete Phase 0: Generate `research.md` with all technical decisions
2. Complete Phase 1: Generate data models, contracts, and quickstart guide
3. Run `/speckit.tasks` to generate implementation task list
4. Begin implementation with P1 tasks (enumeration)

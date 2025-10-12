# Research & Technical Decisions: MCP Toggle

**Date**: 2025-10-07
**Status**: Complete
**Related**: [plan.md](./plan.md), [spec.md](./spec.md)

## Research Topics

### 1. TUI Library Selection

**Decision**: Use `@inkjs/ink` for Terminal UI

**Rationale**:
- React-like component model with JSX/TSX support - familiar paradigm
- Excellent TypeScript support with full type definitions
- Active maintenance and good community support
- Component-based architecture allows for testing individual UI elements
- Built-in state management with React hooks
- Cross-platform support (Windows, macOS, Linux)
- Smaller bundle size compared to blessed

**Alternatives Considered**:
- **blessed**: More mature, feature-rich, but uses callback-based API, less TypeScript-friendly, harder to test
- **terminal-kit**: Good feature set but more complex API, less component-oriented
- **prompts/inquirer**: Too simple for our needs, not suitable for interactive list UI with real-time updates

**Trade-offs**:
- **Benefits**: Clean API, testable components, familiar React patterns, active development
- **Limitations**: Requires React knowledge, slightly heavier than pure terminal libraries
- **Acceptable because**: Team likely familiar with React, benefits outweigh learning curve

**Implementation Notes**:
- Use `ink` for main UI components
- Use `ink-text-input` for any text input needs
- Use `ink-select-input` for list selection (or build custom with keyboard handling)
- Consider `ink-spinner` for loading states during enumeration

---

### 2. Claude Code Configuration Format

**Research Findings**:

#### .claude.json Structure
Based on Claude Code documentation and MCP specification:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "value"
      }
    }
  },
  "globalShortcuts": {},
  "profiles": {}
}
```

**Key Findings**:
- MCP servers defined under `mcpServers` key
- Each server has unique name as key
- Server configuration includes command, args, and optional env
- Multiple .claude.json files can exist in directory hierarchy
- Child directory configs merge with parent configs (child takes precedence for same key)

#### Memory File Organization
```
.claude/
├── memories/
│   ├── project-context.md
│   ├── architecture-notes.md
│   └── coding-standards.md
└── commands/
    └── *.md
```

**Key Findings**:
- Memory files are markdown (.md) in `.claude/memories/` directory
- No specific naming convention enforced
- Files loaded alphabetically by Claude Code
- Can be nested in subdirectories within memories/

#### Hierarchy Resolution Rules
**Decision**: Load all .claude.json files from current directory up to home directory

**Resolution Order**:
1. Start from current working directory
2. Walk up directory tree to user home directory (stop at home, don't go to root)
3. Load .claude.json from each directory found
4. Merge configurations with child overriding parent
5. Tag each MCP server with source path for display

**Rationale**: Matches Claude Code's actual behavior based on documentation

---

### 3. blocked.md Format Design

**Decision**: Use line-based format with item type prefix

**Format Specification**:
```markdown
# Blocked MCP Servers and Memory Files

## MCP Servers
mcp:server-name-1
mcp:server-name-2

## Memory Files
memory:file-name.md
memory:subdirectory/file-name.md
```

**Rationale**:
- Human-readable and version-control friendly
- Easy to parse (line-by-line reading)
- Clear sections for different item types
- Type prefix (`mcp:`, `memory:`) allows unambiguous identification
- Markdown format allows for comments and documentation
- Can be manually edited if needed

**Alternatives Considered**:
- **JSON**: More structured but less human-readable, harder to manually edit
- **YAML**: Good balance but requires parser library, overkill for simple list
- **Plain text (no prefix)**: Ambiguous, can't distinguish MCP from memory file names

**Trade-offs**:
- **Benefits**: Simple, readable, parseable, editable
- **Limitations**: Not as structured as JSON, requires line-by-line parsing
- **Acceptable because**: Simplicity is more important than structure for this use case

**Parsing Algorithm**:
1. Read blocked.md line by line
2. Track current section (MCP Servers or Memory Files)
3. Extract items based on section and prefix
4. Store in appropriate data structure

---

### 4. claude.md Integration Pattern

**Decision**: Append instruction block to end of claude.md, use marker comments for idempotency

**Format**:
```markdown
<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
# MCP Server and Memory Control

This project uses `blocked.md` to control which MCP servers and memory files are loaded.

When Claude Code starts in this directory:
1. Read `.claude/blocked.md` if it exists
2. For each line prefixed with `mcp:`, skip loading that MCP server
3. For each line prefixed with `memory:`, skip loading that memory file

To manage blocked items, run: `npx mcp-toggle`
<!-- End MCP Toggle Integration -->
```

**Rationale**:
- Marker comments allow detection of existing integration (prevent duplicates)
- Clear instructions for Claude Code on how to process blocked.md
- Human-readable explanation helps users understand the system
- Appending to end preserves existing content
- Tool-generated section clearly marked with DO NOT EDIT warning

**Alternatives Considered**:
- **Prepend to beginning**: Could interfere with existing project-specific instructions
- **Inject into specific section**: Too complex, requires understanding claude.md structure
- **Separate file**: Less discoverable, requires additional file

**Trade-offs**:
- **Benefits**: Simple, safe, idempotent, preserves existing content
- **Limitations**: Makes claude.md longer, users might delete section
- **Acceptable because**: Claude Code needs the instructions somewhere, claude.md is the standard location

**Implementation**:
1. Check if markers already exist in claude.md
2. If not, append the integration block
3. If markers exist, verify content is up-to-date (future enhancement)
4. If claude.md doesn't exist, create with just the integration block

---

### 5. Cross-platform Path Handling

**Decision**: Use Node.js `path` module exclusively, avoid manual path manipulation

**Key Practices**:
- Always use `path.join()` for combining paths
- Use `path.resolve()` for converting relative to absolute paths
- Use `path.normalize()` before comparisons
- Use `path.sep` for platform-specific separator if needed
- Use `path.dirname()` and `path.basename()` for path manipulation

**Symlink Handling**:
- Use `fs.realpathSync()` to resolve symlinks when needed
- Use `fs.lstatSync()` to detect symlinks vs regular files
- Follow symlinks for .claude.json discovery (treat as regular directories)
- Display both symlink path and target path for memory files if symlinked

**Windows-Specific Considerations**:
- Handle both forward slash and backslash in paths
- Case-insensitive file system (use `.toLowerCase()` for comparisons)
- Drive letters (C:\) vs Unix root (/)
- Use `process.cwd()` for current directory (cross-platform)

**Research Sources**:
- Node.js path module documentation
- Node.js fs module documentation for symlink handling
- Cross-platform testing with WSL and native Windows

**Trade-offs**:
- **Benefits**: Built-in, well-tested, handles all platform differences
- **Limitations**: None significant
- **Acceptable because**: Standard approach for Node.js cross-platform applications

---

## CLI Framework Selection

**Decision**: Use `commander` for CLI parsing

**Rationale**:
- Industry standard for Node.js CLI applications
- Excellent TypeScript support
- Simple API for defining commands and options
- Built-in help generation
- Version management built-in

**Alternatives Considered**:
- **yargs**: More features but more complex API
- **minimist**: Too low-level, we'd have to build help/validation
- **cac**: Simpler but less mature

**CLI Interface Design**:
```bash
mcp-toggle              # Launch TUI in current directory
mcp-toggle --version    # Show version
mcp-toggle --help       # Show help
```

---

## Testing Strategy

**Decision**: Jest with ts-jest for all testing

**Test Structure**:
```
tests/
├── unit/              # Fast, isolated unit tests
│   ├── config-loader.test.ts      # Test .claude.json parsing
│   ├── memory-loader.test.ts      # Test memory file enumeration
│   ├── blocked-manager.test.ts    # Test blocked.md reading/writing
│   └── claude-md-updater.test.ts  # Test claude.md updates
│
├── integration/       # Slower, multi-component tests
│   ├── enumeration.test.ts        # Test full enumeration flow
│   ├── blocking.test.ts           # Test block/unblock workflow
│   └── claude-integration.test.ts # Test end-to-end with mock projects
│
└── fixtures/
    ├── sample-projects/           # Mock project directories
    │   ├── simple/                # Single .claude.json
    │   ├── nested/                # Multiple levels
    │   └── complex/               # All features
    └── mock-configs/              # Sample .claude.json files
```

**Testing Approach**:
- Unit tests for core logic (>80% coverage target)
- Integration tests for workflows
- Snapshot testing for TUI components
- Manual testing on all platforms (Linux, macOS, Windows)

---

## Package Configuration

**package.json key sections**:
```json
{
  "name": "mcp-toggle",
  "version": "0.1.0",
  "bin": {
    "mcp-toggle": "./bin/mcp-toggle"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@inkjs/ink": "^5.0.0",
    "commander": "^12.0.0",
    "fs-extra": "^11.0.0",
    "fast-glob": "^3.3.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Summary of Technical Decisions

| Decision Area | Choice | Primary Reason |
|---------------|--------|----------------|
| TUI Library | @inkjs/ink | React-like components, TypeScript support |
| CLI Framework | commander | Industry standard, simple API |
| Config Format | .claude.json per Claude Code spec | Compatibility requirement |
| blocked.md Format | Line-based with type prefix | Human-readable, parseable |
| claude.md Integration | Append with markers | Safe, idempotent, preserves content |
| Path Handling | Node.js path module | Cross-platform, built-in |
| Testing | Jest + ts-jest | TypeScript support, familiar |
| Min Node Version | 18.0.0 | LTS, modern features |

All research complete. Ready for Phase 1: Data Models & Contracts.

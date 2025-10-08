# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-10

### Added

#### Core Features
- **MCP Server Enumeration** - Enumerate all MCP servers from `.claude.json` files
  - Scans current directory → parent directories → home directory
  - Supports configuration hierarchy with child overrides
  - Displays source location (Local, Parent, Home)
- **Memory File Enumeration** - Discover all `.md` files in `.claude/memories/`
  - Recursive subdirectory scanning
  - File size and content preview
  - Symlink support with loop detection
- **Interactive TUI** - Terminal user interface with keyboard navigation
  - Two-panel layout (MCP Servers | Memory Files)
  - Real-time toggle visualization (✓/✗ indicators)
  - Status bar with save prompts and statistics
- **Blocking Persistence** - Save blocked items to `.claude/blocked.md`
  - Machine-readable format with timestamp
  - Atomic file writes for data safety
  - Automatic `.claude/` directory creation
- **Claude.md Integration** - Automatic integration with Claude Code
  - Appends instruction block to `claude.md`
  - Idempotent updates (safe to run multiple times)
  - Preserves existing content
  - Can be disabled with `--no-claude-md` flag

#### CLI Interface
- Command-line argument parsing
  - `mcp-toggle [project-directory]` - Specify target directory
  - `--no-claude-md` - Disable automatic claude.md updates
- Comprehensive error handling with exit codes
  - Success (0), General Error (1), Invalid Args (2), Permission Denied (3), Disk Full (28)
- User-friendly error messages with recovery instructions

#### Testing
- 78 comprehensive tests (8 test suites)
  - Unit tests for all core modules
  - Integration tests for complete workflows
  - Test coverage for error conditions
- Test utilities and helpers
  - Temporary directory management
  - Mock file creation
  - Project setup helpers

### Technical Details

#### Architecture
- **TypeScript** - Fully typed codebase with strict mode
- **ink v3** - React-based TUI framework
- **fs-extra** - Enhanced file operations
- **Node.js >= 18** - Modern JavaScript runtime

#### Performance
- Sub-2-second enumeration (tested with 20+ servers, 50+ files)
- Efficient hierarchy traversal with caching
- Minimal memory footprint

#### File Formats

**blocked.md**:
```markdown
# Blocked MCP Servers and Memory Files
# Last updated: 2025-01-10T12:00:00.000Z

## MCP Servers
mcp:server-name

## Memory Files
memory:file-name.md
```

**claude.md integration** (auto-appended):
```markdown
<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
# MCP Server and Memory Control
...
<!-- End MCP Toggle Integration -->
```

### Documentation
- Comprehensive README with usage examples
- CONTRIBUTING.md with development guidelines
- Quickstart guide in specs/
- Full specification and implementation plan

### Security
- File permission validation (644 for blocked.md, claude.md)
- Path traversal protection
- Atomic file writes to prevent corruption
- Read-only directory error handling

---

## [Unreleased]

### Planned Features
- Package publication to npm
- GitHub Actions CI/CD
- Cross-platform testing (Windows, macOS, Linux)
- Performance monitoring and debug mode
- Configuration file support for defaults

---

[0.1.0]: https://github.com/yourusername/mcp-toggle/releases/tag/v0.1.0

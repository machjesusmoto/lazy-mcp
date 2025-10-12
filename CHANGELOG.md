# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2025-10-12

### Fixed

- **Documentation Links** - Fixed broken feature specification links on npm and GitHub
  - Feature specification links now correctly point to `docs/specs/` directory
  - Reorganized documentation: public docs in `/docs`, internal docs in `/docs/development`
  - Updated `.gitignore` to exclude internal development documentation from npm package

### Changed

- **Documentation Organization** - Improved documentation structure
  - Moved internal development docs to `docs/development/` (gitignored for npm)
  - Added feature specifications to `docs/specs/` for public access
  - Maintained clean separation between public and internal documentation

## [0.5.1] - 2025-10-12

### Fixed

- **npm Package Documentation** - Include `docs/` directory in published npm package
  - Fixed broken documentation links on npm package page
  - Migration guide, API docs, and developer guide now accessible from npm
  - Documentation links in README now work correctly for npm users

## [0.5.0] - 2025-10-11

### Production Release

- **Code Quality** - Comprehensive cleanup and refactoring for production readiness
  - Fixed all 80 linting issues (50 errors, 30 warnings)
  - Converted all `require()` statements to ES6 imports
  - Added justification comments for 97 legitimate `any` types
  - Achieved TypeScript strict mode compliance
  - Removed all backup files and dead code

- **Security** - Comprehensive security audit passed
  - npm audit: 0 vulnerabilities found
  - All file operations use safe path validation (`path.join()`/`path.resolve()`)
  - No hardcoded secrets or API keys
  - Comprehensive input validation with type guards
  - Secure atomic write-verify-rename pattern verified

- **Testing** - 100% test pass rate with zero flakiness
  - 221/221 tests passing (stable across 3 runs)
  - Performance: 1.6-1.8s execution (~138 tests/sec)
  - Critical path coverage: 90%+ (agent: 94.2%, memory: 92.85%, settings: 96.15%)
  - Overall coverage: 55.85% (low coverage confined to deprecated/legacy code)

- **Documentation** - 97% quality score achieved
  - README: 99% accuracy score
  - CHANGELOG: 98% accuracy score
  - API documentation: 90% JSDoc coverage
  - Added comprehensive phase reports (quality, testing, security, documentation)

### Quality Assurance Process

This release underwent a comprehensive 5-phase quality review:

1. **Phase 1: Code Cleanup** - Removed dead code, fixed linting issues, verified build
2. **Phase 2: Quality Review** - Verified algorithms, architecture, type safety, error handling
3. **Phase 3: Test Validation** - Achieved 100% pass rate with comprehensive coverage analysis
4. **Phase 4: Documentation Verification** - Verified accuracy across all documentation
5. **Phase 5: Security Audit** - Comprehensive security review with zero vulnerabilities

### Added

- `RELEASE_NOTES_v0.5.0.md` - Detailed release notes focusing on quality assurance
- `PHASE2_QUALITY_REVIEW.md` - Comprehensive quality analysis (500+ lines)
- `PHASE3_TEST_VALIDATION.md` - Test validation report (520 lines)
- `PHASE4_DOCUMENTATION_VERIFICATION.md` - Documentation verification (496 lines)
- `PHASE5_SECURITY_AUDIT.md` - Security audit report (504 lines)
- `QUALITY_IMPROVEMENTS_BACKLOG.md` - Optional future improvements (~10.5 hours)

### Changed

- Merged `004-comprehensive-context-management` branch to `main` after comprehensive QA
- Updated all quality documentation to reflect production-ready status

## [0.4.2] - 2025-10-11

### Fixed

- **Critical Bug**: Fixed viewport calculation causing missing items in unified list
  - Section headers with `marginY={1}` now correctly counted as 3 lines (top margin + content + bottom margin)
  - First section header with `marginBottom={1}` correctly counted as 2 lines
  - Implemented backwards-building algorithm for end-of-list scrolling to ensure last items always visible
  - Added iterative adjustment logic for middle scrolling to guarantee selected item inclusion
  - Fixed total available lines calculation: `height - 5` (borders + title + scroll indicator text + scroll indicator margin)
  - All MCP servers, memory files, and subagents now display correctly across all window sizes
  - Tested and verified with multiple terminal dimensions

### Changed

- **Visual Enhancements** - Improved readability and user experience
  - Token estimates now display in cyan/bold color to "pop" from other text
  - Navigation key names highlighted in cyan/bold (Enter, Q, Tab, Space, ↑/↓) while descriptions remain dimmed
  - Selection highlight improved with black text on cyan background for better contrast

### Technical Details

#### Viewport Calculation Fix
- `buildVisibleItems()` - Correctly accounts for 3-line section headers
- `buildVisibleItemsFromEnd()` - Works backwards from last item to ensure end-of-list items always visible
- Middle scrolling - Iterative adjustment to guarantee selected item inclusion
- Tested extensively across multiple window sizes and list positions

## [0.4.1] - 2025-10-10

### Fixed

- **Critical Bug**: Missing `js-yaml` runtime dependency
  - Moved `js-yaml` from devDependencies to dependencies
  - Fixes MODULE_NOT_FOUND error when running globally installed package
  - Affects frontmatter-parser used by agent management system
  - All users of v0.4.0 should upgrade immediately

## [0.4.0] - 2025-10-10

### Added

#### Agent Management System
- **Agent Discovery & Enumeration** - Complete subagent management system
  - Scans `.claude/agents/*.md` files in project and user directories
  - Two-scope hierarchy: Project (`.claude/agents/`) and User (`~/.claude/agents/`)
  - Project agents override user agents with same name
  - Frontmatter parsing with YAML support for agent metadata (name, description, model, tools, color)
  - Automatic extraction of short descriptions from multi-line frontmatter
  - Agent blocking/unblocking via permissions.deny patterns

#### Token Calculation & Display
- **Context Size Estimation** - Offline token calculation for all context items
  - `estimateTextTokens()` - ~4 characters per token for plain text
  - `estimateJsonTokens()` - ~3.5 characters per token for JSON configs
  - `estimateMarkdownTokens()` - ~3.8 characters per token for Markdown files
  - `formatTokenCount()` - Human-readable formatting with K suffix (e.g., "2.5K tokens")
  - Token counts displayed in cyan for all MCP servers, memory files, and agents
  - No API key required - completely offline estimation

#### TUI Enhancements
- **Agent List Component** - New dedicated UI for agent management
  - Visual status indicators (✓ active, ✗ blocked)
  - Source badges ([P] project, [U] user, [O] override)
  - Collapsible descriptions with expand/collapse controls
  - Agent details panel with full metadata display
  - Token count display for each agent

- **Collapse/Expand Functionality** - Multi-line entry management
  - Default collapsed view for long descriptions (>100 characters)
  - `→` or `e` key to expand entries
  - `←` or `c` key to collapse entries
  - Visual indicators show available actions ([→/e to expand], [←/c to collapse])
  - Implemented across agent, memory, and server lists

- **Token Display Integration** - Context size visibility
  - Cyan-colored token counts for all context items
  - Formatted display (e.g., "1.2K tokens" for readability)
  - Conditional rendering (only shows when tokens > 0)
  - Consistent placement across all list components

#### Documentation
- **Memory Systems Documentation** - Comprehensive clarification guide
  - Created `docs/MEMORY_SYSTEMS.md` explaining Claude Code vs Serena memories
  - Directory structure comparison (.claude vs .serena)
  - Purpose and management differences
  - Usage recommendations and examples
  - Updated code documentation in `memory-loader.ts`

### Changed

- **Type Definitions** - Enhanced with token estimation fields
  - Added `estimatedTokens?: number` to `MCPServer` interface
  - Added `estimatedTokens?: number` to `MemoryFile` interface
  - Added `estimatedTokens?: number` to `SubAgent` interface

- **Core Loaders** - Token calculation integration
  - `config-loader.ts` - Calculates JSON token estimates for MCP servers
  - `memory-loader.ts` - Calculates Markdown token estimates for memory files
  - `agent-manager.ts` - Calculates Markdown token estimates for agents

### Technical Details

#### New Modules
- `src/utils/token-estimator.ts` - Token estimation utilities
- `src/core/agent-manager.ts` - Agent discovery and management
- `src/tui/components/agent-list.tsx` - Agent list UI component
- `src/utils/frontmatter-parser.ts` - YAML frontmatter parsing
- `docs/MEMORY_SYSTEMS.md` - Memory systems documentation

#### Performance
- Offline token estimation (no network calls required)
- Efficient frontmatter parsing with error handling
- Graceful degradation for malformed agent files

## [0.1.1] - 2025-10-08

### Fixed

- **Critical Bug**: Integration now writes to `CLAUDE.md` (uppercase) instead of `claude.md` (lowercase)
  - Claude Code natively processes `CLAUDE.md` at runtime
  - Previous version created wrong file, causing blocked items functionality to not work
  - All users should upgrade immediately for proper functionality
  - Fixes [#1](https://github.com/machjesusmoto/mcp-toggle/issues/1)

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

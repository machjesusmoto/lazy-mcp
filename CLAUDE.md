# lazy-mcp Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-12

## Project Overview

**Lazy MCP** is a Claude Code plugin that enables agent-driven tool loading with intelligent context optimization. The project evolved from a standalone CLI tool (mcp-toggle) to leverage Claude Code's plugin system for seamless integration.

## Active Technologies
- Node.js 18+ with TypeScript 5.5.2
- Core Libraries:
  - fs-extra 11.2.0 (file operations)
  - ink 3.2.0 (TUI for CLI)
  - commander 12.1.0 (CLI framework)
  - fast-glob 3.3.2 (file discovery)
- Configuration: JSON files (`.mcp.json` in project directories, `~/.claude.json` in user home)
- Testing: Jest 29.7.0 with ts-jest

## Project Structure
```
lazy-mcp/
├── plugin/          # Claude Code plugin (main integration point)
│   ├── src/
│   │   ├── hooks/          # SessionStart, PreToolUse hooks
│   │   ├── commands/       # /lazy:* slash commands
│   │   └── index.ts        # Plugin entry point
│   └── tests/
├── cli/             # Standalone CLI tool
│   ├── src/
│   └── bin/lazy-mcp        # Executable script
├── shared/          # Core library (used by both plugin and CLI)
│   ├── src/
│   │   ├── core/           # Config, blocking, enumeration logic
│   │   ├── models/         # TypeScript types
│   │   └── utils/          # JSON utilities
│   └── tests/
└── docs/            # Architecture and API documentation
```

## Commands

### Development
```bash
npm install          # Install dependencies for all workspaces
npm run build        # Build all packages
npm test            # Run all tests
npm run lint        # Lint all packages
```

### Testing
```bash
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage reports
```

### Plugin Commands (In Claude Code)
```bash
/lazy:help            # Show help
/lazy:version         # Show version
/lazy:status          # Show current context status
```

## Code Style
- TypeScript 5.5.2 with strict mode enabled
- Follow standard TypeScript/Node.js conventions
- Use ES modules (type: "module" in package.json)
- Async/await for all async operations
- Comprehensive JSDoc comments for public APIs

## Architecture Highlights

### Plugin Hooks
1. **SessionStart**: Loads registry, enumerates available tools, reports summary
2. **PreToolUse**: Runtime blocking for disabled tools, provides user feedback

### Tool Loading Strategy
1. Registry maintains tool metadata (capabilities, keywords, usage patterns)
2. Agent analyzes user request and identifies needed tools
3. Tools are loaded on-demand based on registry intelligence
4. Unused tools are purged to maintain context window health

### Configuration Management
- Project-level: `.mcp.json` for project-specific overrides
- User-level: `~/.claude.json` for global configuration
- Blocking mechanism uses dummy overrides with metadata markers

## Recent Changes
- **2025-10-12**: Renamed from mcp-toggle to lazy-mcp
  - Updated all package names (@lazy-mcp/*)
  - Changed command prefix from /toggle: to /lazy:
  - Updated bin script from mcp-toggle to lazy-mcp
  - Refreshed documentation to reflect agent-driven lazy loading vision

- **Previous Features**:
  - Phase 1: Core blocking mechanism implemented
  - Phase 2: Memory and agent enumeration
  - Phase 3: Comprehensive testing infrastructure
  - Phase 4: Profile system for saving/loading configurations

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

<!-- Lazy MCP Integration -->
# MCP Server and Memory Control

This project uses intelligent lazy-loading to manage which MCP servers and memory files are loaded.

When Claude Code starts in this directory:
1. SessionStart hook enumerates available tools and builds registry
2. Agent analyzes conversation and requests needed tools
3. PreToolUse hook prevents execution of blocked/disabled tools
4. Tools are dynamically loaded/purged based on usage patterns

To manage tools manually, use `/lazy:*` commands in your Claude Code session.

**Current architecture**: Registry-driven with agent intelligence
<!-- End Lazy MCP Integration -->

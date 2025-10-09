# mcp_toggle Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-07

## Active Technologies
- Node.js 18+ with TypeScript 5.x (001-mcp-toggle-a)
- TypeScript 5.5.2 with Node.js >=18.0.0 + fs-extra 11.2.0 (file operations), ink 3.2.0 (TUI), commander 12.1.0 (CLI), fast-glob 3.3.2 (file discovery) (002-redesign-mcp-toggle)
- File system - .claude.json files in project hierarchy, .md files in .claude/memories/ (002-redesign-mcp-toggle)
- TypeScript 5.5.2 with Node.js >=18.0.0 + ink 3.2.0 (TUI), fs-extra 11.2.0 (file operations), commander 12.1.0 (CLI), fast-glob 3.3.2 (file discovery) (003-add-migrate-to)
- JSON configuration files (`.mcp.json` in project directories, `~/.claude.json` in user home) (003-add-migrate-to)

## Project Structure
```
src/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
Node.js 18+ with TypeScript 5.x: Follow standard conventions

## Recent Changes
- 003-add-migrate-to: Added TypeScript 5.5.2 with Node.js >=18.0.0 + ink 3.2.0 (TUI), fs-extra 11.2.0 (file operations), commander 12.1.0 (CLI), fast-glob 3.3.2 (file discovery)
- 002-redesign-mcp-toggle: Added TypeScript 5.5.2 with Node.js >=18.0.0 + fs-extra 11.2.0 (file operations), ink 3.2.0 (TUI), commander 12.1.0 (CLI), fast-glob 3.3.2 (file discovery)
- 001-mcp-toggle-a: Added Node.js 18+ with TypeScript 5.x

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
# MCP Server and Memory Control

This project uses `blocked.md` to control which MCP servers and memory files are loaded.

When Claude Code starts in this directory:
1. Read `.claude/blocked.md` if it exists
2. For each line prefixed with `mcp:`, skip loading that MCP server
3. For each line prefixed with `memory:`, skip loading that memory file

To manage blocked items, run: `npx mcp-toggle`

**Current blocked items**: Check `.claude/blocked.md` for the list.
<!-- End MCP Toggle Integration -->

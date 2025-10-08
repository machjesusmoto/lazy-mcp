# MCP Toggle

[![npm version](https://img.shields.io/npm/v/mcp-toggle.svg)](https://www.npmjs.com/package/mcp-toggle)
[![CI](https://github.com/machjesusmoto/mcp-toggle/actions/workflows/ci.yml/badge.svg)](https://github.com/machjesusmoto/mcp-toggle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line tool to manage Claude Code MCP servers and memory files.

## Overview

MCP Toggle allows you to view and selectively disable MCP (Model Context Protocol) servers and Claude Code memory files for your project. It enumerates both local and inherited configurations, provides an interactive TUI interface for toggling items on/off, and automatically integrates with Claude Code.

## Features

- 🔍 **Enumerate**: View all MCP servers and memory files (local + inherited)
- 🎛️ **Toggle**: Selectively enable/disable MCPs and memory files
- 💾 **Persist**: Changes saved to `.claude/blocked.md`
- 🔗 **Integrate**: Automatic `claude.md` integration for Claude Code

## Installation

### npm (Global)

```bash
npm install -g mcp-toggle
```

### npx (No Install)

```bash
npx mcp-toggle
```

## Usage

### Basic Usage

Navigate to any project directory and run:

```bash
mcp-toggle
```

Or specify a project directory:

```bash
mcp-toggle ~/my-project
```

### Disable claude.md Updates

To prevent automatic `claude.md` integration updates:

```bash
mcp-toggle --no-claude-md
```

### Keyboard Controls

- **↑/↓** or **k/j** - Navigate up/down
- **Tab** - Switch between MCP Servers and Memory Files panels
- **Space** - Toggle selected item on/off
- **Enter** - Save changes to `.claude/blocked.md`
- **q** or **Esc** - Quit without saving

## How It Works

1. **Enumeration**: Scans current directory up to home directory for `.claude.json` files and `.claude/memories/` directories
2. **Display**: Shows all discovered MCPs and memory files with source annotations (Local, Parent, Home)
3. **Toggle**: Allows you to disable any item with a single keypress (Space)
4. **Persistence**: Writes blocked items to `.claude/blocked.md` in a machine-readable format
5. **Integration**: Updates `claude.md` to instruct Claude Code to process blocks at runtime

### File Structure

After running `mcp-toggle` and saving changes, you'll see:

```
project/
├── .claude/
│   └── blocked.md          # Machine-readable block list
└── claude.md               # Human instructions + integration block
```

**blocked.md format**:
```markdown
# Blocked MCP Servers and Memory Files
# Last updated: 2025-01-10T12:00:00.000Z

## MCP Servers
mcp:filesystem
mcp:sequential-thinking

## Memory Files
memory:old-notes.md
memory:archive/deprecated.md
```

**claude.md integration** (auto-appended):
```markdown
<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
# MCP Server and Memory Control

This project uses `blocked.md` to control which MCP servers and memory files are loaded.
...
<!-- End MCP Toggle Integration -->
```

## Requirements

- Node.js >= 18.0.0
- Write access to project `.claude/` directory

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run format
```

## License

MIT

## Troubleshooting

### Permission Denied Errors

If you see `EACCES` errors:

```bash
chmod u+w .claude/
```

### Changes Not Persisting

Verify that `blocked.md` was created:

```bash
ls -la .claude/blocked.md
```

### Claude Code Not Respecting Blocks

Ensure `claude.md` has the integration block. If missing, run:

```bash
mcp-toggle  # Make any change and save
```

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

## Documentation

For complete documentation, see [`specs/001-mcp-toggle-a/`](specs/001-mcp-toggle-a/):
- [Quickstart Guide](specs/001-mcp-toggle-a/quickstart.md)
- [Feature Specification](specs/001-mcp-toggle-a/spec.md)
- [Implementation Plan](specs/001-mcp-toggle-a/plan.md)

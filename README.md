# MCP Toggle

[![npm version](https://img.shields.io/npm/v/mcp-toggle.svg)](https://www.npmjs.com/package/mcp-toggle)
[![CI](https://github.com/machjesusmoto/mcp-toggle/actions/workflows/ci.yml/badge.svg)](https://github.com/machjesusmoto/mcp-toggle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive command-line tool to manage Claude Code's complete context: MCP servers, memory files, and agents.

## Overview

MCP Toggle is the definitive context management tool for Claude Code projects. It provides visibility and control over all context sources that Claude loads, allowing you to optimize your project's AI context with precision.

**What It Manages**:
- **MCP Servers**: Block/unblock Model Context Protocol servers per project
- **Memory Files**: Control which memory files Claude loads (project + user scopes)
- **Agents**: Discover and manage subagents from project and user levels
- **Context Overview**: See everything Claude knows about your project in one view

## Features

### Core Capabilities

- 🔍 **Enumerate**: View all MCP servers, memory files, and agents (local + inherited)
- 🎛️ **Toggle**: Selectively enable/disable any context item with a single keystroke
- 🔒 **Native Blocking**: Uses Claude Code's `permissions.deny` mechanism (guaranteed to work)
- 👥 **Agent Management**: Discover, view, and block agents from project and user directories
- 📊 **Context Overview**: Unified view of all context sources with statistics
- 💾 **Persist**: Changes saved to `.claude/settings.json`
- 🔗 **Integrate**: Automatic Claude Code integration

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

- **↑/↓** or **k/j** - Navigate up/down within current panel
- **Tab** - Switch between panels (Servers → Memory → Agents → Summary)
- **Space** - Toggle selected item blocked/unblocked
- **Enter** - Save changes to `.claude/settings.json`
- **q** or **Esc** - Quit without saving

### TUI Layout

```
┌─ Context Summary ──────────────────────────────────┐
│ MCP Servers: 4 active, 1 blocked                   │
│ Memory Files: 8 loaded, 2 blocked                  │
│ Agents: 12 available (7 project, 5 user)           │
│ Est. Context: ~45KB                                │
└────────────────────────────────────────────────────┘

┌─ MCP Servers ──────────────────────────────────────┐
│ ✓ filesystem            (Local)                    │
│ ✓ sequential-thinking   (Inherited)                │
│ ✗ experimental-mcp      (Blocked)                  │
└────────────────────────────────────────────────────┘

┌─ Memory Files ─────────────────────────────────────┐
│ ✓ project-notes.md      (Local)                    │
│ ✓ coding-standards.md   (Inherited)                │
│ ✗ temporary-notes.md    (Blocked)                  │
└────────────────────────────────────────────────────┘

┌─ Agents ───────────────────────────────────────────┐
│ [P] ✓ rapid-prototyper     Quick MVP creation      │
│ [U] ✓ test-writer          Test automation         │
│ [O] ✓ frontend-dev         UI implementation       │
│ [P] ✗ experimental-agent   (Blocked)                │
└────────────────────────────────────────────────────┘

Legend: [P]=Project [U]=User [O]=Override ✓=Active ✗=Blocked
```

## How It Works

### 1. Discovery Phase

**MCP Servers**: Scans current directory up to home directory for `.claude.json` files

**Memory Files**: Searches `.claude/memories/` in:
- Project directory (local scope)
- User home directory (inherited scope)

**Agents**: Searches `.claude/agents/` in:
- Project directory (project-local agents)
- User home directory (user-global agents)
- Detects when project agents override user agents

### 2. Display Phase

Shows all discovered context sources with:
- **Source indicators**: Local, Inherited, Project [P], User [U], Override [O]
- **Status markers**: ✓ (active) or ✗ (blocked)
- **Metadata**: Names, descriptions, hierarchy information

### 3. Toggle Phase

Block/unblock any item with Space key. Blocking works via Claude Code's native `permissions.deny` mechanism:

```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "sensitive-notes.md" },
      { "type": "agent", "pattern": "experimental-agent.md" }
    ]
  }
}
```

### 4. Persistence Phase

Saves changes to `.claude/settings.json` using atomic write pattern with automatic rollback on failure.

### 5. Integration Phase

Claude Code automatically respects `permissions.deny` entries - no additional configuration needed!

### File Structure

After running `mcp-toggle` and saving changes, you'll see:

```
project/
├── .claude/
│   ├── settings.json       # Context blocking configuration
│   ├── agents/            # Project-local agents
│   │   ├── rapid-prototyper.md
│   │   └── custom-agent.md
│   └── memories/          # Project-local memory files
│       ├── project-notes.md
│       └── archive/old-docs.md
└── claude.md              # Human instructions (optional)
```

**settings.json format** (v0.4.0):
```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "temporary-notes.md" },
      { "type": "memory", "pattern": "archive/old-docs.md" },
      { "type": "agent", "pattern": "experimental-agent.md" }
    ]
  }
}
```

### Migration from v0.3.0

If upgrading from v0.3.0, old `.blocked` files will be automatically migrated to the new `permissions.deny` mechanism. See [Migration Guide](docs/migration-v0.4.0.md) for details.

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

## Usage Examples

### Blocking Sensitive Memory Files

```bash
# Launch TUI
mcp-toggle

# Navigate to Memory Files panel (press Tab)
# Use ↓ to select "sensitive-notes.md"
# Press Space to block
# Press Enter to save
```

Result in `.claude/settings.json`:
```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "sensitive-notes.md" }
    ]
  }
}
```

### Managing Agents Per Project

```bash
# Launch TUI in your project
cd ~/my-project
mcp-toggle

# Navigate to Agents panel (press Tab twice)
# See project and user agents:
# [P] ✓ rapid-prototyper    (project agent)
# [U] ✓ test-writer         (user agent)
# [U] ✓ security-scanner    (user agent)

# Block security-scanner for this project
# Select it with ↓, press Space, then Enter
```

Result: Security scanner blocked for this project only, but remains available in other projects.

### Viewing Context Overview

```bash
mcp-toggle

# View summary at top:
# MCP Servers: 4 active, 1 blocked
# Memory Files: 8 loaded, 2 blocked
# Agents: 12 available (7 project, 5 user)
# Est. Context: ~45KB
```

## Troubleshooting

### Permission Denied Errors

If you see `EACCES` errors:

```bash
chmod u+w .claude/
chmod u+w .claude/settings.json  # if exists
```

### Changes Not Persisting

Verify that `settings.json` was updated:

```bash
cat .claude/settings.json | jq .permissions.deny
```

### Claude Code Not Respecting Blocks

Ensure `settings.json` exists and has valid JSON:

```bash
# Validate JSON
cat .claude/settings.json | jq .

# If invalid, use mcp-toggle to recreate
mcp-toggle  # It will create valid settings.json
```

### Migration Issues

If automatic migration from v0.3.0 didn't work:

```bash
# Force migration
mcp-toggle --migrate

# Or see migration guide
cat docs/migration-v0.4.0.md
```

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

## Documentation

### User Guides
- **[Migration Guide (v0.4.0)](docs/migration-v0.4.0.md)** - Upgrading from v0.3.0
- **[API Documentation](docs/api.md)** - Programmatic usage reference
- **[Developer Guide](docs/developer-guide.md)** - Contributing and architecture

### Feature Specifications
- [Initial Spec](docs/specs/001-mcp-toggle-a/) - Original MCP server blocking
- [Redesign](docs/specs/002-redesign-mcp-toggle/) - Architecture improvements
- [Migration Support](docs/specs/003-add-migrate-to/) - Migration tooling
- [Context Management](docs/specs/004-comprehensive-context-management/) - Current feature set

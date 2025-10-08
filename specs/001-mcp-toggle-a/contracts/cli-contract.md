# CLI Contract: MCP Toggle

**Version**: 1.0.0
**Date**: 2025-10-07
**Status**: Complete

## Command Interface

### Primary Command

```bash
mcp-toggle [options]
```

**Description**: Launch the MCP Toggle TUI to view and manage MCP servers and memory files for the current directory.

**Behavior**:
- Enumerates all MCP servers from .claude.json files in current and parent directories
- Enumerates all memory files from .claude/memories/ in current and parent directories
- Reads existing blocked.md to determine current blocked state
- Launches interactive TUI for viewing and toggling items
- Saves changes to .claude/blocked.md and updates claude.md on confirmation

---

## Options

### `--version`, `-v`
**Description**: Display version information and exit

**Output**:
```
mcp-toggle version 0.1.0
```

**Exit Code**: 0

---

### `--help`, `-h`
**Description**: Display help information and exit

**Output**:
```
mcp-toggle - Manage Claude Code MCP servers and memory files

Usage:
  mcp-toggle [options]

Options:
  -v, --version    Show version number
  -h, --help       Show help information

Description:
  Enumerates MCP servers and memory files that would be loaded by Claude Code
  and provides an interactive interface to selectively disable them.

  The tool will:
  1. Scan current and parent directories for .claude.json and .claude/memories/
  2. Display all discovered MCP servers and memory files
  3. Allow you to toggle items on/off
  4. Save changes to .claude/blocked.md
  5. Update claude.md with integration instructions

Examples:
  mcp-toggle              Launch TUI in current directory
  mcp-toggle --version    Show version
  mcp-toggle --help       Show this help

For more information, visit: https://github.com/your-org/mcp-toggle
```

**Exit Code**: 0

---

## Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Operation completed successfully |
| 1 | General Error | Unexpected error occurred |
| 2 | No Config Found | No .claude.json or .claude/memories/ found in hierarchy |
| 3 | Permission Denied | Cannot write to .claude directory |
| 4 | Invalid Config | .claude.json file is malformed or unreadable |
| 130 | User Cancelled | User pressed Ctrl+C or cancelled operation |

---

## Standard Output

### Success Case (Normal Operation)

**TUI Display**: Interactive interface shown in terminal

**After User Saves Changes**:
```
✓ Saved 3 changes to .claude/blocked.md
✓ Updated claude.md with integration instructions
```

**After User Cancels**:
```
No changes made.
```

---

## Standard Error

### Error Messages

**No Configuration Found**:
```
Error: No Claude Code configuration found
  Could not find .claude.json or .claude/memories/ in current or parent directories

  To create a configuration:
  1. Create .claude.json with MCP server definitions
  2. Or create .claude/memories/ directory with markdown files

Exit code: 2
```

**Permission Denied**:
```
Error: Permission denied
  Cannot write to .claude directory: /path/to/project/.claude

  Please check directory permissions or run with appropriate privileges.

Exit code: 3
```

**Invalid Configuration**:
```
Error: Invalid configuration file
  File: /path/to/.claude.json
  Reason: JSON parse error at line 15

  Please check the JSON syntax and try again.

Exit code: 4
```

**Unexpected Error**:
```
Error: An unexpected error occurred
  Error: [Error details]

  If this persists, please report at: https://github.com/your-org/mcp-toggle/issues

Exit code: 1
```

---

## Environment Variables

### `MCP_TOGGLE_DEBUG`

**Purpose**: Enable debug output

**Usage**:
```bash
MCP_TOGGLE_DEBUG=1 mcp-toggle
```

**Output**: Additional debug information written to stderr
- Configuration sources discovered
- Files read/written
- Performance metrics
- State changes

---

## TUI Keyboard Controls

### Navigation

| Key | Action |
|-----|--------|
| ↑ / k | Move selection up |
| ↓ / j | Move selection down |
| → / l | Expand item details |
| ← / h | Collapse item details |
| Tab | Switch between MCP and Memory tabs |
| Home | Jump to first item |
| End | Jump to last item |
| PgUp | Scroll up one page |
| PgDn | Scroll down one page |

### Actions

| Key | Action |
|-----|--------|
| Space | Toggle selected item (block/unblock) |
| Enter | Confirm and save changes |
| Esc / q | Cancel without saving |
| ? | Show help overlay |
| r | Refresh enumeration |

### Shortcuts

| Key | Action |
|-----|--------|
| a | Block all items in current tab |
| A | Unblock all items in current tab |
| / | Search/filter items |
| c | Clear all filters |

---

## TUI Display Format

### Main Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Toggle v0.1.0                 Project: /path/to/project │
├─────────────────────────────────────────────────────────────┤
│ [MCP Servers (12)] [Memory Files (8)]                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✓ filesystem                                      [local]   │
│   /home/user/.claude.json                                   │
│                                                              │
│ ✗ sequential-thinking                          [inherited]  │
│   /home/user/.claude.json                                   │
│   BLOCKED since 2025-10-07 10:30                            │
│                                                              │
│ ✓ playwright                                      [local]   │
│   /home/user/project/.claude.json                           │
│                                                              │
│ ...                                                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Space: Toggle  Enter: Save  Esc: Cancel  ?: Help           │
└─────────────────────────────────────────────────────────────┘
```

### Legend

- `✓` : Enabled (not blocked)
- `✗` : Blocked (disabled)
- `[local]` : Configured in current project
- `[inherited]` : Configured in parent directory
- Highlighted: Currently selected item

---

## File System Contract

### Files Read

1. **`.claude.json`** (multiple, from hierarchy)
   - Parsed as JSON
   - Expected structure: `{ "mcpServers": { ... } }`
   - Gracefully handle missing or malformed

2. **`.claude/memories/*.md`** (multiple, from hierarchy)
   - Read for enumeration and preview
   - Binary format not supported
   - Symlinks followed

3. **`.claude/blocked.md`** (current project only)
   - Read to determine current blocked state
   - Missing file treated as "no blocks"
   - Format: line-based with `mcp:` and `memory:` prefixes

4. **`claude.md`** (current project only)
   - Read to check for existing integration
   - Missing file creates new file

### Files Written

1. **`.claude/blocked.md`** (current project only)
   - Created if doesn't exist
   - Overwritten completely on each save
   - Format: See blocked-md-format.md

2. **`claude.md`** (current project only)
   - Created if doesn't exist
   - Integration block appended if not present
   - Existing content preserved
   - Format: See claude-md-integration.md

### Directories Created

1. **`.claude/`** (if doesn't exist)
   - Created with permissions 755
   - Only created when saving blocked.md

---

## Performance Contract

| Operation | Maximum Time | Target Time |
|-----------|--------------|-------------|
| Enumeration | 5 seconds | <2 seconds |
| TUI Render | 200ms | <100ms |
| Save Changes | 1 second | <500ms |
| Key Response | 100ms | <50ms |

**Scale Targets**:
- Support up to 50 MCP servers
- Support up to 100 memory files
- Handle directory hierarchies up to 20 levels deep

---

## Security Contract

### File Access

- **Read Access**: Required for parent directories (enumeration only)
- **Write Access**: Required only for current project .claude/ directory
- **Permission Handling**: Graceful degradation if permissions denied
- **Path Traversal**: Prevented via path normalization
- **Symlink Handling**: Followed but validated to prevent loops

### Data Privacy

- No network requests
- No external logging
- No analytics or telemetry
- All data stays on local file system
- No credential storage or handling

---

## Compatibility

### Supported Platforms

- **Linux**: Tested on Ubuntu 20.04+, Arch Linux
- **macOS**: Tested on macOS 12+
- **Windows**: Tested on Windows 10/11, WSL2

### Node.js Versions

- **Minimum**: Node.js 18.0.0
- **Recommended**: Node.js 20.x LTS
- **Maximum**: Latest stable release

### Terminal Requirements

- **Minimum Columns**: 80
- **Minimum Rows**: 24
- **UTF-8 Support**: Required for proper rendering
- **Color Support**: Optional (graceful degradation to monochrome)

---

## Versioning

This CLI contract follows semantic versioning (semver):
- **Major**: Breaking changes to CLI interface or file formats
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, no interface changes

Current version: **1.0.0**

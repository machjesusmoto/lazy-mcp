# MCP Toggle Quickstart Guide

**Version**: 0.1.0 (MVP)
**Last Updated**: 2025-10-07

## What is MCP Toggle?

MCP Toggle is a command-line tool that helps you manage which MCP (Model Context Protocol) servers and memory files are loaded when you start Claude Code in your project.

**Use Cases**:
- 🔍 **Discover** what MCP servers and memory files would load in your project
- ⚡ **Optimize** context usage by disabling unused servers or memory files
- 🛠️ **Debug** configuration issues by seeing the full hierarchy
- 🎯 **Focus** Claude Code on specific functionality by blocking irrelevant context

---

## Installation

### npm (Global Install)

```bash
npm install -g mcp-toggle
```

### npx (No Install Required)

```bash
npx mcp-toggle
```

### Verify Installation

```bash
mcp-toggle --version
```

Expected output:
```
mcp-toggle version 0.1.0
```

---

## Quick Start (5 Minutes)

### 1. Navigate to Your Project

```bash
cd /path/to/your/project
```

### 2. Run MCP Toggle

```bash
mcp-toggle
```

### 3. View Available Items

The TUI will display:
- **MCP Servers**: All servers that would load (local + inherited)
- **Memory Files**: All memory files that would load (local + inherited)
- **Source**: Where each item is configured

### 4. Toggle Items

- Use **↑/↓** or **j/k** to navigate
- Press **Space** to toggle an item (block/unblock)
- Items marked with `✗` will be blocked

### 5. Save Changes

- Press **Enter** to save your changes
- Press **Esc** or **q** to cancel without saving

### 6. Verify

The tool will create/update two files:
- `.claude/blocked.md` - List of blocked items
- `claude.md` - Instructions for Claude Code

---

## Basic Usage

### Launch Interactive TUI

```bash
mcp-toggle
```

### Show Help

```bash
mcp-toggle --help
```

### Show Version

```bash
mcp-toggle --version
```

---

## Understanding the Display

### TUI Layout

```
┌──────────────────────────────────────────────────────────┐
│ MCP Toggle v0.1.0           Project: /path/to/project   │
├──────────────────────────────────────────────────────────┤
│ [MCP Servers (5)] [Memory Files (3)]                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ✓ filesystem                               [local]      │
│   /home/user/project/.claude.json                       │
│                                                          │
│ ✗ sequential-thinking                   [inherited]     │
│   /home/user/.claude.json                               │
│   BLOCKED since 2025-10-07 10:30                        │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Space: Toggle  Enter: Save  Esc: Cancel  ?: Help       │
└──────────────────────────────────────────────────────────┘
```

### Status Indicators

- **✓** : Enabled (will load)
- **✗** : Blocked (will NOT load)
- **[local]** : Configured in current project
- **[inherited]** : Configured in parent directory

### Color Coding

- **Green**: Enabled items
- **Red**: Blocked items
- **Blue**: Selected item (cursor)
- **Gray**: Source path information

---

## Keyboard Controls

### Navigation

| Key | Action |
|-----|--------|
| ↑ / k | Move up |
| ↓ / j | Move down |
| Tab | Switch between MCP and Memory tabs |
| Home | Jump to first item |
| End | Jump to last item |

### Actions

| Key | Action |
|-----|--------|
| Space | Toggle selected item |
| Enter | Save and exit |
| Esc / q | Cancel without saving |
| ? | Show help |

---

## Common Scenarios

### Scenario 1: Block an Unused MCP Server

**Problem**: You have an MCP server configured globally that you don't need for this project.

**Solution**:
1. Run `mcp-toggle`
2. Navigate to the MCP server (it will show `[inherited]`)
3. Press `Space` to block it
4. Press `Enter` to save

**Result**: The server won't load when Claude Code starts in this project, but it will still load in other projects.

---

### Scenario 2: Block Old Memory Files

**Problem**: Your project has accumulated many memory files, some of which are outdated.

**Solution**:
1. Run `mcp-toggle`
2. Press `Tab` to switch to Memory Files
3. Navigate to old files and press `Space` to block them
4. Press `Enter` to save

**Result**: Old memory files won't load, reducing context usage.

---

### Scenario 3: Debug Configuration

**Problem**: You're not sure which MCP servers are being loaded.

**Solution**:
1. Run `mcp-toggle`
2. Review the list - all servers are shown with source paths
3. Check `[local]` vs `[inherited]` to see where each is configured
4. Press `Esc` to exit without changes

**Result**: You now have a clear view of your Claude Code configuration hierarchy.

---

### Scenario 4: Temporarily Focus on Specific Functionality

**Problem**: You're working on a specific feature and want to minimize context.

**Solution**:
1. Run `mcp-toggle`
2. Block all unnecessary MCP servers and memory files
3. Save changes
4. Work on your feature with focused context
5. Later, run `mcp-toggle` again to unblock items

**Result**: Cleaner, more focused Claude Code sessions.

---

## File Structure

After using MCP Toggle, your project will have:

```
your-project/
├── .claude/
│   ├── blocked.md        # Lists blocked items
│   ├── memories/         # Your memory files
│   └── ...
├── claude.md             # Updated with integration instructions
└── .claude.json          # Your MCP server config (if local)
```

### .claude/blocked.md

Contains the list of blocked items:

```markdown
# Blocked MCP Servers and Memory Files
# Generated by mcp-toggle
# Last updated: 2025-10-07T10:30:15Z

## MCP Servers
mcp:filesystem
mcp:sequential-thinking

## Memory Files
memory:old-notes.md
memory:archive/deprecated.md
```

You can manually edit this file if needed, but it's easier to use `mcp-toggle`.

### claude.md Integration

MCP Toggle adds instructions to `claude.md`:

```markdown
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
```

---

## Configuration Examples

### Example 1: Simple Project

**Local .claude.json**:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

**Running mcp-toggle** will show:
- 1 local MCP server: `filesystem`
- Any inherited servers from parent directories
- All memory files from `.claude/memories/` (if they exist)

---

### Example 2: Nested Project

```
/home/user/
├── .claude.json           # Global config (filesystem server)
└── projects/
    └── my-app/
        ├── .claude.json   # Local config (custom server)
        └── .claude/
            └── memories/  # Local memory files
```

**Running mcp-toggle in `/home/user/projects/my-app/`** will show:
- **Local MCP servers**: custom server
- **Inherited MCP servers**: filesystem (from /home/user/)
- **Local memory files**: All from ./claude/memories/
- **Inherited memory files**: Any from /home/user/.claude/memories/

---

## Troubleshooting

### "No Claude Code configuration found"

**Error**:
```
Error: No Claude Code configuration found
  Could not find .claude.json or .claude/memories/ in current or parent directories
```

**Solution**: Create a `.claude.json` file or `.claude/memories/` directory in your project.

---

### "Permission denied"

**Error**:
```
Error: Permission denied
  Cannot write to .claude directory
```

**Solution**: Check directory permissions or run with appropriate privileges:
```bash
chmod 755 .claude
```

---

### "Invalid configuration file"

**Error**:
```
Error: Invalid configuration file
  File: /path/to/.claude.json
  Reason: JSON parse error
```

**Solution**: Fix the JSON syntax in the `.claude.json` file.

---

### Changes Not Taking Effect

**Problem**: You blocked items, but Claude Code still loads them.

**Solution**:
1. Verify `.claude/blocked.md` exists and contains your blocks
2. Verify `claude.md` has the integration instructions
3. Restart Claude Code to pick up changes

---

## Best Practices

### 1. Start with Discovery

Before blocking anything, run `mcp-toggle` just to see what's configured. This helps you understand your setup.

### 2. Block Conservatively

Only block what you're sure you don't need. It's easy to unblock later if you made a mistake.

### 3. Document Reasons

Consider manually adding comments to `blocked.md` explaining why you blocked specific items:

```markdown
## MCP Servers
# Blocked because project doesn't use file system operations
mcp:filesystem
```

### 4. Version Control

Commit `.claude/blocked.md` to git so your team shares the same configuration:

```bash
git add .claude/blocked.md claude.md
git commit -m "Block unused MCP servers for this project"
```

### 5. Regular Reviews

Periodically review your blocked items. As your project evolves, you may need to unblock items or block new ones.

---

## Advanced Usage

### Manual Editing

You can manually edit `.claude/blocked.md` if you prefer:

```markdown
## MCP Servers
mcp:server-name-1
mcp:server-name-2

## Memory Files
memory:file.md
memory:subdirectory/file.md
```

Just follow the format: `mcp:` prefix for servers, `memory:` prefix for files.

### Sharing Configurations

To share your blocking configuration with your team:

1. Commit `.claude/blocked.md` to your repository
2. Team members will inherit your blocks when they clone
3. Each team member can further customize with `mcp-toggle`

### Temporary Blocks

To temporarily disable blocks:

1. Rename `.claude/blocked.md` to `.claude/blocked.md.bak`
2. Work with full configuration
3. Rename back when done

---

## What's Next?

Now that you know the basics:

1. ✅ Run `mcp-toggle` in your project
2. ✅ Explore your Claude Code configuration
3. ✅ Block unnecessary items to optimize context
4. ✅ Commit changes to share with your team

---

## Getting Help

### In-App Help

Press `?` while the TUI is running to see keyboard shortcuts.

### Command-Line Help

```bash
mcp-toggle --help
```

### Report Issues

Found a bug or have a feature request?
- GitHub Issues: [your-org/mcp-toggle/issues](https://github.com/your-org/mcp-toggle/issues)

### Community

- Discord: [Join our community](https://discord.gg/your-invite)
- Documentation: [Full docs](https://mcp-toggle.dev/docs)

---

## What MCP Toggle Does NOT Do

- ❌ Edit MCP server configurations (only enable/disable)
- ❌ Create or modify memory files (only enable/disable)
- ❌ Modify parent directory configurations
- ❌ Make network requests or send telemetry
- ❌ Require a Claude Code license or account

---

**Happy toggling! 🎛️**

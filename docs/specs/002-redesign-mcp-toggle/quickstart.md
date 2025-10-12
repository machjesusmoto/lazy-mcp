# Quickstart: Actual MCP Server Blocking via .claude.json Modification

**Feature**: 002-redesign-mcp-toggle
**Version**: 2.0.0
**Date**: 2025-10-08

## What Changed in v2.0.0

### The Problem (v0.1.x)

The original mcp-toggle created a `.claude/blocked.md` file with instructions for Claude AI to skip loading certain servers. **This didn't work** because:

1. Claude Code loads MCP servers **before** Claude AI reads any documentation
2. `.claude/blocked.md` was just documentation - nothing enforced it
3. Blocked servers continued loading despite being "blocked"

### The Solution (v2.0.0)

**mcp-toggle now modifies `.claude.json` directly** to actually prevent servers from loading:

- **Local servers**: Removed from project `.claude.json`
- **Inherited servers**: Overridden with dummy command in project `.claude.json`
- **Memory files**: Renamed with `.blocked` extension

Claude Code honors `.claude.json` modifications automatically - no AI processing needed.

## Quick Comparison

| Aspect | v0.1.x (Broken) | v2.0.0 (Fixed) |
|--------|-----------------|----------------|
| Blocking method | Documentation in `.claude/blocked.md` | Direct `.claude.json` modification |
| Enforcement | ❌ None - Claude AI reads docs too late | ✅ Claude Code respects config at startup |
| Local servers | Documented as "blocked" | **Removed** from project config |
| Inherited servers | Documented as "blocked" | **Overridden** with dummy command |
| Memory files | Documented as "blocked" | **Renamed** with `.blocked` extension |
| Unblocking local | Removed from list | ⚠️ **Requires manual re-add** |
| Unblocking inherited | Removed from list | ✅ Remove override, loads from parent |

## How It Works

### Blocking a Local Server

**Before** (project/.claude.json):
```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/cli"]
    }
  }
}
```

**After blocking** (project/.claude.json):
```json
{
  "mcpServers": {}
}
```

✅ Result: Claude Code doesn't see "magic" → doesn't load it

---

### Blocking an Inherited Server

**Parent config** (~/.claude.json):
```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/cli"]
    }
  }
}
```

**Project override** (project/.claude.json) - **created by mcp-toggle**:
```json
{
  "mcpServers": {
    "magic": {
      "command": "echo",
      "args": ["[mcp-toggle] Server 'magic' is blocked"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-08T16:30:00.000Z",
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@21st-dev/cli"]
      }
    }
  }
}
```

✅ Result: Claude Code sees project config first → loads "echo" command instead of real server

**Original config preserved** in `_mcpToggleOriginal` for unblocking.

---

### Blocking a Memory File

**Before**:
```
.claude/memories/
├── project-context.md       ← Active
└── archived-notes.md        ← Active
```

**After blocking** `project-context.md`:
```
.claude/memories/
├── project-context.md.blocked  ← Blocked (renamed)
└── archived-notes.md           ← Still active
```

✅ Result: Claude Code only loads `.md` files → skips `.blocked` files

---

## Unblocking Differences

### Unblocking Local Servers ⚠️

**Important**: Original config was removed, **cannot be restored automatically**.

When you unblock a local server, you'll see:

```
Local server 'magic' has been unblocked.
You must manually add its configuration to .claude.json to use it again.

Example configuration:
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/cli"]
    }
  }
}
```

**Why?** v2.0.0 doesn't include a backup/restore system yet (planned for future release).

### Unblocking Inherited Servers ✅

**Easy**: Just removes the override from project config.

**Before** (project/.claude.json with override):
```json
{
  "mcpServers": {
    "magic": {
      "command": "echo",
      "args": ["[mcp-toggle] Server 'magic' is blocked"],
      "_mcpToggleBlocked": true,
      "_mcpToggleOriginal": { ... }
    }
  }
}
```

**After unblocking** (project/.claude.json):
```json
{
  "mcpServers": {}
}
```

✅ Result: No override → Claude Code loads from parent config → server works again

---

## Migration from v0.1.x

If you have an existing `.claude/blocked.md` file, **migration happens automatically** on first run of v2.0.0.

### What Happens

1. **Detection**: Tool finds `.claude/blocked.md`
2. **Parse**: Reads server names and memory files
3. **Apply blocks**: Uses new .claude.json mechanism
4. **Mark deprecated**: Prepends notice to `.claude/blocked.md`

### Legacy File After Migration

```markdown
# DEPRECATED - Migrated to .claude.json blocking mechanism
# This file is preserved for reference but is no longer used by mcp-toggle v2.0.0+
# MCP servers are now blocked by modifying .claude.json directly
# See: https://github.com/machjesusmoto/mcp-toggle#migration-guide

# Blocked MCP Servers and Memory Files
# Generated by mcp-toggle
# Last updated: 2025-10-08T15:56:01.634Z

## MCP Servers
mcp:magic
mcp:playwright
...
```

**File is preserved** but no longer read by the tool.

---

## Visual Indicators in TUI

New in v2.0.0: **Clear visual indicators** for server source and blocking state.

```
MCP SERVERS                          STATUS
───────────────────────────────────────────────
📁 Local        my-project-server    ✅ Active
🏠 Inherited    magic                ❌ Blocked
🏠 Inherited    sequential-thinking  ✅ Active
📁 Local        custom-tool          ✅ Active
```

- 📁 **Local**: Defined in project `.claude.json`
- 🏠 **Inherited**: From parent or home `.claude.json`
- ✅ **Active**: Currently loads on Claude Code startup
- ❌ **Blocked**: Prevented from loading (removed or overridden)

---

## Common Workflows

### Block a Slow Inherited Server for One Project

1. Run `npx mcp-toggle` in project directory
2. Select inherited server (🏠 icon)
3. Press Space to toggle block
4. Press Enter to save
5. Restart Claude Code

✅ Server blocked for this project, still loads in others

### Temporarily Disable Local Development Server

1. Run `npx mcp-toggle`
2. Select local server (📁 icon)
3. Press Space to toggle block
4. Press Enter to save

⚠️ To re-enable, you'll need to manually add config back

### Block Old Memory Files

1. Run `npx mcp-toggle`
2. Switch to Memory Files tab
3. Select files to block
4. Press Enter to save

✅ Files renamed to `.md.blocked`, Claude Code skips them

---

## Verification

### Verify Server is Blocked

```bash
# Check project .claude.json
cat .claude.json

# For inherited server, should see:
{
  "mcpServers": {
    "magic": {
      "command": "echo",
      "_mcpToggleBlocked": true
    }
  }
}

# For local server, should NOT see server entry
```

### Verify Memory File is Blocked

```bash
# Check memories directory
ls -la .claude/memories/

# Should see:
project-context.md.blocked  # Blocked
archived-notes.md           # Active
```

### Verify in Claude Code

1. Restart Claude Code in project directory
2. Check available MCP servers in status
3. Blocked servers should NOT appear in list

---

## Troubleshooting

### Server Still Loading After Blocking

**Cause**: Claude Code was already running

**Fix**: Restart Claude Code completely (not just reload)

### Can't Find Original Local Server Config

**Cause**: Local servers are removed, not preserved

**Fix**: Check git history or backup files:
```bash
git log -p .claude.json
# Look for removed server config
```

### Override Not Working for Inherited Server

**Cause**: Project config syntax error

**Fix**:
```bash
# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('.claude.json', 'utf-8'))"

# If error, mcp-toggle creates .claude.json.backup
cat .claude.json.backup
```

### Migration Didn't Run

**Cause**: No legacy `.claude/blocked.md` file

**Fix**: Not a problem - migration only needed for v0.1.x users

---

## Next Steps

- **Generate tasks**: Run `/speckit.tasks` to create implementation task list
- **Implementation**: Follow task dependency order for development
- **Testing**: Write tests for blocking/unblocking/migration
- **Documentation**: Update README and CHANGELOG for v2.0.0

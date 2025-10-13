# MCP Server Migration Guide

**MCP Toggle v2.0.0+ Server Migration System**

This guide explains how to use the migration feature to move MCP servers from project-local configuration (`.mcp.json`) to global configuration (`~/.claude.json`).

## Table of Contents
- [Overview](#overview)
- [When to Migrate](#when-to-migrate)
- [Migration Workflow](#migration-workflow)
- [Conflict Resolution](#conflict-resolution)
- [Rollback & Recovery](#rollback--recovery)
- [Troubleshooting](#troubleshooting)

---

## Overview

The migration system allows you to:
- **Move servers** from project-local to global configuration
- **Detect conflicts** when server names already exist globally
- **Resolve conflicts** interactively (skip, overwrite, or rename)
- **Atomic operations** with automatic backup and rollback
- **Safe execution** with validation and verification

### Key Features
- ✅ **Atomic writes** - All-or-nothing configuration updates
- ✅ **Automatic backups** - Timestamped backups before any changes
- ✅ **Conflict detection** - Identifies duplicate server names
- ✅ **Interactive resolution** - Choose how to handle conflicts
- ✅ **Rollback capability** - Restore previous state on errors
- ✅ **Verification** - Validates configurations after migration

---

## When to Migrate

### Good Candidates for Migration
- **Frequently used servers** across multiple projects
- **Stable configurations** that won't change often
- **Personal tools** you use in all development work
- **Generic utilities** (e.g., time, filesystem, web search)

### Keep Project-Local
- **Project-specific servers** tied to one codebase
- **Experimental configurations** you're testing
- **Client-specific tools** for particular projects
- **Version-dependent servers** that may conflict across projects

### Example Decision Tree
```
✅ Migrate to Global:
- @modelcontextprotocol/server-everything (general utility)
- @modelcontextprotocol/server-time (always useful)
- custom-mcp-server (your personal tool)

❌ Keep Project-Local:
- project-specific-db-server (tied to this database)
- legacy-api-wrapper (only used in old-project)
- client-xyz-integration (client-specific)
```

---

## Migration Workflow

### Step 1: Open Migration Menu

In the TUI, press **`m`** to open the migration menu.

**Prerequisites**:
- You must have project-local servers (hierarchyLevel = 1)
- If no project-local servers exist, you'll see: "ℹ No project-local servers to migrate"

### Step 2: Validation

The system automatically:
1. **Loads** both project-local (`.mcp.json`) and global (`~/.claude.json`) configurations
2. **Detects** any server name conflicts
3. **Creates** timestamped backups of both files
4. **Transitions** to conflict resolution (if conflicts exist) or ready state (if no conflicts)

### Step 3: Conflict Resolution (if needed)

If server names conflict with global configuration, you'll enter conflict resolution mode.

**Navigation**:
- **↑ / ↓ Arrow Keys**: Navigate between conflicts
- **`s` Key**: Set resolution to "skip" (keep global version)
- **`o` Key**: Set resolution to "overwrite" (use project version)
- **Enter**: Proceed when all conflicts resolved
- **ESC**: Cancel migration

### Step 4: Confirmation

Once all conflicts are resolved (or if there were no conflicts), you'll see the confirmation screen.

**Actions**:
- **Enter**: Execute migration
- **ESC**: Cancel and return to main view

### Step 5: Execution

The migration executes in atomic phases:

1. **Backup**: Create timestamped backups of both configs
2. **Load**: Load both configurations into memory
3. **Apply Resolutions**: Apply skip/overwrite decisions
4. **Merge**: Merge project servers into global config
5. **Write**: Atomic write operations (temp → move)
6. **Verify**: Validate both configurations load correctly
7. **Cleanup**: Remove temporary files

### Step 6: Completion

**Post-Completion**:
- Press any key to return to main view
- Context automatically reloads to show updated server list
- Migrated servers now show hierarchyLevel = 2 (inherited)

---

## Conflict Resolution

### Understanding Conflicts

A conflict occurs when:
- A project-local server name already exists in global config
- The configurations may or may not be identical

**Example Conflict**:
```json
// Project .mcp.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/project-path"]
    }
  }
}

// Global ~/.claude.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]
    }
  }
}
```

### Resolution Strategies

#### 1. Skip (Recommended for Most Cases)
**When to use**:
- Global config is correct and up-to-date
- You don't want to overwrite working global config
- Project config was experimental

**Effect**:
- Server stays in global config (unchanged)
- Server is removed from project config
- No migration of this server

#### 2. Overwrite (Use with Caution)
**When to use**:
- Project config is newer/better than global
- You want to update global config from project
- You're consolidating to one canonical config

**Effect**:
- Global config replaced with project config
- Server removed from project config
- Backup of old global config preserved

#### 3. Rename (Future Feature)
**When to use**:
- Both configs are valid but different
- You want to keep both versions
- Different use cases for each

**Status**: Not yet implemented in MVP

---

## Rollback & Recovery

### Automatic Rollback

If migration fails, the system **automatically rolls back** to previous state:

1. **Restore Project Config**: From `.mcp.json.backup-TIMESTAMP`
2. **Restore Global Config**: From `~/.claude.json.backup-TIMESTAMP`
3. **Show Error**: Display error message with rollback status
4. **Preserve Backups**: Backups remain available for manual recovery

### Manual Recovery

If you need to restore manually:

```bash
# Find backup files
ls -la .mcp.json.backup-*
ls -la ~/.claude.json.backup-*

# Restore project config
cp .mcp.json.backup-20250101120000 .mcp.json

# Restore global config
cp ~/.claude.json.backup-20250101120000 ~/.claude.json

# Verify restoration
cat .mcp.json | jq '.mcpServers | keys'
cat ~/.claude.json | jq '.mcpServers | keys'
```

---

## Troubleshooting

### Migration Won't Start

**Problem**: Pressing `m` shows "No project-local servers to migrate"

**Solution**:
- Verify `.mcp.json` exists in project directory
- Check that servers have `hierarchyLevel: 1` (not inherited)
- Ensure servers are not already in global config

### Migration Fails During Execution

**Problem**: Error screen shows migration failed

**Common Causes**:
1. **Permission errors**: Can't write to `~/.claude.json`
2. **Invalid JSON**: Corrupted configuration
3. **Disk space**: Out of space during write
4. **File locks**: Another process has file open

**Solutions**:
```bash
# Check file permissions
ls -la ~/.claude.json
chmod 644 ~/.claude.json  # If needed

# Verify JSON validity
jq empty ~/.claude.json
jq empty .mcp.json

# Check disk space
df -h ~
df -h .
```

### TUI Shows Stale Data

**Problem**: Server list doesn't update after migration

**Solution**: The TUI automatically reloads context after migration. If it doesn't:
- Restart the TUI (press ESC or q, then run `npx mcp-toggle` again)

---

## Best Practices

### Before Migration

1. **Review Configs**: Understand what you're migrating
   ```bash
   cat .mcp.json | jq '.mcpServers'
   cat ~/.claude.json | jq '.mcpServers'
   ```

2. **Document Current State**: Note which servers are where

3. **Test in Sandbox**: Try migration in test project first

### During Migration

1. **Read Carefully**: Review conflict details before choosing resolution
2. **Default to Skip**: When uncertain, keep global config unchanged
3. **One at a Time**: Resolve conflicts methodically
4. **Check Backups**: Verify backup files created before confirming

### After Migration

1. **Verify Success**: Check both configs contain expected servers
2. **Test Functionality**: Verify migrated servers work correctly
3. **Clean Up Backups**: Remove old backups after confirming success

---

## FAQ

### Q: Can I undo a migration?

**A:** Yes! Restore from the timestamped backup files:
```bash
cp .mcp.json.backup-TIMESTAMP .mcp.json
cp ~/.claude.json.backup-TIMESTAMP ~/.claude.json
```

### Q: What happens to blocked servers during migration?

**A:** Blocked servers remain blocked. Blocking metadata is preserved during migration.

### Q: Can I migrate from global back to project-local?

**A:** Not yet. This is a planned feature for v2.1.

### Q: Do I need to restart Claude Code after migration?

**A:** No! The TUI automatically reloads context after migration.

### Q: Can I migrate only some servers?

**A:** Currently, migration migrates all project-local servers. Selective migration is planned for v2.1.

---

*Last Updated: October 2025 | MCP Toggle v2.0.0*

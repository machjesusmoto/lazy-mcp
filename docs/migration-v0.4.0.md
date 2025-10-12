# Migration Guide: v0.3.0 to v0.4.0

**Version**: v0.4.0
**Date**: 2025-10-09
**Breaking Changes**: Yes

## Overview

Version 0.4.0 introduces comprehensive context management with significant changes to how memory files and agents are blocked. The key change is migrating from file-based blocking (`.blocked` files) to Claude Code's native `permissions.deny` mechanism in `.claude/settings.json`.

## Breaking Changes

### 1. Memory File Blocking Mechanism Change

**Before (v0.3.0)**:
```bash
# Memory files were renamed with .blocked extension
.claude/memories/notes.md → .claude/memories/notes.md.blocked
```

**After (v0.4.0)**:
```json
// Blocked via .claude/settings.json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "notes.md" }
    ]
  }
}
```

**Why This Changed**: The old mechanism didn't actually work - Claude Code could still read `.blocked` files. The new mechanism uses Claude's native permissions system and is guaranteed to work.

### 2. New Agent Management

Version 0.4.0 adds comprehensive agent discovery and blocking capabilities that weren't present in v0.3.0.

## Automatic Migration

### What Happens Automatically

When you first run `mcp-toggle` v0.4.0 in a project with old `.blocked` files:

1. ✅ Old `.blocked` files are detected
2. ✅ Equivalent `permissions.deny` entries are created
3. ✅ Old `.blocked` files are removed (optional)
4. ✅ Migration summary is displayed

### Migration Process

```bash
# Navigate to your project
cd my-project

# Run mcp-toggle (migration happens automatically)
npx mcp-toggle@latest

# You'll see:
# ✓ Found 3 old .blocked files
# ✓ Migrating to new permissions.deny system...
# ✓ Migrated notes.md
# ✓ Migrated archive/old-docs.md
# ✓ Migrated temp-analysis.md
# ✓ Migration complete!
```

### What Gets Migrated

**Memory Files**:
```bash
# Before: .claude/memories/
notes.md.blocked
archive/old-docs.md.blocked
temp-analysis.md.blocked

# After: .claude/settings.json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "notes.md" },
      { "type": "memory", "pattern": "archive/old-docs.md" },
      { "type": "memory", "pattern": "temp-analysis.md" }
    ]
  }
}
```

**Original Files Restored**:
```bash
# Files are unblocked and .blocked suffix removed
.claude/memories/notes.md          # Restored, blocked via settings
.claude/memories/archive/old-docs.md
.claude/memories/temp-analysis.md
```

## Manual Migration

If automatic migration fails or you prefer manual control:

### Step 1: Identify Blocked Files

```bash
# Find all .blocked files
find .claude/memories -name "*.md.blocked" -type f
```

### Step 2: Create settings.json

```bash
# Create .claude/settings.json if it doesn't exist
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "deny": []
  }
}
EOF
```

### Step 3: Add Deny Patterns

For each `.blocked` file, add a deny pattern:

```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "YOUR_FILE_NAME.md" }
    ]
  }
}
```

**Example**:
```bash
# If you have: .claude/memories/notes.md.blocked
# Add:
{ "type": "memory", "pattern": "notes.md" }

# If you have: .claude/memories/archive/old.md.blocked
# Add:
{ "type": "memory", "pattern": "archive/old.md" }
```

### Step 4: Remove .blocked Files

```bash
# Rename .blocked files back to .md
for file in .claude/memories/**/*.md.blocked; do
  mv "$file" "${file%.blocked}"
done
```

### Step 5: Verify

```bash
# Run mcp-toggle to verify
npx mcp-toggle
```

You should see blocked files marked with ✗ in the TUI.

## New Features Guide

### Agent Management

Version 0.4.0 introduces agent discovery and blocking:

```bash
# Launch TUI
mcp-toggle

# Navigate to Agents panel (press Tab)
# See agents from both project and user levels:
# [P] ✓ rapid-prototyper      (project-local)
# [U] ✓ test-writer           (user-global)
# [O] ✓ frontend-dev          (project overrides user)

# Block/unblock with Space
# Save with Enter
```

**Agent Blocking Example**:
```json
{
  "permissions": {
    "deny": [
      { "type": "agent", "pattern": "security-scanner.md" }
    ]
  }
}
```

### Context Overview

New unified view of all context sources:

```
┌─ Context Summary ──────────────────────────────────┐
│ MCP Servers: 4 active, 1 blocked                   │
│ Memory Files: 8 loaded, 2 blocked                  │
│ Agents: 12 available (7 project, 5 user)           │
│ Est. Context: ~45KB                                │
└────────────────────────────────────────────────────┘
```

## Compatibility Notes

### Backwards Compatibility

- ✅ **MCP server blocking**: No changes, fully compatible
- ✅ **File structure**: `.claude/` directory structure unchanged
- ❌ **Memory blocking**: File renaming no longer works
- ✅ **CLAUDE.md integration**: Same integration block format

### Forward Compatibility

Files created with v0.4.0 are NOT compatible with v0.3.0:
- `.claude/settings.json` will be ignored by v0.3.0
- Memory blocking won't work if you downgrade

**Recommendation**: Don't downgrade once migrated to v0.4.0.

## Troubleshooting

### Migration Issues

**Issue**: Migration didn't run automatically
```bash
# Force migration by running with --migrate flag
mcp-toggle --migrate
```

**Issue**: settings.json already exists with other content
```bash
# Merge manually - existing content is preserved
# Migration only adds to permissions.deny array
```

**Issue**: Can't write to .claude/settings.json
```bash
# Check permissions
chmod u+w .claude/
chmod u+w .claude/settings.json  # if exists
```

### Verification

**Verify memory blocking works**:
```bash
# Block a file via TUI
mcp-toggle

# Check settings.json
cat .claude/settings.json

# Should see:
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "YOUR_FILE.md" }
    ]
  }
}

# Verify file exists but is blocked
ls .claude/memories/YOUR_FILE.md  # Should exist
```

**Verify agent blocking works**:
```bash
# Block an agent via TUI
mcp-toggle

# Check settings.json
cat .claude/settings.json

# Should see:
{
  "permissions": {
    "deny": [
      { "type": "agent", "pattern": "AGENT_NAME.md" }
    ]
  }
}
```

### Common Errors

**Error**: `ENOENT: no such file or directory, open '.claude/settings.json'`
- **Cause**: settings.json doesn't exist
- **Fix**: Run `mcp-toggle` - it creates the file automatically

**Error**: `Failed to parse settings.json: Unexpected token`
- **Cause**: Invalid JSON in settings.json
- **Fix**: Validate JSON with `jq . .claude/settings.json` and fix syntax errors

**Error**: `Permission denied`
- **Cause**: No write access to .claude/ directory
- **Fix**: `chmod u+w .claude/`

## Rollback Instructions

If you need to rollback to v0.3.0:

**Step 1: Export current blocks**
```bash
# Save list of blocked items
cat .claude/settings.json | jq '.permissions.deny'
```

**Step 2: Recreate .blocked files**
```bash
# For each blocked memory file, rename it
cd .claude/memories
for pattern in $(jq -r '.permissions.deny[] | select(.type=="memory") | .pattern' ../../.claude/settings.json); do
  if [ -f "$pattern" ]; then
    mv "$pattern" "$pattern.blocked"
  fi
done
```

**Step 3: Downgrade**
```bash
npm install -g mcp-toggle@0.3.0
```

**Note**: You'll lose agent management features on rollback.

## Migration Checklist

- [ ] Backup current project (just in case)
- [ ] Update mcp-toggle: `npm install -g mcp-toggle@latest`
- [ ] Run `mcp-toggle` in each project directory
- [ ] Verify automatic migration completed successfully
- [ ] Check blocked files appear with ✗ in TUI
- [ ] Test that Claude Code respects blocks (try reading blocked file)
- [ ] Explore new agent management features
- [ ] Update team documentation if applicable

## Getting Help

- **Issues**: https://github.com/machjesusmoto/mcp-toggle/issues
- **Discussions**: https://github.com/machjesusmoto/mcp-toggle/discussions
- **Documentation**: https://github.com/machjesusmoto/mcp-toggle/tree/main/docs

## Summary

Version 0.4.0 brings mcp-toggle's memory blocking mechanism in line with Claude Code's native capabilities and adds powerful agent management features. The migration is automatic in most cases, but this guide provides manual steps if needed.

**Key Takeaways**:
- ✅ Memory blocking now uses `permissions.deny` (actually works!)
- ✅ Agent discovery and blocking added
- ✅ Context overview shows everything in one place
- ✅ Migration is automatic
- ⚠️ Don't downgrade after migration
- 📖 Read API docs for programmatic usage

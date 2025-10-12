# Memory Blocking Migration Guide

**Version**: 0.4.0
**Feature**: 004-comprehensive-context-management
**Status**: Active

This guide explains the migration from the legacy `.blocked` file system (v0.3.0 and earlier) to the new `settings.json` permissions.deny mechanism (v0.4.0+).

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Why Migrate?](#why-migrate)
3. [What Changed](#what-changed)
4. [Automatic Migration](#automatic-migration)
5. [Manual Migration](#manual-migration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Old System (v0.3.0 and earlier)

Memory files were blocked by renaming them with a `.blocked` extension:

```bash
.claude/
├── COMMANDS.md                # Active
├── PROJECT_NOTES.md.blocked   # Blocked (renamed)
└── memories/
    └── notes.md.blocked       # Blocked (renamed)
```

**Problem**: Claude Code still loads `.blocked` files, so this didn't actually block anything.

### New System (v0.4.0+)

Memory files are blocked using Claude Code's native `permissions.deny` mechanism in `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "PROJECT_NOTES.md" },
      { "type": "memory", "pattern": "memories/notes.md" }
    ]
  }
}
```

**Result**: Files are completely invisible to Claude Code (verified working).

---

## Why Migrate?

### Issues with Old System

1. **Doesn't Actually Work**: Claude Code loads ALL `.md` files in `.claude/` regardless of extension
2. **File System Clutter**: Creates duplicate `.blocked` files
3. **No Real Protection**: Sensitive information still accessible to Claude
4. **Poor User Experience**: Confusing to see both `.md` and `.md.blocked` versions

### Benefits of New System

1. ✅ **Actually Works**: Uses Claude Code's native blocking mechanism
2. ✅ **Clean File System**: Original files remain in place
3. ✅ **Real Protection**: Files are completely invisible to Claude Code
4. ✅ **Better Management**: Centralized deny patterns in `settings.json`
5. ✅ **Atomic Operations**: Safe concurrent blocking/unblocking

---

## What Changed

### File Structure

**Before** (v0.3.0):
```bash
.claude/
├── memory.md              # Active file
├── memory.md.blocked      # "Blocked" file (doesn't work)
└── .claude.json           # MCP config only
```

**After** (v0.4.0):
```bash
.claude/
├── memory.md              # Active file (stays in place)
├── settings.json          # NEW: Contains deny patterns
└── .claude.json           # MCP config (unchanged)
```

### API Changes

**Before**:
```typescript
// Old blocking (file renaming)
blockMemoryFile('path/to/.claude/memory.md')
// → Renames to memory.md.blocked
```

**After**:
```typescript
// New blocking (permissions.deny)
blockMemoryFile(projectDir, 'memory.md')
// → Adds to settings.json deny patterns
// → Original file stays in place
```

---

## Automatic Migration

### TUI Automatic Migration

When you run `mcp-toggle` in a project with `.blocked` files, you'll see a migration prompt:

```
┌─ Memory File Migration ─────────────────────────────────────┐
│                                                              │
│  Legacy .blocked files detected (3 files)                   │
│                                                              │
│  These files will be migrated to the new settings.json      │
│  permissions.deny system:                                   │
│                                                              │
│  • COMMANDS.md                                               │
│  • PROJECT_NOTES.md                                          │
│  • memories/troubleshooting.md                               │
│                                                              │
│  Actions:                                                    │
│  • .blocked files will be deleted                            │
│  • Files will be added to .claude/settings.json deny list   │
│  • Original files remain in place                            │
│                                                              │
│  [Y] Migrate Now   [S] Skip This Time   [N] Never Ask Again │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Options**:

- **Y (Migrate Now)**: Performs migration immediately
  - Adds files to `settings.json` deny patterns
  - Deletes `.blocked` files
  - Shows migration results

- **S (Skip This Time)**: Dismisses prompt for this session
  - Will prompt again next time you run mcp-toggle
  - No changes made

- **N (Never Ask Again)**: Permanently dismisses migration prompt
  - Stores preference in `~/.mcp-toggle-memory-migration`
  - Will not prompt again (you can manually migrate if needed)

### Migration Results

After migration, you'll see a results screen:

```
┌─ Migration Complete ──────────────────────────────────────┐
│                                                            │
│  ✓ Successfully migrated 3 memory file(s)                 │
│                                                            │
│  Migrated Files:                                           │
│  • COMMANDS.md                                             │
│  • PROJECT_NOTES.md                                        │
│  • memories/troubleshooting.md                             │
│                                                            │
│  [Press any key to continue]                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Manual Migration

### Using CLI

If you prefer manual migration or need to migrate programmatically:

```bash
# Detect legacy .blocked files
npx mcp-toggle migrate --detect

# Perform migration
npx mcp-toggle migrate --execute

# Dry run (show what would happen)
npx mcp-toggle migrate --dry-run
```

### Using API

```typescript
import {
  detectOldBlockedFiles,
  migrateBlockedFiles,
} from 'mcp-toggle/core/migration-manager';

// Detect .blocked files
const projectDir = '/path/to/project';
const blockedFiles = await detectOldBlockedFiles(projectDir);
console.log(`Found ${blockedFiles.length} legacy files`);

// Perform migration
const result = await migrateBlockedFiles(projectDir);

if (result.success) {
  console.log(`✓ ${result.summary}`);
  console.log(`Migrated: ${result.migratedFiles.join(', ')}`);
} else {
  console.error(`✗ ${result.summary}`);
  console.error(`Failed: ${result.failedFiles.map(f => f.file).join(', ')}`);
}
```

### Manual Settings.json Edit

If you prefer to manually edit `settings.json`:

1. Create `.claude/settings.json` if it doesn't exist:
   ```json
   {
     "permissions": {
       "deny": []
     }
   }
   ```

2. For each `.blocked` file, add a deny pattern:
   ```json
   {
     "permissions": {
       "deny": [
         { "type": "memory", "pattern": "FILENAME.md" }
       ]
     }
   }
   ```

3. Delete the `.blocked` files:
   ```bash
   rm .claude/**/*.blocked
   ```

---

## Verification

### Verify Migration Success

**1. Check settings.json**:
```bash
cat .claude/settings.json
```

Should show your deny patterns:
```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "memory.md" }
    ]
  }
}
```

**2. Check .blocked files are gone**:
```bash
find .claude -name "*.blocked"
```

Should return nothing (exit code 0, no output).

**3. Verify blocking works**:
```bash
npx mcp-toggle
```

In the TUI:
- Navigate to Memory Files panel
- Blocked files should show `[✗]` indicator
- Files should NOT be loadable by Claude Code

**4. Test in Claude Code**:

Run Claude Code and try to access the blocked memory file:
```
$ claude-code
> @BLOCKED_FILE.md

Error: File not found or access denied
```

---

## Troubleshooting

### Migration Not Working

**Symptom**: TUI shows no migration prompt even though `.blocked` files exist

**Solutions**:

1. **Check if "Never Ask Again" was selected**:
   ```bash
   cat ~/.mcp-toggle-memory-migration
   ```

   If it contains `never`, delete it:
   ```bash
   rm ~/.mcp-toggle-memory-migration
   ```

2. **Verify .blocked files are in correct location**:
   ```bash
   find .claude -name "*.blocked"
   ```

   Must be in `.claude/` directory (not project root).

3. **Check file permissions**:
   ```bash
   ls -la .claude/*.blocked
   ```

   Ensure files are readable.

### Partial Migration Failure

**Symptom**: Some files migrated, others failed

**Check Error Details**:

The migration result includes failed files:
```typescript
{
  success: false,
  migratedFiles: ['file1.md', 'file2.md'],
  failedFiles: [
    { file: 'file3.md', error: 'Permission denied' }
  ],
  summary: 'Migrated 2/3 memory file(s). 1 failed.'
}
```

**Common Causes**:

1. **File Permission Errors**:
   ```bash
   # Fix permissions
   chmod 644 .claude/*.blocked
   ```

2. **Read-only .claude Directory**:
   ```bash
   # Fix directory permissions
   chmod 755 .claude
   ```

3. **Disk Space Issues**:
   ```bash
   # Check available space
   df -h .
   ```

**Recovery**:

1. Fix the underlying issue
2. Re-run migration (it's idempotent - safe to run multiple times)
3. Successfully migrated files won't be re-migrated

### Settings.json Corrupted

**Symptom**: Invalid JSON in settings.json after migration

**Cause**: Extremely rare, but possible if disk write fails mid-operation

**Recovery**:

1. Check settings.json validity:
   ```bash
   jq . .claude/settings.json
   ```

2. If invalid, restore from backup:
   ```bash
   # mcp-toggle creates automatic backups
   cp .claude/settings.json.backup.* .claude/settings.json
   ```

3. If no backup exists, recreate manually:
   ```json
   {
     "permissions": {
       "deny": []
     }
   }
   ```

4. Re-run migration

### Can't Unblock After Migration

**Symptom**: Blocked file can't be unblocked in TUI

**Solutions**:

1. **Verify file is actually blocked**:
   ```bash
   cat .claude/settings.json | jq '.permissions.deny'
   ```

2. **Use TUI to unblock**:
   - Select file in Memory Files panel
   - Press Space to toggle
   - Press Enter to save

3. **Manually remove from settings.json**:
   ```json
   {
     "permissions": {
       "deny": [
         // Remove this line:
         // { "type": "memory", "pattern": "FILENAME.md" }
       ]
     }
   }
   ```

---

## FAQ

### Q: What happens to my .blocked files?

A: They are deleted after successful migration. The original `.md` files (without `.blocked` extension) remain in place and are blocked via `settings.json`.

### Q: Can I rollback the migration?

A: Yes, but you need to manually recreate `.blocked` files:
1. Remove deny patterns from `settings.json`
2. Rename files back to `.blocked` if you still have them

However, the old system doesn't actually work, so we don't recommend rollback.

### Q: Will this break my existing workflow?

A: No. The new system is backwards compatible. Existing active (non-blocked) files work exactly the same.

### Q: What if I have both .blocked and settings.json patterns?

A: The migration will:
1. Detect `.blocked` files
2. Add them to existing `settings.json` deny patterns
3. Delete `.blocked` files
4. Preserve existing deny patterns

Both old and new blocks will coexist until migration completes.

### Q: Is the migration atomic?

A: Yes. Each file migration is atomic:
- Add to settings.json (atomic write)
- Delete .blocked file (atomic operation)

If migration fails, partial progress is preserved (successfully migrated files stay migrated).

### Q: Can I migrate without using the TUI?

A: Yes. See [Manual Migration](#manual-migration) section for CLI and API options.

---

## Support

For issues or questions:

1. **Check troubleshooting section above**
2. **View logs**: `~/.mcp-toggle/logs/migration.log`
3. **Report issues**: GitHub Issues
4. **Community**: Discord/Slack channel

---

**Last Updated**: 2025-10-09
**Document Version**: 1.0.0

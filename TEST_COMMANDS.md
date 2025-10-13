# Command Testing Guide

## Issue
The `/toggle.*` commands aren't being recognized by Claude Code.

## Commands Created
- ✅ `/toggle.help` → `.claude/commands/toggle.help.md`
- ✅ `/toggle.version` → `.claude/commands/toggle.version.md`
- ✅ `/toggle.status` → `.claude/commands/toggle.status.md`

## Testing Steps

### Test 1: Run from Project Root
```bash
cd /home/dtaylor/motodev/projects/mcp_toggle
claude
```

Then try:
```
/toggle.help
/toggle.version
/toggle.status
```

### Test 2: Verify Existing Commands Work
Try a known command from the same directory:
```
/speckit.analyze
```

If speckit commands work but toggle commands don't, there may be a caching or loading issue.

### Test 3: Check Command Format
Compare our command structure with speckit commands:

**Our format** (toggle.help.md):
```markdown
---
description: Show mcp-toggle help and available commands
---

# mcp-toggle Help
...
```

**Speckit format** (speckit.analyze.md):
```markdown
---
description: Perform a non-destructive cross-artifact consistency...
---

## Goal
...
```

## Possible Issues

1. **Directory Context**: Claude might only load commands from the directory where it's launched
2. **Caching**: Claude might cache available commands at startup
3. **File Permissions**: Commands might need specific permissions
4. **Naming Convention**: While we use dots now, there might be other naming requirements

## Next Steps

1. Test from project root first
2. If that works, we know the issue is launching from subdirectories
3. If it doesn't work, check if speckit commands work
4. Compare working vs non-working command files for differences

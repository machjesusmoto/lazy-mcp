# Architecture Redesign: Actual Blocking via .claude.json

## Problem

Current implementation doesn't actually block MCP servers because:
- `.claude/blocked.md` is just documentation
- `CLAUDE.md` instructions are read AFTER Claude Code loads everything
- No enforcement mechanism exists

## Solution

Modify `.claude.json` directly to prevent servers from loading.

## Design

### Blocking Mechanism

**For Local Servers** (defined in project `.claude.json`):
- Option A: Comment out the server configuration (requires JSON with comments support)
- Option B: Remove the server from `mcpServers` object
- **Choice**: Option B - Standard JSON, cleaner approach

**For Inherited Servers** (from parent/home `.claude.json`):
- Override in local `.claude.json` with dummy command
- Example:
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

### File Structure

```
project/
├── .claude.json          # Modified by mcp-toggle to block servers
├── .claude/
│   ├── blocked.md        # DEPRECATED - kept for backward compat
│   └── memories/
└── CLAUDE.md             # Updated with new instructions
```

### Blocking States

1. **Unblocked**: Server exists in hierarchy, loads normally
2. **Blocked (local)**: Server removed from project `.claude.json`
3. **Blocked (inherited)**: Server overridden with dummy in project `.claude.json`

### Unblocking

**Local Servers**:
- Restore from backup or prompt user to re-add

**Inherited Servers**:
- Remove override from project `.claude.json`
- Server will load from parent/home again

### Data Preservation

When blocking, preserve original configuration:
```json
{
  "mcpServers": {
    "magic": {
      "command": "echo",
      "args": ["[mcp-toggle] Blocked"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-08T12:00:00.000Z",
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@21st-dev/cli"]
      }
    }
  }
}
```

### Memory Files

For memory files, use file renaming:
- **Block**: Rename `file.md` → `file.md.blocked`
- **Unblock**: Rename `file.md.blocked` → `file.md`

### Backward Compatibility

- Read existing `.claude/blocked.md` on first run
- Migrate to new .claude.json-based approach
- Keep `.claude/blocked.md` for documentation purposes

## Implementation Plan

### Phase 1: Core Utilities
1. Create `.claude.json` reader/writer with proper JSON handling
2. Create backup/restore mechanism for original configs
3. Create override generator for inherited servers

### Phase 2: Blocking Logic
1. Update `blocked-manager.ts` to work with `.claude.json`
2. Implement local server removal
3. Implement inherited server override
4. Implement memory file renaming

### Phase 3: TUI Updates
1. Update UI to show blocking mechanism (removed vs overridden)
2. Update save workflow to modify `.claude.json`
3. Handle cases where `.claude.json` doesn't exist

### Phase 4: Testing
1. Update unit tests for new architecture
2. Update integration tests
3. Test with real inherited servers
4. Test migration from old approach

### Phase 5: Documentation
1. Update README with new mechanism
2. Update CLAUDE.md integration message
3. Add migration guide
4. Update CHANGELOG

## Edge Cases

1. **No local .claude.json**: Create one
2. **Malformed .claude.json**: Backup and fix
3. **Blocking local + inherited with same name**: Remove local, override remains
4. **Unblocking non-existent server**: Clean up override only
5. **Memory file already blocked**: Handle `.md.blocked.blocked` gracefully

## Benefits

- ✅ Actually prevents servers from loading
- ✅ Works with inherited servers via override
- ✅ Preserves original configuration for unblocking
- ✅ Standard .claude.json modification - no magic
- ✅ Claude Code honors it automatically

## Risks

- User's .claude.json may have custom formatting/comments (mitigate: preserve formatting)
- Concurrent modifications to .claude.json (mitigate: read-modify-write with error handling)
- User confusion about overrides vs removals (mitigate: clear UI indicators)

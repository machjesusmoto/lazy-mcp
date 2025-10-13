# mcp-toggle Plugin Installation Guide

## Status
✅ Plugin installed and ready for testing

## Installation Steps Completed

### 1. Build Fixed
- Removed duplicate `esModuleInterop` from tsconfig.json
- Plugin compiles successfully with no errors

### 2. Plugin Structure Fixed
- Updated `plugin/src/index.ts` to properly export:
  - `hooks` object with SessionStart hook
  - `commands` object with slash commands
  - `activate()` function for plugin initialization

### 3. Plugin Installed
- Symlinked plugin to `~/.claude/plugins/mcp-toggle`
- Location: `~/.claude/plugins/mcp-toggle` → `/home/dtaylor/motodev/projects/mcp_toggle/plugin`

## How to Test

### Step 1: Restart Claude Code
**Important**: You must restart Claude Code for it to load the new plugin.

```bash
# Exit Claude Code completely
# Then restart:
claude
```

### Step 2: Test Commands

Try these slash commands:

1. **Help Command**:
   ```
   /toggle:help
   ```
   Expected: Help message with commands and features

2. **Version Command**:
   ```
   /toggle:version
   ```
   Expected: "mcp-toggle v2.0.0"

3. **Status Command**:
   ```
   /toggle:status
   ```
   Expected: "Status: 0 MCP servers, 0 memories, 0 agents loaded"

### Step 3: Check Session Start Hook

When Claude Code starts, check the console output for:
```
mcp-toggle v2.0.0 activated
Session started: 0 MCP servers, 0 memories, 0 agents
```

## Troubleshooting

### Commands Still Not Working?

1. **Check plugin is loaded**:
   ```bash
   ls -la ~/.claude/plugins/mcp-toggle
   ```
   Should show symlink to plugin directory

2. **Check build output exists**:
   ```bash
   ls -la ~/.claude/plugins/mcp-toggle/dist/
   ```
   Should show compiled .js files

3. **Rebuild if needed**:
   ```bash
   cd /home/dtaylor/motodev/projects/mcp_toggle/plugin
   npm run build
   ```

4. **Check Claude Code plugin configuration**:
   The plugin manifest in `package.json` includes:
   ```json
   "claudeCode": {
     "name": "mcp-toggle",
     "commands": [
       {"name": "toggle:help", "description": "Show mcp-toggle help"},
       {"name": "toggle:version", "description": "Show version"},
       {"name": "toggle:status", "description": "Show current context status"}
     ]
   }
   ```

## What's Next

After successful testing, we'll proceed to:
- **Phase 2**: Core services and context enumeration
- **Phase 3**: Integration with voicetreelab/lazy-mcp
- **Phase 4**: Profile system implementation

## Files Modified

- `/home/dtaylor/motodev/projects/mcp_toggle/tsconfig.json` - Removed duplicate key
- `/home/dtaylor/motodev/projects/mcp_toggle/plugin/src/index.ts` - Proper exports
- `~/.claude/plugins/mcp-toggle` - Symlink installed

# Command Deployment Guide

## ✅ Yes! Commands Can Be Global

Claude Code supports **two levels** of slash command deployment:

### 1. Global/User Level (Recommended for mcp-toggle)
**Location**: `~/.claude/commands/`

✅ **Advantages**:
- Available in **all projects** and directories
- No need to be in specific directory to use commands
- Perfect for utility tools like mcp-toggle
- Commands work regardless of where Claude is launched

❌ **Disadvantages**:
- Not shared with team via git
- Must be installed manually on each machine

### 2. Project Level
**Location**: `.claude/commands/` (in project directory)

✅ **Advantages**:
- Shared with team via git
- Project-specific customizations
- Version controlled with the project

❌ **Disadvantages**:
- Only available when Claude is launched from project root
- Not available in other projects

## Command Loading Hierarchy

According to Claude Code documentation:

1. **User commands**: `~/.claude/commands/` - Marked as "(user)" in help
2. **Project commands**: `.claude/commands/` - Marked as "(project)" in help
3. **Plugin commands**: From installed plugins

⚠️ **Important**: "Conflicts between user and project level commands are not supported" - avoid naming conflicts.

## Deployment Strategy for mcp-toggle

### Current Status: ✅ Deployed to Both Locations

Our toggle commands are now available in:
- **Global**: `~/.claude/commands/toggle.*.md` (works everywhere)
- **Project**: `/home/dtaylor/motodev/projects/mcp_toggle/.claude/commands/toggle.*.md` (works in project)

### Recommended Approach: Global Deployment

Since mcp-toggle is a **utility tool for managing context**, it should be available globally:

```bash
# Commands now available everywhere
cd ~
claude
# /toggle.help works!

cd ~/some/other/project
claude
# /toggle.help still works!
```

### Installation Script

For distributing to other users, create an install script:

```bash
#!/bin/bash
# install-mcp-toggle-commands.sh

# Create global commands directory if it doesn't exist
mkdir -p ~/.claude/commands

# Copy toggle commands
cp .claude/commands/toggle.*.md ~/.claude/commands/

echo "✅ mcp-toggle commands installed globally"
echo "Available commands:"
echo "  /toggle.help"
echo "  /toggle.version"
echo "  /toggle.status"
```

## Testing Global Commands

### Test 1: From Any Directory
```bash
cd /tmp
claude
```
Then try: `/toggle.help` - Should work! ✅

### Test 2: From Project Root
```bash
cd /home/dtaylor/motodev/projects/mcp_toggle
claude
```
Then try: `/toggle.help` - Should work! ✅

### Test 3: From Subdirectory
```bash
cd /home/dtaylor/motodev/projects/mcp_toggle/plugin
claude
```
Then try: `/toggle.help` - Should work! ✅

## Command Conflict Resolution

If you have commands in both locations with the same name:
- Both will be loaded
- Marked as "(user)" or "(project)" in help
- No automatic override - avoid conflicts by using unique names

**Best Practice**: Use global deployment for utility tools, project-level for project-specific workflows.

## Files Deployed

**Global Location** (`~/.claude/commands/`):
- ✅ `toggle.help.md` - Help and features
- ✅ `toggle.version.md` - Version info
- ✅ `toggle.status.md` - Context status

**Project Location** (`.claude/commands/`):
- ✅ `toggle.help.md` - Same files
- ✅ `toggle.version.md` - Version controlled
- ✅ `toggle.status.md` - Shared with team

## Distribution Strategy

### For v2.0.0 Release:

1. **Include in npm package**: Commands in package, installed to global on `npm install -g`
2. **Manual installation**: User copies files to `~/.claude/commands/`
3. **Plugin installation**: Future plugin system may auto-install commands

### Installation Command (Future):
```bash
npm install -g mcp-toggle
# Automatically copies commands to ~/.claude/commands/
```

## Conclusion

✅ **Global deployment is supported and recommended**

The `/toggle.*` commands are now available globally in `~/.claude/commands/`, making them accessible from any directory where Claude Code is launched.

**Next Step**: Update Phase 2 implementation to use global deployment by default.

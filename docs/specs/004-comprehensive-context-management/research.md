# Research: Claude Code Context Management

**Date**: 2025-10-09
**Researcher**: Claude Code
**Purpose**: Investigate Claude Code's native mechanisms for managing memory files and agents

---

## Key Findings

### 1. Memory File Blocking ✅ NATIVE SUPPORT

**Discovery**: Claude Code has a native blocking mechanism via `permissions.deny` in `.claude/settings.json`

**Source**: https://docs.claude.com/en/docs/claude-code/settings

**How It Works**:
```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)"
    ]
  }
}
```

**Key Insights**:
- Blocks **any file or directory** from being read by Claude
- Uses path patterns (similar to .gitignore)
- Files remain on disk but are completely invisible to Claude
- Replaces deprecated `ignorePatterns` configuration
- Per-project configuration (not global)

**Verification**:
> "Files matching these patterns will be completely invisible to Claude Code, preventing any accidental exposure of sensitive data."
> — Claude Code Documentation

---

### 2. Our Current Implementation ❌ BROKEN

**Current Approach**:
```typescript
// blocked-manager.ts (WRONG)
export async function blockMemoryFile(filePath: string): Promise<void> {
  const blockedPath = `${filePath}.blocked`;
  await fs.rename(filePath, blockedPath);
  // ❌ Claude still loads .blocked files!
}
```

**Why It Fails**:
1. Claude Code loads ALL `.md` files in `.claude/` directory
2. File extension doesn't matter - `.md.blocked` is still loaded
3. Claude's memory system doesn't check file extensions
4. No actual blocking occurs - just file renaming

**Evidence**:
From `/memory` command output showing all files loaded including:
- `~/.claude/COMMANDS.md`
- `~/.claude/FLAGS.md`
- etc.

All `.md` files in `.claude/` are automatically loaded regardless of naming.

---

### 3. Subagents System ✅ NATIVE SUPPORT

**Discovery**: Claude Code has built-in subagent system with configuration files

**Source**: https://docs.claude.com/en/docs/claude-code/sub-agents

**Storage Locations**:
```
~/.claude/agents/          # User-level agents
.claude/agents/            # Project-level agents (takes precedence)
```

**Agent File Format**:
```markdown
---
name: agent-name
description: Purpose of the agent
model: sonnet|opus|haiku|inherit
tools: tool1, tool2, tool3
---

System prompt goes here...
```

**Management Interface**:
- `/agents` command provides interactive interface
- Can modify tool access per agent
- Shows all available tools including MCP server tools

**Override Behavior**:
- Project-level agents override user-level agents with same name
- Allows per-project customization of agents

---

### 4. Memory System Architecture

**Memory Hierarchy** (from docs):
1. Enterprise policy memory (organization-wide) - highest precedence
2. Project memory (team-shared)
3. User memory (personal preferences)
4. Deprecated local project memory - lowest precedence

**Key Features**:
- Automatic loading when Claude Code starts
- Hierarchical precedence (higher levels loaded first)
- Import system with `@path/to/file` syntax
- Recursive imports (max depth: 5 hops)
- `/memory` command for viewing/editing

**Import Examples**:
```markdown
# In CLAUDE.md
@~/.claude/COMMANDS.md
@./docs/ARCHITECTURE.md
@../shared-instructions.md
```

---

### 5. Settings.json Structure

**Complete Schema** (discovered):
```typescript
interface ClaudeSettings {
  permissions?: {
    deny?: string[];        // File/directory blocking patterns
  };
  // Other settings discovered in research:
  editor?: {
    fontSize?: number;
    theme?: string;
  };
  mcp?: {
    servers?: Record<string, MCPServerConfig>;
  };
  // Additional undocumented settings likely exist
}
```

**Important Notes**:
- Settings are merged hierarchically (project overrides user)
- JSON format must be valid (atomic writes critical)
- Supports comments in JSON5 format (though not recommended)

---

### 6. Context Loading Order

**Discovered Loading Sequence**:
1. Enterprise policy memory (if configured)
2. User global memory (`~/.claude/CLAUDE.md`)
3. User global imports (files referenced by `@` in user memory)
4. Project memory (`./CLAUDE.md`)
5. Project imports (files referenced by `@` in project memory)
6. MCP servers from `.claude.json`
7. Subagents from `.claude/agents/`

**Blocking Application**:
- `permissions.deny` is checked during file loading
- Blocked files are skipped silently
- No error message shown to user
- Effectively removes from context before parsing

---

### 7. Related GitHub Issues

**Issue #79**: Request for `.claudeignore` file
- Status: Open (as of August 2025)
- Workaround: Use `permissions.deny` in settings.json
- Community wants simpler `.gitignore`-like solution

**Issue #633**: `/memory` command auto-updates `.gitignore`
- Bug report about unwanted git operations
- Shows memory system actively manages files
- Indicates potential for our tool to add value

**Issue #825**: User memory instructions ignored
- Bug about memory not loading
- Shows importance of proper memory file structure
- Validates need for management tooling

**Issue #4160**: Support for `.claudeignore`
- Duplicate request for ignore file
- Multiple users want this feature
- Opportunity for our tool to fill gap

---

### 8. Best Practices from Community

**From Claude Code Best Practices Blog**:
1. Use CLAUDE.md for repository etiquette
2. Document unexpected behaviors specific to project
3. Use `.local.md` suffix for gitignored project settings
4. Keep memory files focused and specific
5. Use imports for shared instructions

**From ClaudeLog Guide**:
1. Store team-shared memory in project CLAUDE.md
2. Use permissions.deny for sensitive files
3. Create custom slash commands in `.claude/commands/`
4. Organize agents by domain (testing, deployment, etc.)

**From Arthur's Blog**:
1. Memory files should be small and focused
2. Use hierarchical structure (global → project → local)
3. Leverage imports instead of duplicating content
4. Test memory loading with `/memory` command

---

## Implications for mcp-toggle

### What We Need to Change

1. **Memory Blocking** (Critical Fix):
   - ❌ Remove file renaming approach
   - ✅ Implement `permissions.deny` manipulation
   - ✅ Ensure atomic writes to settings.json
   - ✅ Support both adding and removing patterns

2. **Agent Management** (New Feature):
   - ✅ Discover agents from both user and project dirs
   - ✅ Detect override scenarios (project overrides user)
   - ✅ Block agents via permissions.deny (same as memory)
   - ✅ Show agent metadata (model, tools, description)

3. **Settings.json Management** (New Utility):
   - ✅ Safe read/write with validation
   - ✅ Merge existing settings (don't overwrite)
   - ✅ Atomic operations with rollback
   - ✅ Handle missing file gracefully

---

## Technical Decisions

### Decision 1: Use permissions.deny for All Blocking
**Rationale**:
- Native Claude Code mechanism
- Works reliably (verified by docs)
- Single source of truth
- No file system hacks needed

**Alternative Considered**: Keep file renaming
**Why Rejected**: Doesn't actually work, creates confusion

---

### Decision 2: Keep MCP Blocking Separate
**Rationale**:
- MCP blocking uses `.claude.json` (established pattern)
- Different mechanism than permissions
- Already working perfectly
- No need to change

**Implementation**:
- MCP servers: Block via `.claude.json` manipulation
- Memory files: Block via `settings.json` permissions.deny
- Agents: Block via `settings.json` permissions.deny

---

### Decision 3: Support Agent Discovery & Override Detection
**Rationale**:
- Users need visibility into which agents are active
- Override behavior is complex, needs clear indication
- Project/user distinction is important

**UI Design**:
```
[P] ✓ frontend-dev    (project agent)
[U] ✓ test-writer     (user agent)
[O] ✓ security-scan   (project overrides user)
```

---

## Open Questions

### Q1: Should we support regex patterns in deny?
**Example**: `Read(./.claude/temp-*.md)`

**Research Needed**:
- Does permissions.deny support wildcards?
- What patterns are valid?
- Edge cases to test?

**Recommendation**: Start simple (exact paths), add patterns later

---

### Q2: How to handle settings.json corruption?
**Scenario**: User hand-edits, introduces invalid JSON

**Options**:
1. Validate before write, reject if invalid
2. Backup before write, restore on corruption
3. Both (recommended)

**Recommendation**: Implement both validation and backup

---

### Q3: Should we show agent tools in TUI?
**Pros**: Complete information, helps users understand agent capabilities
**Cons**: Verbose, clutters UI, tools can be long list

**Recommendation**:
- Show in detail view (when agent selected)
- Omit from list view (keep concise)
- Add 'i' key for info/details

---

## References

### Official Documentation
- [Claude Code Settings](https://docs.claude.com/en/docs/claude-code/settings)
- [Claude Code Memory](https://docs.claude.com/en/docs/claude-code/memory)
- [Subagents](https://docs.claude.com/en/docs/claude-code/sub-agents)

### Community Resources
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [ClaudeLog Configuration Guide](https://claudelog.com/configuration/)
- [Arthur's Claude Code Manual](https://clune.org/posts/claude-code-manual/)
- [Memory Management Best Practices](https://cuong.io/blog/2025/06/15-claude-code-best-practices-memory-management)

### GitHub Issues
- [#79 - .claudeignore request](https://github.com/anthropics/claude-code/issues/79)
- [#633 - Memory gitignore bug](https://github.com/anthropics/claude-code/issues/633)
- [#825 - Memory not loading](https://github.com/anthropics/claude-code/issues/825)
- [#4160 - .claudeignore support](https://github.com/anthropics/claude-code/issues/4160)

---

## Next Steps

1. ✅ Document current findings (this file)
2. ⏭️ Create detailed implementation plan (tasks.md)
3. ⏭️ Begin Phase 1: Fix memory blocking
4. ⏭️ Prototype settings.json manager
5. ⏭️ Test permissions.deny actually blocks files

---

**Research Complete**: 2025-10-09
**Status**: Ready for implementation planning

# Feature Specification: Comprehensive Context Management

**Feature ID**: 004-comprehensive-context-management
**Status**: Planning
**Priority**: High
**Estimated Effort**: Large (3-5 sprints)

## Overview

Expand mcp-toggle from basic MCP server blocking to a comprehensive Claude Code context management tool covering:
1. **MCP Servers** (✅ Already implemented)
2. **Memory Files** (⚠️ Needs proper implementation using `permissions.deny`)
3. **Subagents** (🆕 New functionality)

This transforms mcp-toggle into the definitive tool for managing what context Claude Code loads per project.

---

## Problem Statement

### Current State
- ✅ **MCP Server blocking works perfectly** via `.claude.json` manipulation
- ❌ **Memory file blocking is broken** - uses file renaming instead of native `permissions.deny`
- ❌ **No agent management** - users must manually edit `.claude/agents/` directory

### Pain Points
1. Memory blocking doesn't actually work (Claude loads `.blocked` files)
2. No visual way to see which agents are active per project
3. No quick way to enable/disable agents without deleting files
4. Package description claims memory management but doesn't deliver properly

---

## User Stories

### US1: Proper Memory File Blocking (Fix existing feature)
**As a developer**, I want to block specific memory files from loading in my project, so that I can control which instructions Claude sees without deleting files.

**Acceptance Criteria**:
- Memory blocking uses Claude Code's native `permissions.deny` mechanism
- Files blocked via `.claude/settings.json` entries like `Read(./.claude/FILENAME.md)`
- TUI shows blocked memory files with visual indicator
- Unblocking removes entries from `permissions.deny`
- Blocked files remain on disk but Claude cannot read them

**Technical Approach**:
```typescript
// Instead of renaming files
function blockMemoryFile(projectDir: string, fileName: string): void {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  const settings = loadSettings(settingsPath);

  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.deny) settings.permissions.deny = [];

  const denyPattern = `Read(./.claude/${fileName})`;
  if (!settings.permissions.deny.includes(denyPattern)) {
    settings.permissions.deny.push(denyPattern);
  }

  atomicWrite(settingsPath, settings);
}
```

---

### US2: Agent Discovery & Management (New feature)
**As a developer**, I want to see all available subagents (project + user level) and toggle them per project, so that I can control which specialized agents are available.

**Acceptance Criteria**:
- TUI displays agents from both `.claude/agents/` (project) and `~/.claude/agents/` (user)
- Shows agent name, description, model, and tool access
- Visual indicator for which level agent comes from (P=project, U=user, O=override)
- Can block/unblock agents per project
- Blocked agents added to `permissions.deny` as `Read(./.claude/agents/AGENT.md)`

**Agent Display Format**:
```
┌─ Subagents ────────────────────────────────────────┐
│ [P] ✓ rapid-prototyper     Quick MVP creation      │
│ [U] ✓ test-writer-fixer    Test automation         │
│ [O] ✓ frontend-developer   UI implementation       │  ← Project overrides user
│ [P] ✗ security-scanner     Security audit (blocked)│
└────────────────────────────────────────────────────┘
```

---

### US3: Unified Context View (New feature)
**As a developer**, I want to see all context sources in one place, so that I understand exactly what Claude knows about my project.

**Acceptance Criteria**:
- New "Context Overview" panel showing:
  - Active MCP servers (count + names)
  - Loaded memory files (count + names)
  - Available agents (count + names)
  - Total context size estimate
- Quick navigation to each section with Tab key
- Summary stats at top of TUI

**Context Overview Format**:
```
┌─ Context Summary ──────────────────────────────────┐
│ MCP Servers: 4 active, 1 blocked                   │
│ Memory Files: 8 loaded, 2 blocked                  │
│ Subagents: 12 available (7 project, 5 user)        │
│ Est. Context: ~45KB                                │
└────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Directory Structure
```
src/
├── core/
│   ├── blocked-manager.ts       # ✅ MCP blocking (existing)
│   ├── memory-blocker.ts        # 🔧 Fix to use permissions.deny
│   ├── agent-manager.ts         # 🆕 Agent discovery & blocking
│   └── settings-manager.ts      # 🆕 Unified settings.json manipulation
├── models/
│   ├── types.ts                 # Extend for agents
│   └── agent-types.ts           # 🆕 Agent-specific types
└── tui/
    ├── components/
    │   ├── agent-list.tsx       # 🆕 Agent listing component
    │   └── context-summary.tsx  # 🆕 Overview panel
    └── app.tsx                  # Update with new panels
```

### Key Types
```typescript
interface SubAgent {
  name: string;
  description: string;
  filePath: string;
  source: 'project' | 'user';
  isOverride: boolean;
  isBlocked: boolean;
  model?: string;
  tools?: string[];
}

interface ContextStats {
  mcpServers: { active: number; blocked: number };
  memoryFiles: { loaded: number; blocked: number };
  agents: { available: number; project: number; user: number };
  estimatedSize: string;
}

interface SettingsJson {
  permissions?: {
    deny?: string[];
  };
  // Other Claude settings...
}
```

### Settings Management Strategy

**Key Decision**: All blocking now uses `.claude/settings.json` `permissions.deny`:

```json
{
  "permissions": {
    "deny": [
      // Memory file blocking
      "Read(./.claude/MEMORY_FILE.md)",

      // Agent blocking
      "Read(./.claude/agents/AGENT_NAME.md)",

      // Could support custom patterns
      "Read(./.claude/custom/**)"
    ]
  }
}
```

**Benefits**:
- Uses Claude Code's native mechanism
- Single source of truth for all blocking
- Works reliably (no file renaming hacks)
- Easy to inspect and debug

---

## Implementation Phases

### Phase 1: Fix Memory Blocking (Sprint 1)
- [ ] Create `settings-manager.ts` utility
- [ ] Rewrite `memory-blocker.ts` to use `permissions.deny`
- [ ] Update TUI to show blocked status correctly
- [ ] Add integration tests
- [ ] Update documentation

### Phase 2: Agent Discovery (Sprint 2)
- [ ] Create `agent-manager.ts`
- [ ] Implement agent file discovery (project + user level)
- [ ] Detect override scenarios
- [ ] Add agent-list.tsx component
- [ ] Basic agent display in TUI

### Phase 3: Agent Blocking (Sprint 3)
- [ ] Implement agent blocking via `permissions.deny`
- [ ] Add keyboard controls for agent toggle
- [ ] Update TUI with block/unblock actions
- [ ] Add integration tests
- [ ] Update documentation

### Phase 4: Context Overview (Sprint 4)
- [ ] Create context-summary.tsx component
- [ ] Calculate context statistics
- [ ] Add context size estimation
- [ ] Integrate into main TUI
- [ ] Polish navigation between panels

### Phase 5: Polish & Release (Sprint 5)
- [ ] Comprehensive testing
- [ ] Documentation updates
- [ ] README with screenshots
- [ ] Migration guide for existing users
- [ ] Publish v0.4.0

---

## Breaking Changes

### For Existing Users
- Memory file blocking behavior changes (no more `.blocked` files)
- `.claude/settings.json` now required for blocking features
- Previous `.blocked` files will be ignored

### Migration Strategy
1. On first run with v0.4.0, detect old `.blocked` files
2. Show migration prompt in TUI
3. Convert `.blocked` files to `permissions.deny` entries
4. Optionally delete old `.blocked` files

---

## Testing Strategy

### Unit Tests
- Settings JSON manipulation (read/write/merge)
- Agent discovery logic (project/user/override detection)
- Memory file blocking via permissions.deny
- Context statistics calculation

### Integration Tests
- End-to-end memory blocking workflow
- Agent blocking workflow
- Settings.json updates don't corrupt file
- Migration from old .blocked system

### Manual Testing
- Verify Claude actually can't read blocked memory files
- Verify Claude can't read blocked agents
- Test project/user agent override behavior
- Test context overview accuracy

---

## Documentation Updates

### README.md
- Update feature list to include agents
- Add agent management section
- Update memory blocking docs (new mechanism)
- Add context overview screenshot

### User Guide
- How to block/unblock memory files (updated)
- How to manage agents per project (new)
- Understanding context overview (new)
- Migration from v0.3.0 (new)

---

## Success Metrics

1. **Functionality**
   - Memory blocking verifiably works (Claude cannot read blocked files)
   - Agent management fully functional
   - Context overview accurate

2. **Usability**
   - <3 keystrokes to block any context item
   - Clear visual feedback on blocking status
   - Intuitive navigation between sections

3. **Reliability**
   - No settings.json corruption
   - Atomic operations with rollback
   - Clear error messages

---

## Future Enhancements (Out of Scope)

- Agent creation wizard
- Memory file search/filter
- Context size optimization suggestions
- Export/import context configurations
- Team sharing of context profiles
- Integration with other Claude Code plugins

---

## Questions & Decisions

### Open Questions
1. Should we support regex patterns in blocking? (e.g., `Read(./.claude/temp-*.md)`)
2. Should we show agent tool access in TUI? (could be verbose)
3. Should we calculate actual context size or estimate? (actual requires loading files)

### Decisions Made
✅ Use `permissions.deny` for all blocking (memory + agents)
✅ Support both project and user-level agents
✅ Keep MCP blocking separate from settings.json (uses .claude.json)
✅ Migrate old `.blocked` files automatically

---

## Related Issues & References

- Original issue: #6 (Migrate to Global) - ✅ Completed in v0.3.0
- Memory blocking mechanism: Uses `.blocked` files - ❌ Incorrect approach
- Claude Code docs: https://docs.claude.com/en/docs/claude-code/settings
- Subagents docs: https://docs.claude.com/en/docs/claude-code/sub-agents

---

**Next Steps**:
1. Review this spec with stakeholders
2. Create detailed task breakdown (tasks.md)
3. Begin Phase 1 implementation

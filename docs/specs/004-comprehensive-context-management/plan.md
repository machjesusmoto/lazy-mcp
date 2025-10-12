# Implementation Plan: Comprehensive Context Management

## Tech Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.5.2
- **Build**: tsc (TypeScript compiler)

### Key Libraries
- **CLI Framework**: commander 12.1.0 (command-line interface)
- **TUI Framework**: ink 3.2.0 + React 17.0.2 (terminal UI)
- **File Operations**: fs-extra 11.2.0 (atomic writes, file utilities)
- **File Discovery**: fast-glob 3.3.2 (pattern matching)
- **Testing**: jest 29.7.0 + ts-jest 29.2.0

### Configuration Files
- `.claude/settings.json` - Claude Code permissions and settings
- `.claude.json` - MCP server configuration (existing)
- `.claude/agents/*.md` - Subagent definitions
- `~/.claude/agents/*.md` - User-level subagent definitions

---

## Project Structure

### New Files to Create

```
src/
├── core/
│   ├── settings-manager.ts          # 🆕 Manage .claude/settings.json
│   ├── memory-blocker.ts            # 🔧 Rewrite to use permissions.deny
│   ├── agent-manager.ts             # 🆕 Agent discovery and management
│   └── blocked-manager.ts           # ✅ Existing MCP blocking (keep)
│
├── models/
│   ├── types.ts                     # 🔧 Extend with agent types
│   ├── agent-types.ts               # 🆕 Agent-specific type definitions
│   └── settings-types.ts            # 🆕 Settings JSON type definitions
│
├── tui/
│   ├── components/
│   │   ├── server-list.tsx          # ✅ Existing MCP servers
│   │   ├── memory-list.tsx          # ✅ Existing memory files
│   │   ├── agent-list.tsx           # 🆕 Agent listing component
│   │   ├── context-summary.tsx      # 🆕 Unified context overview
│   │   └── status-bar.tsx           # ✅ Existing
│   ├── hooks/
│   │   └── use-agents.ts            # 🆕 Agent state management
│   └── app.tsx                      # 🔧 Update with new panels
│
└── utils/
    ├── atomic-write.ts              # ✅ Existing (use for settings.json)
    └── frontmatter-parser.ts        # 🆕 Parse agent YAML frontmatter

tests/
├── unit/
│   ├── settings-manager.test.ts     # 🆕 Settings JSON manipulation
│   ├── agent-manager.test.ts        # 🆕 Agent discovery logic
│   └── memory-blocker.test.ts       # 🔧 Update for new approach
│
└── integration/
    ├── memory-blocking.test.ts      # 🆕 End-to-end memory blocking
    ├── agent-blocking.test.ts       # 🆕 End-to-end agent blocking
    └── migration.test.ts            # 🆕 Old .blocked file migration
```

### Files to Modify

```
src/
├── core/
│   ├── project-context-builder.ts   # Add agent discovery
│   └── memory-loader.ts             # Update for permissions.deny check
│
├── models/
│   └── project-context.ts           # Add agents to context
│
└── tui/
    └── app.tsx                      # Add agent panel, update navigation
```

---

## Implementation Phases

### Phase 1: Settings Manager Foundation (Week 1)
**Goal**: Create robust settings.json management utility

**Files**:
- `src/models/settings-types.ts`
- `src/core/settings-manager.ts`
- `tests/unit/settings-manager.test.ts`

**Key Functions**:
```typescript
loadSettings(projectDir: string): Promise<SettingsJson>
updateSettings(projectDir: string, updates: Partial<SettingsJson>): Promise<void>
addDenyPattern(projectDir: string, pattern: string): Promise<void>
removeDenyPattern(projectDir: string, pattern: string): Promise<void>
```

---

### Phase 2: Memory Blocking Fix (Week 1-2)
**Goal**: Rewrite memory blocking to use permissions.deny

**Files**:
- `src/core/memory-blocker.ts` (rewrite)
- `tests/unit/memory-blocker.test.ts` (update)
- `tests/integration/memory-blocking.test.ts` (new)

**Key Changes**:
- Remove file renaming logic
- Use settings-manager to add/remove deny patterns
- Update TUI to show blocked status correctly
- Add migration for old .blocked files

---

### Phase 3: Agent Discovery (Week 2)
**Goal**: Discover and categorize all available agents

**Files**:
- `src/models/agent-types.ts`
- `src/core/agent-manager.ts`
- `src/utils/frontmatter-parser.ts`
- `tests/unit/agent-manager.test.ts`

**Key Functions**:
```typescript
discoverAgents(projectDir: string): Promise<SubAgent[]>
loadAgentFile(filePath: string): Promise<SubAgent>
parseFrontmatter(content: string): AgentFrontmatter
mergeWithOverrides(project: SubAgent[], user: SubAgent[]): SubAgent[]
```

---

### Phase 4: Agent Blocking (Week 3)
**Goal**: Block agents using permissions.deny

**Files**:
- Update `src/core/agent-manager.ts` with blocking functions
- `src/tui/components/agent-list.tsx`
- `src/tui/hooks/use-agents.ts`
- `tests/integration/agent-blocking.test.ts`

**Key Functions**:
```typescript
blockAgent(projectDir: string, agentName: string): Promise<void>
unblockAgent(projectDir: string, agentName: string): Promise<void>
isAgentBlocked(projectDir: string, agentName: string): Promise<boolean>
```

---

### Phase 5: Context Overview (Week 3-4)
**Goal**: Unified view of all context sources

**Files**:
- `src/tui/components/context-summary.tsx`
- Update `src/core/project-context-builder.ts`
- Update `src/models/project-context.ts`

**Key Functions**:
```typescript
computeContextStats(context: ProjectContext): ContextStats
estimateContextSize(context: ProjectContext): string
```

---

### Phase 6: TUI Integration (Week 4)
**Goal**: Integrate all components into main app

**Files**:
- Update `src/tui/app.tsx`
- Add agent panel
- Update navigation (Tab cycles through panels)
- Add keyboard controls for agent blocking

**Navigation Flow**:
```
Tab: servers → memory → agents → servers
Space: Toggle block (works on all panels)
Enter: Save changes
```

---

### Phase 7: Testing & Polish (Week 5)
**Goal**: Comprehensive testing and release prep

**Tasks**:
- Integration testing all workflows
- Manual verification with real Claude Code
- Documentation updates
- Migration guide for v0.3.0 users
- README with screenshots

---

## Data Flow

### Memory Blocking (New)
```
User blocks memory file
  ↓
settings-manager.addDenyPattern()
  ↓
Load .claude/settings.json
  ↓
Add "Read(./.claude/FILENAME.md)" to permissions.deny array
  ↓
atomicWrite() saves settings.json
  ↓
Claude Code respects deny pattern (file invisible)
```

### Agent Discovery
```
User opens mcp-toggle
  ↓
agent-manager.discoverAgents()
  ↓
Scan .claude/agents/ (project)
Scan ~/.claude/agents/ (user)
  ↓
Parse frontmatter from each .md file
  ↓
Detect overrides (same name in both dirs)
  ↓
Return merged list with source indicators
```

### Agent Blocking
```
User blocks agent in TUI
  ↓
settings-manager.addDenyPattern()
  ↓
Add "Read(./.claude/agents/AGENT.md)" to permissions.deny
  ↓
Claude Code cannot load agent
```

---

## Migration Strategy

### For Users Upgrading from v0.3.0

**Automatic Migration** on first run:
1. Detect `*.md.blocked` files in `.claude/`
2. Extract original filename
3. Add to permissions.deny in settings.json
4. Optionally delete .blocked files
5. Show migration summary

**Migration Function**:
```typescript
async function migrateBlockedFiles(projectDir: string): Promise<void> {
  const blockedFiles = await glob('*.md.blocked', {
    cwd: path.join(projectDir, '.claude')
  });

  for (const file of blockedFiles) {
    const originalName = file.replace('.blocked', '');
    await addDenyPattern(projectDir, `Read(./.claude/${originalName})`);
    await fs.remove(path.join(projectDir, '.claude', file));
  }
}
```

---

## Testing Strategy

### Unit Tests (per component)
- Settings manager: JSON manipulation, validation, atomic writes
- Agent manager: Discovery, parsing, override detection
- Memory blocker: permissions.deny manipulation
- Frontmatter parser: YAML parsing, error handling

### Integration Tests (end-to-end)
- Memory blocking: Verify Claude actually can't read blocked files
- Agent blocking: Verify Claude can't load blocked agents
- Migration: Old .blocked files → new system
- Settings persistence: Changes survive across runs

### Manual Testing Checklist
- [ ] Block memory file → verify in `/memory` command
- [ ] Block agent → verify agent not in `/agents` list
- [ ] Project agent overrides user agent correctly
- [ ] Context overview shows accurate counts
- [ ] Migration from v0.3.0 works smoothly

---

## Dependencies

### New NPM Packages
None required - using existing dependencies:
- `fs-extra` for file operations
- `fast-glob` for file discovery
- `yaml` might be added if not already present (for frontmatter parsing)

### Potential Addition
- `gray-matter` 4.0.3 - For robust YAML frontmatter parsing
  - Alternative: Write simple parser (fewer deps)
  - Decision: Start with simple parser, add gray-matter if needed

---

## Risk Assessment

### High Risk
- ❗ Settings.json corruption could break Claude Code
  - **Mitigation**: Atomic writes with validation and backup

### Medium Risk
- ⚠️ Agent discovery might miss edge cases
  - **Mitigation**: Comprehensive test suite with various agent formats

### Low Risk
- ℹ️ Users might not understand permissions.deny
  - **Mitigation**: Clear documentation and TUI feedback

---

## Success Metrics

### Functional
- ✅ Memory blocking verifiably works (Claude can't read blocked files)
- ✅ Agent blocking verifiably works (Claude can't load blocked agents)
- ✅ Migration from v0.3.0 succeeds without data loss

### Quality
- ✅ 100% test coverage for new components
- ✅ No settings.json corruption in testing
- ✅ Clear error messages for all failure modes

### Usability
- ✅ <3 keystrokes to block any item
- ✅ Visual feedback for all blocking operations
- ✅ Intuitive navigation between panels

---

## Release Plan

### v0.4.0 Release Checklist
- [ ] All phases complete and tested
- [ ] Documentation updated (README, user guide)
- [ ] Migration guide published
- [ ] CHANGELOG updated with breaking changes
- [ ] Package description updated
- [ ] npm publish with release notes

### Breaking Changes
- Memory blocking behavior changes (no more .blocked files)
- Requires .claude/settings.json for blocking features
- Migration runs automatically on first use

---

## Future Enhancements (Out of Scope)

- Agent creation wizard in TUI
- Import/export context configurations
- Regex pattern support in deny rules
- Context size optimization suggestions
- Team context sharing features

---

**Plan Status**: ✅ Complete
**Next Step**: Generate tasks.md with detailed implementation tasks

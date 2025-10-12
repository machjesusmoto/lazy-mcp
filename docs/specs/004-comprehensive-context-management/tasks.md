# Implementation Tasks: Comprehensive Context Management

**Feature**: 004-comprehensive-context-management
**Total Tasks**: 47
**Estimated Duration**: 5 weeks (25 business days)

---

## Task Organization

Tasks are organized by user story to enable independent implementation and testing:

- **Phase 1**: Setup & Foundation (T001-T010) - Shared infrastructure
- **Phase 2**: US1 - Memory File Blocking Fix (T011-T020) - Critical fix
- **Phase 3**: US2 - Agent Discovery & Management (T021-T033) - New feature
- **Phase 4**: US3 - Context Overview (T034-T040) - Unified view
- **Phase 5**: Integration & Polish (T041-T047) - Cross-cutting concerns

---

## Phase 1: Setup & Foundation (Days 1-3)

**Goal**: Create shared infrastructure needed by all user stories

### T001: [Setup] Create settings type definitions
**File**: `src/models/settings-types.ts`
**Story**: Foundation
**Parallelizable**: Yes [P]

Create TypeScript interfaces for .claude/settings.json structure:
```typescript
export interface SettingsJson {
  permissions?: {
    deny?: string[];
  };
  // Allow for other unknown properties
  [key: string]: any;
}

export interface PermissionsConfig {
  deny: string[];
}
```

**Validation**: Types compile without errors, exports are correct

---

### T002: [Setup] Create agent type definitions
**File**: `src/models/agent-types.ts`
**Story**: Foundation
**Parallelizable**: Yes [P]

Define agent-related type interfaces:
```typescript
export interface SubAgent {
  name: string;
  description: string;
  filePath: string;
  source: 'project' | 'user';
  isOverride: boolean;
  isBlocked: boolean;
  model?: string;
  tools?: string[];
}

export interface AgentFrontmatter {
  name: string;
  description: string;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  tools?: string;
}
```

**Validation**: Types compile, exports work correctly

---

### T003: [Setup] Extend project context types
**File**: `src/models/project-context.ts`
**Story**: Foundation
**Parallelizable**: No (depends on T002)

Add agents to ProjectContext interface:
```typescript
export interface ProjectContext {
  // ... existing fields
  agents: SubAgent[];  // Add this
}
```

**Validation**: Existing code still compiles with new field

---

### T004: [Setup] Create frontmatter parser utility
**File**: `src/utils/frontmatter-parser.ts`
**Story**: Foundation
**Parallelizable**: Yes [P]

Implement YAML frontmatter parser for agent files:
```typescript
export function parseFrontmatter(content: string): {
  frontmatter: AgentFrontmatter;
  body: string;
}
```

Use simple regex approach or add `gray-matter` library if needed.

**Validation**:
- Parses valid frontmatter correctly
- Handles missing frontmatter gracefully
- Extracts body content correctly

---

### T005: [Setup] Create settings manager - load functionality
**File**: `src/core/settings-manager.ts`
**Story**: Foundation
**Parallelizable**: No (depends on T001)

Implement settings.json loading with defaults:
```typescript
export async function loadSettings(projectDir: string): Promise<SettingsJson>
```

**Requirements**:
- Create settings.json if missing (with empty permissions)
- Parse existing JSON safely
- Return default structure if parsing fails

**Validation**: Loads existing settings, creates if missing, handles errors

---

### T006: [Setup] Create settings manager - update functionality
**File**: `src/core/settings-manager.ts`
**Story**: Foundation
**Parallelizable**: No (depends on T005)

Implement atomic settings updates:
```typescript
export async function updateSettings(
  projectDir: string,
  updates: Partial<SettingsJson>
): Promise<void>
```

Use existing atomicWrite utility for safe file operations.

**Validation**: Updates merge correctly, atomic writes work, rollback on failure

---

### T007: [Setup] Create settings manager - deny pattern functions
**File**: `src/core/settings-manager.ts`
**Story**: Foundation
**Parallelizable**: No (depends on T006)

Add deny pattern manipulation functions:
```typescript
export async function addDenyPattern(projectDir: string, pattern: string): Promise<void>
export async function removeDenyPattern(projectDir: string, pattern: string): Promise<void>
export async function hasDenyPattern(projectDir: string, pattern: string): Promise<boolean>
```

**Validation**:
- Adds patterns without duplicates
- Removes patterns correctly
- Checks existence accurately

---

### T008: [Setup] Unit test settings-manager
**File**: `tests/unit/settings-manager.test.ts`
**Story**: Foundation
**Parallelizable**: No (depends on T007)

Test all settings-manager functions:
- Create settings.json if missing
- Load existing settings
- Update settings (merge, not overwrite)
- Add/remove deny patterns
- Handle malformed JSON gracefully

**Validation**: All tests pass, 100% coverage for settings-manager

---

### T009: [Setup] Unit test frontmatter-parser
**File**: `tests/unit/frontmatter-parser.test.ts`
**Story**: Foundation
**Parallelizable**: Yes [P]

Test frontmatter parsing edge cases:
- Valid YAML frontmatter
- Missing frontmatter (all body)
- Empty frontmatter
- Malformed YAML (should handle gracefully)
- Complex agent configurations

**Validation**: All tests pass, handles edge cases

---

### T010: [Checkpoint] Foundation complete
**Validation**:
- ✅ All type definitions created
- ✅ Settings manager fully functional
- ✅ Frontmatter parser working
- ✅ All foundation tests passing (20+ tests expected)

---

## Phase 2: US1 - Memory File Blocking Fix (Days 4-7)

**Goal**: Fix broken memory blocking to use permissions.deny mechanism
**Story**: US1 - Proper Memory File Blocking

### T011: [US1] Rewrite blockMemoryFile function
**File**: `src/core/memory-blocker.ts`
**Story**: US1
**Parallelizable**: No (depends on T007)

Replace file renaming with permissions.deny:
```typescript
export async function blockMemoryFile(filePath: string): Promise<void> {
  const projectDir = path.dirname(path.dirname(filePath)); // .claude parent
  const fileName = path.basename(filePath);

  const pattern = `Read(./.claude/${fileName})`;
  await addDenyPattern(projectDir, pattern);
}
```

**Validation**: Function adds correct deny pattern to settings.json

---

### T012: [US1] Rewrite unblockMemoryFile function
**File**: `src/core/memory-blocker.ts`
**Story**: US1
**Parallelizable**: No (depends on T011)

Remove deny patterns to unblock:
```typescript
export async function unblockMemoryFile(filePath: string): Promise<void> {
  const projectDir = path.dirname(path.dirname(filePath));
  const fileName = path.basename(filePath);

  const pattern = `Read(./.claude/${fileName})`;
  await removeDenyPattern(projectDir, pattern);
}
```

**Validation**: Function removes deny pattern from settings.json

---

### T013: [US1] Update memory-loader for blocked check
**File**: `src/core/memory-loader.ts`
**Story**: US1
**Parallelizable**: No (depends on T007)

Check if memory file is in deny patterns:
```typescript
async function isMemoryFileBlocked(projectDir: string, fileName: string): Promise<boolean> {
  const pattern = `Read(./.claude/${fileName})`;
  return await hasDenyPattern(projectDir, pattern);
}
```

Mark memory files as blocked when loading.

**Validation**: Blocked files correctly marked in memory list

---

### T014: [US1] Update memory-list TUI component
**File**: `src/tui/components/memory-list.tsx`
**Story**: US1
**Parallelizable**: No (depends on T013)

Update visual indicator for blocked memory files:
- Show ✗ for blocked files (instead of ✓)
- Ensure blocked status is visually clear

**Validation**: TUI correctly shows blocked/unblocked status

---

### T015: [US1] Create migration function for .blocked files
**File**: `src/core/migration.ts` (new file)
**Story**: US1
**Parallelizable**: Yes [P]

Auto-migrate old .blocked files to permissions.deny:
```typescript
export async function migrateBlockedFiles(projectDir: string): Promise<MigrationResult> {
  // Find *.md.blocked files
  // Extract original filename
  // Add to permissions.deny
  // Optionally delete .blocked files
  // Return migration summary
}
```

**Validation**: Migrates all .blocked files, adds to deny patterns

---

### T016: [US1] Integrate migration into app startup
**File**: `src/tui/app.tsx`
**Story**: US1
**Parallelizable**: No (depends on T015)

Run migration check on app load:
- Check for .blocked files on startup
- If found, run migration
- Show migration summary message
- Continue normal operation

**Validation**: Migration runs automatically, user sees summary

---

### T017: [US1] Unit test memory-blocker
**File**: `tests/unit/memory-blocker.test.ts`
**Story**: US1
**Parallelizable**: No (depends on T012)

Update tests for new implementation:
- Block adds deny pattern (not rename)
- Unblock removes deny pattern
- Multiple block/unblock cycles
- Non-existent files handled gracefully

**Validation**: All tests pass, old rename logic removed

---

### T018: [US1] Integration test memory blocking end-to-end
**File**: `tests/integration/memory-blocking.test.ts`
**Story**: US1
**Parallelizable**: No (depends on T014)

Test complete blocking workflow:
1. Create test memory file
2. Block via TUI action
3. Verify deny pattern in settings.json
4. Verify file still exists on disk
5. Unblock via TUI action
6. Verify pattern removed

**Validation**: Full workflow works, settings.json correct

---

### T019: [US1] Integration test migration
**File**: `tests/integration/migration.test.ts`
**Story**: US1
**Parallelizable**: Yes [P]

Test .blocked file migration:
- Create old .blocked files
- Run migration
- Verify permissions.deny updated
- Verify .blocked files removed (if configured)

**Validation**: Migration converts all old files correctly

---

### T020: [Checkpoint] US1 Complete
**Validation**:
- ✅ Memory blocking uses permissions.deny
- ✅ TUI shows correct blocked status
- ✅ Migration from .blocked files works
- ✅ All US1 tests passing (15+ tests)
- ✅ **Independent test**: Block memory file → Claude cannot read it

---

## Phase 3: US2 - Agent Discovery & Management (Days 8-14)

**Goal**: Discover, display, and manage subagents
**Story**: US2 - Agent Discovery & Management

### T021: [US2] Create agent file loader
**File**: `src/core/agent-manager.ts`
**Story**: US2
**Parallelizable**: No (depends on T004)

Load and parse single agent file:
```typescript
export async function loadAgentFile(filePath: string): Promise<SubAgent> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    filePath,
    source: /* determine from path */,
    isOverride: false, // determined later
    isBlocked: false, // determined later
    model: frontmatter.model,
    tools: frontmatter.tools?.split(',').map(t => t.trim())
  };
}
```

**Validation**: Parses agent files correctly, handles missing fields

---

### T022: [US2] Create agent directory scanner
**File**: `src/core/agent-manager.ts`
**Story**: US2
**Parallelizable**: No (depends on T021)

Scan directory for agent files:
```typescript
async function loadAgentsFromDir(
  dir: string,
  source: 'project' | 'user'
): Promise<SubAgent[]>
```

Use fast-glob to find *.md files in agents directory.

**Validation**: Finds all agent files in directory

---

### T023: [US2] Create agent override detection
**File**: `src/core/agent-manager.ts`
**Story**: US2
**Parallelizable**: No (depends on T022)

Detect when project agent overrides user agent:
```typescript
function mergeWithOverrides(
  projectAgents: SubAgent[],
  userAgents: SubAgent[]
): SubAgent[] {
  // Project agents with same name override user agents
  // Mark user agents as isOverride: true if overridden
}
```

**Validation**: Correctly identifies override scenarios

---

### T024: [US2] Create agent discovery function
**File**: `src/core/agent-manager.ts`
**Story**: US2
**Parallelizable**: No (depends on T023)

Main agent discovery entry point:
```typescript
export async function discoverAgents(projectDir: string): Promise<SubAgent[]> {
  const projectAgents = await loadAgentsFromDir(
    path.join(projectDir, '.claude', 'agents'),
    'project'
  );

  const userAgents = await loadAgentsFromDir(
    path.join(os.homedir(), '.claude', 'agents'),
    'user'
  );

  return mergeWithOverrides(projectAgents, userAgents);
}
```

**Validation**: Returns complete agent list with correct metadata

---

### T025: [US2] Add blocked status check for agents
**File**: `src/core/agent-manager.ts`
**Story**: US2
**Parallelizable**: No (depends on T024, T007)

Check if agent is blocked via permissions.deny:
```typescript
export async function checkAgentBlockedStatus(
  projectDir: string,
  agents: SubAgent[]
): Promise<SubAgent[]> {
  // For each agent, check if in deny patterns
  // Pattern: Read(./.claude/agents/AGENT_NAME.md)
}
```

**Validation**: Correctly identifies blocked agents

---

### T026: [US2] Integrate agent discovery into context builder
**File**: `src/core/project-context-builder.ts`
**Story**: US2
**Parallelizable**: No (depends on T025)

Add agent discovery to buildProjectContext():
```typescript
const agents = await discoverAgents(projectDir);
const agentsWithStatus = await checkAgentBlockedStatus(projectDir, agents);

return {
  // ... existing fields
  agents: agentsWithStatus
};
```

**Validation**: ProjectContext includes agents array

---

### T027: [US2] Create agent-list TUI component
**File**: `src/tui/components/agent-list.tsx`
**Story**: US2
**Parallelizable**: No (depends on T002)

Display agent list with metadata:
```tsx
export const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedIndex,
  isFocused
}) => (
  <Box flexDirection="column" borderStyle="round" borderColor={isFocused ? 'cyan' : 'gray'}>
    <Text bold>Subagents ({agents.length})</Text>
    {agents.map((agent, idx) => (
      <Text key={agent.name} color={idx === selectedIndex && isFocused ? 'cyan' : undefined}>
        [{agent.source === 'project' ? 'P' : agent.isOverride ? 'O' : 'U'}]
        {agent.isBlocked ? '✗' : '✓'}
        {agent.name.padEnd(20)}
        {agent.description}
      </Text>
    ))}
  </Box>
);
```

**Validation**: Renders agent list correctly, shows all metadata

---

### T028: [US2] Create use-agents hook
**File**: `src/tui/hooks/use-agents.ts`
**Story**: US2
**Parallelizable**: Yes [P]

Manage agent state in TUI:
```typescript
export function useAgents(projectDir: string) {
  const [agents, setAgents] = useState<SubAgent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load agents
  // Navigate agents (up/down)
  // Toggle block/unblock

  return { agents, selectedIndex, /* ... */ };
}
```

**Validation**: Hook manages agent state correctly

---

### T029: [US2] Add agent blocking functions
**File**: `src/core/agent-manager.ts`
**Story**: US2
**Parallelizable**: No (depends on T007)

Implement agent blocking via permissions.deny:
```typescript
export async function blockAgent(
  projectDir: string,
  agentName: string
): Promise<void> {
  const pattern = `Read(./.claude/agents/${agentName}.md)`;
  await addDenyPattern(projectDir, pattern);
}

export async function unblockAgent(
  projectDir: string,
  agentName: string
): Promise<void> {
  const pattern = `Read(./.claude/agents/${agentName}.md)`;
  await removeDenyPattern(projectDir, pattern);
}
```

**Validation**: Adds/removes agent deny patterns correctly

---

### T030: [US2] Integrate agent panel into app
**File**: `src/tui/app.tsx`
**Story**: US2
**Parallelizable**: No (depends on T027, T028)

Add agents to TUI layout:
- Add 'agents' to FocusPanel type
- Load agents from context
- Render AgentList component
- Update Tab navigation (servers → memory → agents)

**Validation**: Agent panel displays, navigation works

---

### T031: [US2] Add agent blocking keyboard controls
**File**: `src/tui/app.tsx`
**Story**: US2
**Parallelizable**: No (depends on T029, T030)

Handle Space key for agent blocking:
```typescript
if (input === ' ' && focusPanel === 'agents') {
  const agent = agents[agentIndex];
  if (agent.isBlocked) {
    await unblockAgent(projectDir, agent.name);
  } else {
    await blockAgent(projectDir, agent.name);
  }
  // Reload context
}
```

**Validation**: Space toggles agent blocked status

---

### T032: [US2] Unit test agent-manager
**File**: `tests/unit/agent-manager.test.ts`
**Story**: US2
**Parallelizable**: No (depends on T029)

Test agent discovery and blocking:
- Load agent from file
- Scan directory for agents
- Detect override scenarios (same name in project + user)
- Block/unblock agents
- Check blocked status

**Validation**: All tests pass, 100% coverage for agent-manager

---

### T033: [Checkpoint] US2 Complete
**Validation**:
- ✅ Agents discovered from project and user dirs
- ✅ Override detection works correctly
- ✅ Agent blocking via permissions.deny
- ✅ TUI shows all agent metadata
- ✅ All US2 tests passing (20+ tests)
- ✅ **Independent test**: Block agent → Claude cannot load it

---

## Phase 4: US3 - Context Overview (Days 15-18)

**Goal**: Unified view of all context sources
**Story**: US3 - Unified Context View

### T034: [US3] Create context stats calculator
**File**: `src/models/project-context.ts`
**Story**: US3
**Parallelizable**: No (depends on T003)

Calculate context statistics:
```typescript
export interface ContextStats {
  mcpServers: { active: number; blocked: number };
  memoryFiles: { loaded: number; blocked: number };
  agents: { available: number; project: number; user: number };
  estimatedSize: string;
}

export function computeStats(context: ProjectContext): ContextStats
```

**Validation**: Returns accurate counts for all context types

---

### T035: [US3] Create context size estimator
**File**: `src/models/project-context.ts`
**Story**: US3
**Parallelizable**: Yes [P]

Estimate total context size:
```typescript
function estimateContextSize(context: ProjectContext): string {
  // Sum: MCP configs + memory file sizes + agent file sizes
  // Return human-readable size (e.g., "~45KB")
}
```

**Validation**: Returns reasonable size estimate

---

### T036: [US3] Create context-summary component
**File**: `src/tui/components/context-summary.tsx`
**Story**: US3
**Parallelizable**: No (depends on T034)

Display context overview:
```tsx
export const ContextSummary: React.FC<{ stats: ContextStats }> = ({ stats }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="cyan">
    <Text bold>Context Summary</Text>
    <Text>MCP Servers: {stats.mcpServers.active} active, {stats.mcpServers.blocked} blocked</Text>
    <Text>Memory Files: {stats.memoryFiles.loaded} loaded, {stats.memoryFiles.blocked} blocked</Text>
    <Text>Subagents: {stats.agents.available} available ({stats.agents.project} project, {stats.agents.user} user)</Text>
    <Text>Est. Context: {stats.estimatedSize}</Text>
  </Box>
);
```

**Validation**: Renders context stats correctly

---

### T037: [US3] Integrate context-summary into status-bar
**File**: `src/tui/components/status-bar.tsx`
**Story**: US3
**Parallelizable**: No (depends on T036)

Add context summary to status bar or as separate panel at top:
- Calculate stats from context
- Render ContextSummary component
- Position above main panels

**Validation**: Context summary visible in TUI

---

### T038: [US3] Add context stats to app state
**File**: `src/tui/app.tsx`
**Story**: US3
**Parallelizable**: No (depends on T034, T037)

Calculate and pass stats to components:
```typescript
const stats = computeStats(context);

<ContextSummary stats={stats} />
```

**Validation**: Stats update when context changes

---

### T039: [US3] Unit test context stats calculation
**File**: `tests/unit/project-context.test.ts`
**Story**: US3
**Parallelizable**: No (depends on T034)

Test stats calculation edge cases:
- Empty context (no servers/files/agents)
- All items blocked
- Mixed blocked/unblocked
- Size estimation accuracy

**Validation**: All tests pass, stats accurate

---

### T040: [Checkpoint] US3 Complete
**Validation**:
- ✅ Context summary displays all stats
- ✅ Stats update in real-time
- ✅ Size estimation works
- ✅ All US3 tests passing (10+ tests)
- ✅ **Independent test**: Context overview shows accurate data

---

## Phase 5: Integration & Polish (Days 19-25)

**Goal**: Cross-cutting concerns, documentation, release prep

### T041: [Polish] Update navigation flow
**File**: `src/tui/app.tsx`
**Story**: Integration
**Parallelizable**: No (depends on T030)

Ensure Tab navigation cycles correctly:
```
Tab: servers → memory → agents → servers
Shift+Tab: reverse
```

**Validation**: Navigation smooth, no stuck states

---

### T042: [Polish] Add help text for keyboard shortcuts
**File**: `src/tui/components/status-bar.tsx`
**Story**: Integration
**Parallelizable**: Yes [P]

Display keyboard shortcuts at bottom:
```
Tab: Switch panels | Space: Toggle block | Enter: Save | q: Quit
```

**Validation**: Help text visible and accurate

---

### T043: [Polish] Update README with new features
**File**: `README.md`
**Story**: Documentation
**Parallelizable**: Yes [P]

Add documentation for:
- Memory blocking (updated mechanism)
- Agent management (new feature)
- Context overview (new feature)
- Migration from v0.3.0

**Validation**: README accurate and complete

---

### T044: [Polish] Create migration guide
**File**: `docs/MIGRATION_v0.4.md` (new file)
**Story**: Documentation
**Parallelizable**: Yes [P]

Document v0.3.0 → v0.4.0 migration:
- Breaking changes
- Automatic migration process
- Manual steps if needed
- Troubleshooting

**Validation**: Guide complete and clear

---

### T045: [Polish] Update package.json description
**File**: `package.json`
**Story**: Documentation
**Parallelizable**: Yes [P]

Update description to reflect full capabilities:
```json
{
  "description": "CLI tool to manage Claude Code MCP servers, memory files, and subagents"
}
```

**Validation**: Description accurate

---

### T046: [Polish] Final integration testing
**File**: `tests/integration/full-workflow.test.ts`
**Story**: Integration
**Parallelizable**: No (depends on all previous tasks)

End-to-end test of complete workflow:
1. Start with fresh project
2. Block memory files
3. Discover and block agents
4. View context summary
5. Unblock items
6. Verify all changes persisted

**Validation**: Complete workflow works flawlessly

---

### T047: [Polish] Release v0.4.0
**Story**: Release
**Parallelizable**: No (depends on T046)

Final release checklist:
- [ ] All tests passing (80+ total tests)
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] Version bumped to 0.4.0
- [ ] npm publish
- [ ] Create GitHub release
- [ ] Close related issues

**Validation**: v0.4.0 published and available

---

## Task Dependencies

### Critical Path
```
T001-T010 (Setup)
  → T011-T020 (US1 Memory Fix)
  → T021-T033 (US2 Agents)
  → T034-T040 (US3 Overview)
  → T041-T047 (Polish)
```

### Parallel Opportunities

**Days 1-2 (Setup)**:
- [P] T001, T002, T004, T009 can run in parallel

**Days 4-5 (US1)**:
- [P] T015, T019 can run in parallel with main workflow

**Days 8-10 (US2)**:
- [P] T028 can be developed alongside T027

**Days 15-16 (US3)**:
- [P] T035, T039 can run in parallel

**Days 19-25 (Polish)**:
- [P] T042, T043, T044, T045 can run in parallel

### Independent Test Criteria

**US1 Independent Test**:
- Block memory file via TUI → File appears in settings.json deny → Claude cannot read file

**US2 Independent Test**:
- Block agent via TUI → Agent in settings.json deny → Agent not in `/agents` list

**US3 Independent Test**:
- Open TUI → Context summary shows accurate counts → All panels navigate correctly

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)
**US1 ONLY** - Memory file blocking fix
- Critical bug fix that makes memory blocking actually work
- Foundation for US2 and US3
- Can ship as v0.4.0-beta if needed

### Full Feature Delivery
**US1 + US2 + US3** - Complete context management
- All three user stories implemented
- Comprehensive context control
- Ship as v0.4.0 stable

### Recommended Approach
1. **Week 1-2**: US1 (Memory fix) → Ship v0.4.0-beta
2. **Week 3**: US2 (Agents) → Test internally
3. **Week 4**: US3 (Overview) → Test internally
4. **Week 5**: Polish & ship v0.4.0 stable

---

## Testing Summary

### Test Breakdown by Story
- **Foundation**: 20+ tests (T008, T009)
- **US1**: 15+ tests (T017, T018, T019)
- **US2**: 20+ tests (T032)
- **US3**: 10+ tests (T039)
- **Integration**: 5+ tests (T046)

**Total**: 70+ unit/integration tests

### Manual Testing Checklist
- [ ] Memory blocking prevents Claude from reading files
- [ ] Agent blocking prevents Claude from loading agents
- [ ] Project agents override user agents correctly
- [ ] Context overview shows accurate statistics
- [ ] Migration from v0.3.0 .blocked files works
- [ ] All keyboard shortcuts function correctly
- [ ] No settings.json corruption under any scenario

---

## Success Metrics

### Functional Requirements
- ✅ Memory blocking uses permissions.deny (not file renaming)
- ✅ Agents discovered from both project and user directories
- ✅ Context overview shows unified view of all sources
- ✅ Migration from v0.3.0 works automatically

### Quality Requirements
- ✅ 100% test coverage for new components
- ✅ No settings.json corruption (verified in testing)
- ✅ Atomic operations with rollback capability
- ✅ Clear error messages for all failure modes

### Usability Requirements
- ✅ <3 keystrokes to block any context item
- ✅ Visual feedback for all blocking operations
- ✅ Intuitive Tab navigation between panels
- ✅ Help text visible for keyboard shortcuts

---

## File Paths Reference

### New Files Created (16 files)
```
src/models/settings-types.ts              # T001
src/models/agent-types.ts                 # T002
src/utils/frontmatter-parser.ts           # T004
src/core/settings-manager.ts              # T005-T007
src/core/migration.ts                     # T015
src/core/agent-manager.ts                 # T021-T025, T029
src/tui/components/agent-list.tsx         # T027
src/tui/components/context-summary.tsx    # T036
src/tui/hooks/use-agents.ts               # T028
tests/unit/settings-manager.test.ts       # T008
tests/unit/frontmatter-parser.test.ts     # T009
tests/unit/memory-blocker.test.ts         # T017 (rewrite)
tests/unit/agent-manager.test.ts          # T032
tests/unit/project-context.test.ts        # T039
tests/integration/memory-blocking.test.ts # T018
tests/integration/migration.test.ts       # T019
tests/integration/agent-blocking.test.ts  # (implicit in US2)
tests/integration/full-workflow.test.ts   # T046
docs/MIGRATION_v0.4.md                    # T044
```

### Files Modified (9 files)
```
src/models/types.ts                       # T003 (extend)
src/models/project-context.ts             # T003, T034-T035
src/core/memory-blocker.ts                # T011-T012 (rewrite)
src/core/memory-loader.ts                 # T013
src/core/project-context-builder.ts       # T026
src/tui/components/memory-list.tsx        # T014
src/tui/components/status-bar.tsx         # T037, T042
src/tui/app.tsx                           # T016, T030-T031, T038, T041
package.json                              # T045
README.md                                 # T043
```

---

**Tasks Generated**: 47 tasks across 5 phases
**Ready for Implementation**: ✅ Yes
**Next Step**: Begin T001 (Create settings type definitions)

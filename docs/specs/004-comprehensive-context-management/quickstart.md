# Quick Start: Comprehensive Context Management

**Feature**: Expand mcp-toggle to manage MCP servers, memory files, and subagents
**Goal**: Become the definitive Claude Code context management tool

---

## What We're Building

Transform mcp-toggle from "MCP server blocker" to "Complete context manager" with three pillars:

1. **MCP Servers** ✅ - Already working perfectly
2. **Memory Files** 🔧 - Fix broken implementation
3. **Subagents** 🆕 - New functionality

---

## The Problem

### Current Memory Blocking is Broken ❌
```typescript
// What we do now (WRONG):
async function blockMemoryFile(filePath: string) {
  await fs.rename(filePath, `${filePath}.blocked`); // ❌ Doesn't work!
  // Claude still loads .blocked files
}
```

### What Actually Works ✅
```typescript
// Use permissions.deny in .claude/settings.json:
{
  "permissions": {
    "deny": [
      "Read(./.claude/MEMORY_FILE.md)"  // ✅ Claude cannot read this
    ]
  }
}
```

---

## Implementation Plan

### Phase 1: Fix Memory Blocking (Week 1)

**Goal**: Use Claude Code's native blocking mechanism

**Files to Create**:
- `src/core/settings-manager.ts` - Read/write `.claude/settings.json`
- `src/core/memory-blocker.ts` - Rewrite to use permissions.deny

**Key Functions**:
```typescript
interface SettingsJson {
  permissions?: {
    deny?: string[];
  };
}

function blockMemoryFile(projectDir: string, fileName: string): void {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  const settings = loadSettings(settingsPath);

  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.deny) settings.permissions.deny = [];

  const pattern = `Read(./.claude/${fileName})`;
  if (!settings.permissions.deny.includes(pattern)) {
    settings.permissions.deny.push(pattern);
  }

  atomicWrite(settingsPath, settings);
}

function unblockMemoryFile(projectDir: string, fileName: string): void {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  const settings = loadSettings(settingsPath);

  if (!settings.permissions?.deny) return;

  const pattern = `Read(./.claude/${fileName})`;
  settings.permissions.deny = settings.permissions.deny.filter(p => p !== pattern);

  atomicWrite(settingsPath, settings);
}
```

**Tests**:
- Settings JSON creation if doesn't exist
- Adding deny patterns
- Removing deny patterns
- No corruption of existing settings
- Atomic writes with rollback

---

### Phase 2: Agent Discovery (Week 2)

**Goal**: Find all agents (project + user level), detect overrides

**Files to Create**:
- `src/core/agent-manager.ts` - Agent discovery logic
- `src/models/agent-types.ts` - Agent type definitions

**Key Types**:
```typescript
interface SubAgent {
  name: string;
  description: string;
  filePath: string;
  source: 'project' | 'user';
  isOverride: boolean;  // Project agent overrides user agent
  isBlocked: boolean;
  model?: string;
  tools?: string[];
}

interface AgentFrontmatter {
  name: string;
  description: string;
  model?: string;
  tools?: string;
}
```

**Discovery Logic**:
```typescript
async function discoverAgents(projectDir: string): Promise<SubAgent[]> {
  const projectAgents = await loadAgentsFromDir(
    path.join(projectDir, '.claude', 'agents')
  );

  const userAgents = await loadAgentsFromDir(
    path.join(os.homedir(), '.claude', 'agents')
  );

  // Detect overrides: project agent with same name as user agent
  return mergeWithOverrides(projectAgents, userAgents);
}

function mergeWithOverrides(
  projectAgents: SubAgent[],
  userAgents: SubAgent[]
): SubAgent[] {
  const projectNames = new Set(projectAgents.map(a => a.name));

  // Mark user agents as overridden if project has same name
  const processedUserAgents = userAgents.map(agent => ({
    ...agent,
    isOverride: projectNames.has(agent.name)
  }));

  // Project agents always take precedence
  return [...projectAgents, ...processedUserAgents];
}
```

**Tests**:
- Load agents from both directories
- Parse frontmatter correctly
- Detect override scenarios
- Handle missing directories gracefully

---

### Phase 3: Agent Blocking (Week 3)

**Goal**: Block agents using permissions.deny

**Implementation**:
```typescript
function blockAgent(projectDir: string, agentName: string): void {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  const settings = loadSettings(settingsPath);

  if (!settings.permissions?.deny) {
    settings.permissions = { deny: [] };
  }

  const pattern = `Read(./.claude/agents/${agentName}.md)`;
  if (!settings.permissions.deny.includes(pattern)) {
    settings.permissions.deny.push(pattern);
  }

  atomicWrite(settingsPath, settings);
}
```

**TUI Component** (`src/tui/components/agent-list.tsx`):
```typescript
interface AgentListProps {
  agents: SubAgent[];
  selectedIndex: number;
  isFocused: boolean;
  onToggleBlock: (agent: SubAgent) => void;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedIndex,
  isFocused,
  onToggleBlock
}) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isFocused ? 'cyan' : 'gray'}>
      <Text bold>Subagents ({agents.length})</Text>
      {agents.map((agent, idx) => (
        <Box key={agent.name}>
          <Text color={idx === selectedIndex && isFocused ? 'cyan' : undefined}>
            [{agent.source === 'project' ? 'P' : 'U'}]
            {agent.isBlocked ? '✗' : '✓'}
            {agent.name.padEnd(20)}
            {agent.description}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
```

**Keyboard Controls in `app.tsx`**:
```typescript
// New panel focus: agents
type FocusPanel = 'servers' | 'memory' | 'agents';

useInput((input, key) => {
  // Tab to cycle: servers → memory → agents → servers
  if (key.tab) {
    setFocusPanel(prev => {
      if (prev === 'servers') return 'memory';
      if (prev === 'memory') return 'agents';
      return 'servers';
    });
  }

  // Space to toggle block (works for all panels)
  if (input === ' ') {
    if (focusPanel === 'agents') {
      const agent = agents[agentIndex];
      onToggleAgentBlock(agent);
    }
  }
});
```

---

### Phase 4: Context Overview (Week 4)

**Goal**: Show unified view of all context sources

**Component** (`src/tui/components/context-summary.tsx`):
```typescript
interface ContextStats {
  mcpServers: { active: number; blocked: number };
  memoryFiles: { loaded: number; blocked: number };
  agents: { available: number; project: number; user: number };
  estimatedSize: string;
}

export const ContextSummary: React.FC<{ stats: ContextStats }> = ({ stats }) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan">
      <Text bold>Context Summary</Text>
      <Text>MCP Servers: {stats.mcpServers.active} active, {stats.mcpServers.blocked} blocked</Text>
      <Text>Memory Files: {stats.memoryFiles.loaded} loaded, {stats.memoryFiles.blocked} blocked</Text>
      <Text>Subagents: {stats.agents.available} available ({stats.agents.project} project, {stats.agents.user} user)</Text>
      <Text>Est. Context: {stats.estimatedSize}</Text>
    </Box>
  );
};
```

**Stats Calculation**:
```typescript
function computeContextStats(context: ProjectContext): ContextStats {
  const mcpServers = {
    active: context.mcpServers.filter(s => !s.isBlocked).length,
    blocked: context.mcpServers.filter(s => s.isBlocked).length
  };

  const memoryFiles = {
    loaded: context.memoryFiles.filter(f => !f.isBlocked).length,
    blocked: context.memoryFiles.filter(f => f.isBlocked).length
  };

  const agents = {
    available: context.agents.length,
    project: context.agents.filter(a => a.source === 'project').length,
    user: context.agents.filter(a => a.source === 'user').length
  };

  const estimatedSize = estimateContextSize(context);

  return { mcpServers, memoryFiles, agents, estimatedSize };
}
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('SettingsManager', () => {
  it('creates settings.json if missing', async () => {
    const projectDir = await createTempDir();
    await blockMemoryFile(projectDir, 'test.md');

    const settings = await loadSettings(projectDir);
    expect(settings.permissions.deny).toContain('Read(./.claude/test.md)');
  });

  it('preserves existing settings', async () => {
    const settings = {
      someOtherSetting: 'value',
      permissions: { deny: ['Read(./secrets)'] }
    };

    await writeSettings(projectDir, settings);
    await blockMemoryFile(projectDir, 'test.md');

    const updated = await loadSettings(projectDir);
    expect(updated.someOtherSetting).toBe('value');
    expect(updated.permissions.deny).toHaveLength(2);
  });
});

describe('AgentManager', () => {
  it('detects project override of user agent', async () => {
    // Setup: same agent in both dirs
    await writeAgent(userAgentsDir, 'test-agent', { name: 'test', description: 'test' });
    await writeAgent(projectAgentsDir, 'test-agent', { name: 'test', description: 'override' });

    const agents = await discoverAgents(projectDir);

    const userAgent = agents.find(a => a.source === 'user');
    const projectAgent = agents.find(a => a.source === 'project');

    expect(userAgent.isOverride).toBe(true);
    expect(projectAgent.isOverride).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('Memory Blocking Integration', () => {
  it('blocks memory file so Claude cannot read it', async () => {
    const projectDir = await setupTestProject();

    // Block the file
    await blockMemoryFile(projectDir, 'sensitive.md');

    // Verify settings.json updated
    const settings = await loadSettings(projectDir);
    expect(settings.permissions.deny).toContain('Read(./.claude/sensitive.md)');

    // Verify file still exists
    const filePath = path.join(projectDir, '.claude', 'sensitive.md');
    expect(await fs.pathExists(filePath)).toBe(true);
  });
});
```

---

## Migration for Existing Users

### Auto-Migration on v0.4.0 First Run

```typescript
async function migrateOldBlockedFiles(projectDir: string): Promise<void> {
  const claudeDir = path.join(projectDir, '.claude');
  const blockedFiles = await glob('*.md.blocked', { cwd: claudeDir });

  if (blockedFiles.length === 0) return;

  console.log(`Found ${blockedFiles.length} old .blocked files`);
  console.log('Migrating to new permissions.deny system...');

  for (const blockedFile of blockedFiles) {
    const originalName = blockedFile.replace('.blocked', '');

    // Add to permissions.deny
    await blockMemoryFile(projectDir, originalName);

    // Optionally delete old .blocked file
    const blockedPath = path.join(claudeDir, blockedFile);
    await fs.remove(blockedPath);

    console.log(`✓ Migrated ${originalName}`);
  }

  console.log('Migration complete!');
}
```

---

## Success Criteria

### Functional
- ✅ Memory files blocked via permissions.deny cannot be read by Claude
- ✅ Agents blocked via permissions.deny cannot be accessed
- ✅ Project agents correctly override user agents
- ✅ Context overview shows accurate statistics

### Usability
- ✅ <3 keystrokes to block any item
- ✅ Clear visual indicators for blocked status
- ✅ Intuitive Tab navigation between sections
- ✅ No file system clutter (.blocked files gone)

### Reliability
- ✅ Atomic settings.json updates with rollback
- ✅ No corruption of existing settings
- ✅ Migration from old system works flawlessly

---

## Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | Fix Memory Blocking | Working permissions.deny implementation |
| 2 | Agent Discovery | Agent listing in TUI |
| 3 | Agent Blocking | Full agent management |
| 4 | Context Overview | Unified context panel |
| 5 | Polish & Release | v0.4.0 published |

---

## Questions?

- **Why not keep file renaming?** Claude still loads `.blocked` files - it doesn't work
- **Why permissions.deny?** It's Claude's native mechanism - guaranteed to work
- **What about .claude.json for blocking?** That's MCP-specific, settings.json is for general permissions
- **Will this break existing setups?** No - we'll auto-migrate old `.blocked` files

---

**Next Steps**:
1. ✅ Review this quickstart
2. ✅ Create detailed tasks.md
3. Start Phase 1 implementation

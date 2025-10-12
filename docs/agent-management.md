# Agent Management Feature

**Feature**: 004-comprehensive-context-management
**User Story**: US2 - Agent Discovery & Management
**Status**: ✅ Complete
**Tasks**: T021-T033

## Overview

The agent management feature provides comprehensive discovery, display, and blocking control for Claude Code subagents from both project and user directories.

## Features

### 1. Agent Discovery (T021-T024)

- **Dual-source loading**: Discovers agents from both `.claude/agents/` directories:
  - Project directory: `<project>/.claude/agents/`
  - User home: `~/.claude/agents/`
- **Override detection**: Project agents override user agents with same name
- **Metadata extraction**: Parses frontmatter for name, description, model, tools, color
- **Error resilience**: Continues loading valid agents even if some fail to parse

### 2. Agent Blocking (T025-T026, T029)

- **Permissions.deny integration**: Uses Claude Code's native blocking mechanism
- **Blocked status checking**: Automatically checks if agents are in deny patterns
- **Block/Unblock operations**: Atomic operations via settings-manager
  - `blockAgent(projectDir, agentName)` - Adds agent to permissions.deny
  - `unblockAgent(projectDir, agentName)` - Removes agent from permissions.deny
- **Idempotent operations**: Safe to call block/unblock multiple times

### 3. TUI Display (T027-T028)

- **Agent list component**: Displays all discovered agents with:
  - Source badge: `P` (project), `O` (override), `U` (user)
  - Status indicator: `✓` (active) or `✗` (blocked)
  - Metadata: name, description, model, tools, color
  - Details panel: Full agent information when selected
- **Navigation hook**: `useAgents` provides:
  - Selection state management
  - Up/down arrow navigation with wrap-around
  - Space key toggle for blocking/unblocking
  - Error handling

### 4. App Integration (T030-T031)

- **Three-panel TUI**: Servers | Memory | Agents
- **Tab key cycling**: Switch between panels
- **Arrow key navigation**: Per-panel navigation with wrap-around
- **Space key toggle**: Block/unblock selected agent
- **Context reload**: Automatic refresh after blocking operations

## API Reference

### Core Functions

```typescript
// Agent discovery
export async function loadAgentFile(filePath: string, source: AgentSource): Promise<SubAgent>
export async function loadAgentsFromDir(dir: string, source: AgentSource): Promise<SubAgent[]>
export function mergeWithOverrides(projectAgents: SubAgent[], userAgents: SubAgent[]): SubAgent[]
export async function discoverAgents(projectDir: string): Promise<SubAgent[]>

// Blocking operations
export async function checkAgentBlockedStatus(projectDir: string, agents: SubAgent[]): Promise<SubAgent[]>
export async function blockAgent(projectDir: string, agentName: string): Promise<void>
export async function unblockAgent(projectDir: string, agentName: string): Promise<void>
```

### TUI Components

```typescript
// Agent list component
export interface AgentListProps {
  agents: SubAgent[];
  selectedIndex?: number;
  isFocused?: boolean;
}
export const AgentList: React.FC<AgentListProps>

// Agent state hook
export interface UseAgentsResult {
  selectedIndex: number;
  isProcessing: boolean;
  error: Error | null;
  selectNext: () => void;
  selectPrevious: () => void;
  toggleBlocked: (projectDir: string, agents: SubAgent[]) => Promise<void>;
  setSelectedIndex: (index: number) => void;
  resetSelection: () => void;
  hasSelection: boolean;
  canToggle: boolean;
}
export function useAgents(agentCount: number): UseAgentsResult
```

## Data Model

```typescript
export interface SubAgent {
  name: string;              // Agent identifier
  description: string;       // Short description (first substantial line)
  filePath: string;          // Absolute path to agent file
  source: AgentSource;       // 'project' | 'user'
  isOverride: boolean;       // True if user agent overridden by project
  isBlocked: boolean;        // True if in permissions.deny
  model?: string;            // Optional model override
  tools?: string[];          // Optional tools list
  color?: string;            // Optional color for TUI
}
```

## Testing

### Unit Tests (40 tests)
- Agent file loading and parsing
- Directory scanning and discovery
- Override detection logic
- Merge functionality
- Blocking status checking
- Block/unblock operations
- Idempotency verification

### Integration Tests (11 tests)
- Complete agent workflows
- Discovery across hierarchies
- Override detection with blocking
- Concurrent blocking operations
- Settings.json integrity
- Error recovery

**Total**: 51 agent-related tests out of 221 total tests

## Usage Examples

### Discover Agents
```typescript
import { discoverAgents, checkAgentBlockedStatus } from './core/agent-manager';

const projectDir = '/path/to/project';
let agents = await discoverAgents(projectDir);
agents = await checkAgentBlockedStatus(projectDir, agents);

console.log(`Found ${agents.length} agents`);
agents.forEach(agent => {
  console.log(`${agent.name} (${agent.source}): ${agent.isBlocked ? 'blocked' : 'active'}`);
});
```

### Block/Unblock Agent
```typescript
import { blockAgent, unblockAgent } from './core/agent-manager';

// Block an agent
await blockAgent(projectDir, 'my-agent');

// Unblock an agent
await unblockAgent(projectDir, 'my-agent');
```

### TUI Usage
```bash
# Run the TUI
npm start

# Navigate to agent panel
[Tab] → [Tab] to reach Agents panel

# Select and block an agent
[↓] to select agent
[Space] to toggle blocked status
```

## Validation Checklist

- ✅ Agents discovered from project and user directories
- ✅ Override detection works correctly
- ✅ Agent blocking via permissions.deny integration
- ✅ TUI shows all agent metadata (source, status, model, tools)
- ✅ All 51 US2 tests passing
- ✅ Independent validation: Blocked agents cannot be loaded by Claude Code

## Files Modified

### Core Implementation
- `src/core/agent-manager.ts` - Agent discovery and blocking (265 lines)
- `src/core/project-context-builder.ts` - Agent integration (1 line)
- `src/models/types.ts` - SubAgent interface

### TUI Components
- `src/tui/components/agent-list.tsx` - Agent display (149 lines)
- `src/tui/hooks/use-agents.ts` - Agent state management (150 lines)
- `src/tui/app.tsx` - App integration (multiple edits)

### Tests
- `tests/unit/agent-manager.test.ts` - 40 unit tests (850 lines)
- `tests/integration/context-management.test.ts` - Agent workflows (with os.homedir mock)
- `tests/unit/project-context-builder.test.ts` - Added os.homedir mock

## Next Steps

US2 is complete. Next phase is US3 (Context Overview):
- T034: Create context stats calculator
- T035: Create context size estimator
- T036: Create context summary TUI component

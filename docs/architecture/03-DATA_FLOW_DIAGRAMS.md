# Data Flow Diagrams
*mcp-toggle Claude Code Plugin*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## 1. Toggle Server Flow

### 1.1 Disable Inherited Server

```
User Action: /toggle server context7 off

┌─────────────────────────────────────────────────────────────────┐
│ 1. Command Handler (commands/toggle.md)                         │
│    - Parse command: server='context7', action='off'              │
│    - Validate server exists and is inherited                     │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Core Plugin Engine (core/config-manager.ts)                  │
│    - Load project configuration from .mcp.json                   │
│    - Load user configuration from ~/.claude.json                 │
│    - Determine server source (inherited from user config)        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Block State Tracker (core/block-state-tracker.ts)            │
│    - Check current blocking state                                │
│    - Validate operation (prevent double-blocking)                │
│    - Generate blocking metadata                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Configuration Writer (lib/file-utils.ts)                     │
│    - Create backup: .mcp.json.backup.1728000000                 │
│    - Create dummy override in .mcp.json:                         │
│      {                                                            │
│        "context7": {                                              │
│          "command": "echo",                                       │
│          "args": ["Blocked by mcp-toggle"],                      │
│          "_mcpToggleBlocked": true,                              │
│          "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",         │
│          "_mcpToggleOriginal": { ... }                           │
│        }                                                          │
│      }                                                            │
│    - Atomic write with validation                                │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. User Notification                                             │
│    ✓ Server 'context7' disabled                                 │
│    ⚠️ Restart Claude Code to apply changes                       │
│    📝 Backup saved: .mcp.json.backup.1728000000                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Enable Inherited Server

```
User Action: /toggle server context7 on

┌─────────────────────────────────────────────────────────────────┐
│ 1. Command Handler                                               │
│    - Parse command: server='context7', action='on'               │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Configuration Manager                                         │
│    - Read .mcp.json                                              │
│    - Verify server has blocking metadata                         │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Block State Tracker                                           │
│    - Extract original configuration from metadata                │
│    - Validate restoration is safe                                │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Configuration Writer                                          │
│    - Create backup: .mcp.json.backup.1728001000                 │
│    - Remove dummy override from .mcp.json                        │
│    - Server now inherits from parent (user config)               │
│    - Atomic write                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. User Notification                                             │
│    ✓ Server 'context7' enabled                                  │
│    ⚠️ Restart Claude Code to apply changes                       │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Profile Switch Flow

```
User Action: /profile switch react-dev

┌─────────────────────────────────────────────────────────────────┐
│ 1. Profile Command Handler (commands/profile.md)                │
│    - Parse command: action='switch', profile='react-dev'         │
│    - Validate profile exists                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Profile Manager (core/profile-manager.ts)                    │
│    - Load profile: .claude/profiles/react-dev.json               │
│    - Parse profile configuration:                                │
│      {                                                            │
│        "servers": {                                               │
│          "enabled": ["context7", "magic", "playwright"],         │
│          "disabled": ["sequential-thinking", "database"]         │
│        },                                                         │
│        "memory": { ... },                                        │
│        "agents": { ... }                                         │
│      }                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Configuration Manager                                         │
│    - Load current state from .mcp.json and ~/.claude.json        │
│    - Calculate diff between current and target state             │
│    - Generate operations list:                                   │
│      • Enable: context7, magic, playwright                       │
│      • Disable: sequential-thinking, database                    │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Batch Operation Executor                                      │
│    - Create comprehensive backup                                 │
│    - Apply all blocking operations atomically:                   │
│      For each server in 'disabled':                              │
│        - Create dummy override                                   │
│      For each server in 'enabled':                               │
│        - Remove override (if exists)                             │
│    - Update memory file states (.md.blocked)                     │
│    - Update agent deny patterns (settings.json)                  │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Profile State Persistence                                     │
│    - Save active profile marker:                                 │
│      .claude/active-profile.json:                                │
│      {                                                            │
│        "name": "react-dev",                                       │
│        "activatedAt": "2025-10-12T10:45:00Z"                     │
│      }                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. User Notification                                             │
│    ✓ Profile 'react-dev' applied                                │
│    • Enabled: 3 servers, 1 memory, 1 agent                      │
│    • Disabled: 2 servers, 2 memory, 1 agent                     │
│    ⚠️ Restart Claude Code to apply changes                       │
│    💡 Expected token reduction: ~70,000 tokens (78%)             │
└─────────────────────────────────────────────────────────────────┘
```

## 3. PreToolUse Hook Flow

```
Claude Attempts: mcp__context7__search_docs

┌─────────────────────────────────────────────────────────────────┐
│ 1. Claude Code (Before Tool Execution)                          │
│    - Intercept tool call: mcp__context7__search_docs             │
│    - Trigger PreToolUse hook                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Hook Dispatcher (hooks/pre-tool-use.ts)                      │
│    - Receive JSON input via stdin:                               │
│      {                                                            │
│        "session_id": "abc-123",                                  │
│        "cwd": "/project",                                        │
│        "tool_name": "mcp__context7__search_docs",               │
│        "tool_input": { "query": "react hooks" }                 │
│      }                                                            │
│    - Parse tool name: server='context7'                          │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Configuration Loader                                          │
│    - Read .mcp.json from project directory                       │
│    - Check if server has blocking metadata                       │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Blocking Decision                                             │
│    - Server config found with _mcpToggleBlocked: true            │
│    - Decision: BLOCK                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Response Generation                                           │
│    - Generate JSON output via stdout:                            │
│      {                                                            │
│        "continue": false,                                        │
│        "decision": "block",                                      │
│        "stopReason": "MCP server 'context7' is disabled",       │
│        "systemMessage": "⚠️ Server disabled. Run /toggle..."     │
│      }                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Claude Code (Tool Execution Blocked)                         │
│    - Display system message to user                              │
│    - Do not execute tool                                         │
│    - Suggest remediation: /toggle server context7 on            │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Registry Query Flow

```
Claude Asks: "Help me build a React component"

┌─────────────────────────────────────────────────────────────────┐
│ 1. Claude Code (Prompt Analysis)                                │
│    - Extract keywords: ["build", "react", "component"]           │
│    - Consider available MCP servers                              │
│    - Only registry server loaded (~5k tokens)                    │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Registry MCP Server (registry/server.ts)                     │
│    - Claude calls: registry/suggest                              │
│      {                                                            │
│        "keywords": ["build", "react", "component"]               │
│      }                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Keyword Matcher (registry/keyword-matcher.ts)                │
│    - Load server metadata database                               │
│    - Match keywords against server definitions:                  │
│      • "react" → magic (score: 3)                               │
│      • "component" → magic (score: 2)                            │
│      • "build" → context7 (score: 1)                            │
│    - Rank results by score                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Suggestion Generation                                         │
│    - Return ranked server suggestions:                           │
│      [                                                            │
│        {                                                          │
│          "name": "magic",                                         │
│          "score": 5,                                              │
│          "description": "UI component generation",                │
│          "tokenCost": 5200,                                       │
│          "reason": "Matches: react, component"                    │
│        },                                                         │
│        {                                                          │
│          "name": "context7",                                      │
│          "score": 1,                                              │
│          "description": "Library documentation",                  │
│          "tokenCost": 2800,                                       │
│          "reason": "Matches: build"                               │
│        }                                                          │
│      ]                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Claude Response                                               │
│    - Inform user about suggested servers:                        │
│      "I can help with React components! However, I need the      │
│       'magic' MCP server for component generation.               │
│                                                                   │
│       Run: /toggle server magic on                               │
│       Then restart Claude Code.                                  │
│                                                                   │
│       Expected token cost: ~5,200 tokens"                        │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Migration Flow

```
User Action: /migrate

┌─────────────────────────────────────────────────────────────────┐
│ 1. Migration Command Handler (commands/migrate.md)              │
│    - Check for legacy files:                                     │
│      • .claude/blocked.md (v1 format)                            │
│      • legacy settings.json entries                              │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Migration Engine (core/migration-engine.ts)                  │
│    - Parse legacy blocked.md:                                    │
│      mcp:sequential-thinking                                     │
│      mcp:database                                                │
│      memory:production-notes.md                                  │
│      agent:security-audit                                        │
│    - Categorize items by type                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Conflict Detection                                            │
│    - Check if .mcp.json already exists                           │
│    - Detect conflicting configurations                           │
│    - Prompt user for resolution if needed                        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Backup Creation                                               │
│    - Backup all files being modified:                            │
│      • .claude/blocked.md → blocked.md.backup.1728000000        │
│      • .mcp.json → .mcp.json.backup.1728000000                  │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Configuration Transformation                                  │
│    - For each MCP server entry:                                  │
│      • Create dummy override in .mcp.json                        │
│    - For each memory file entry:                                 │
│      • Rename to .md.blocked                                     │
│    - For each agent entry:                                       │
│      • Add to settings.json deny patterns                        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Verification                                                  │
│    - Validate all generated configurations                       │
│    - Check file permissions and integrity                        │
│    - Run schema validation                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Cleanup & Notification                                        │
│    - Optionally archive legacy file                              │
│    - Generate migration report:                                  │
│      ✓ Migrated 2 MCP servers                                   │
│      ✓ Migrated 1 memory file                                   │
│      ✓ Migrated 1 agent                                         │
│      📝 Backups saved in .claude/backups/                        │
│      ⚠️ Restart Claude Code to apply changes                     │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Session Lifecycle Flow

```
Claude Code Session Start → Work → Session End

┌─────────────────────────────────────────────────────────────────┐
│ Session Start                                                    │
│  1. Claude Code loads plugin                                     │
│  2. Reads .claude-plugin/plugin.json                             │
│  3. Registers commands, hooks, MCP servers                       │
│  4. Triggers sessionStart hook                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ sessionStart Hook (hooks/session-start.ts)                       │
│  - Load active profile (if any)                                  │
│  - Check for pending migrations                                  │
│  - Initialize analytics tracking                                 │
│  - Display welcome message:                                      │
│    ✓ mcp-toggle loaded                                          │
│    ✓ Profile 'react-dev' active                                 │
│    💡 Run /context-stats for optimization tips                   │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Active Session                                                   │
│  - PreToolUse hook monitors all MCP tool calls                   │
│  - User can run /toggle, /profile, /migrate commands             │
│  - Registry MCP server provides suggestions                      │
│  - Analytics track tool usage patterns                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Session End                                                      │
│  - Triggers sessionEnd hook                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ sessionEnd Hook (hooks/session-end.ts)                           │
│  - Save analytics data                                           │
│  - Track session metrics:                                        │
│    • Duration                                                    │
│    • Tools called                                                │
│    • Servers used                                                │
│    • Token consumption estimate                                  │
│  - Display closing message:                                      │
│    ✓ Session saved                                              │
│    💡 Run /context-stats for optimization suggestions            │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Error Handling Flow

```
Error During Configuration Write

┌─────────────────────────────────────────────────────────────────┐
│ 1. Operation Attempted                                           │
│    - User runs: /toggle server filesystem off                    │
│    - Plugin begins configuration write                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Error Occurs                                                  │
│    - File write fails (permission denied, disk full, etc.)       │
│    - Exception caught by error handler                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Rollback Initiated                                            │
│    - Detect backup file exists: .mcp.json.backup.1728000000     │
│    - Restore from backup atomically                              │
│    - Verify restoration succeeded                                │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Error Logging                                                 │
│    - Log to .claude/mcp-toggle-errors.log:                       │
│      {                                                            │
│        "timestamp": "2025-10-12T11:00:00Z",                      │
│        "operation": "blockInheritedServer",                      │
│        "serverName": "filesystem",                               │
│        "error": "EACCES: permission denied",                     │
│        "rolled back": true                                       │
│      }                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. User Notification                                             │
│    ❌ Failed to disable server 'filesystem'                      │
│    Error: Permission denied writing .mcp.json                    │
│    ✓ Configuration restored from backup                          │
│    💡 Suggestion: Check file permissions                         │
│    📝 Details logged to .claude/mcp-toggle-errors.log            │
└─────────────────────────────────────────────────────────────────┘
```

## 8. Token Reduction Impact Flow

```
Before Plugin (Eager Loading):
  MCP Servers: 19 × ~2k = 38,000 tokens
  Agents: 4 × ~5k = 20,000 tokens
  Memory: 10 files = 50,000 tokens
  Total: 108,000 tokens (54% of 200k limit)

                       ↓ Plugin Installation

After Plugin (Minimal Profile):
  Registry Server: 5,000 tokens
  Active Memory: 0 tokens (all blocked)
  Active Agents: 0 tokens (all blocked)
  Total: 5,000 tokens (2.5% of 200k limit)

  Token Reduction: 103,000 tokens (95%)

                       ↓ Profile Switch (react-dev)

After Profile (Selective Loading):
  Registry Server: 5,000 tokens
  context7: 2,800 tokens
  magic: 5,200 tokens
  playwright: 5,800 tokens
  Active Memory: 2 files = 10,000 tokens
  Active Agents: 1 agent = 5,000 tokens
  Total: 33,800 tokens (17% of 200k limit)

  Token Reduction: 74,200 tokens (69%)
```

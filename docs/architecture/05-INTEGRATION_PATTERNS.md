# Integration Patterns
*mcp-toggle Claude Code Plugin*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## 1. Plugin Lifecycle Integration

### 1.1 Installation Flow

```
User Action: /plugin install mcp-toggle

┌─────────────────────────────────────────────────────────────────┐
│ Claude Code Plugin Manager                                       │
│  1. Clone repository from GitHub                                 │
│  2. Validate .claude-plugin/plugin.json                          │
│  3. Check dependencies (Node.js 18+, package.json)               │
│  4. Run npm install for plugin dependencies                      │
│  5. Register plugin components:                                  │
│     - Commands → Add to command registry                         │
│     - Hooks → Add to hook registry                               │
│     - MCP Servers → Add to server registry                       │
│  6. Build plugin (TypeScript compilation)                        │
│  7. Create plugin symlink in ~/.claude/plugins/mcp-toggle        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Plugin Initialization                                            │
│  - Load plugin manifest                                          │
│  - Initialize configuration manager                              │
│  - Detect legacy configurations                                  │
│  - Display welcome message with migration prompt                 │
└─────────────────────────────────────────────────────────────────┘
```

**Post-Installation Checklist:**
- ✓ Plugin commands available (`/toggle`, `/profile`, `/migrate`)
- ✓ Registry MCP server registered (will load on next session)
- ✓ Hooks registered (PreToolUse, sessionStart, sessionEnd)
- ✓ Configuration directory created (`.claude/profiles/`)

---

### 1.2 Enable/Disable Flow

```
Enable Plugin: /plugin enable mcp-toggle

┌─────────────────────────────────────────────────────────────────┐
│ Enable Action                                                    │
│  1. Activate plugin in Claude Code registry                      │
│  2. Load commands into context                                   │
│  3. Activate hooks (PreToolUse enforcement begins)               │
│  4. Start registry MCP server                                    │
│  5. Trigger sessionStart hook                                    │
└─────────────────────────────────────────────────────────────────┘

Disable Plugin: /plugin disable mcp-toggle

┌─────────────────────────────────────────────────────────────────┐
│ Disable Action                                                   │
│  1. Deactivate plugin in Claude Code registry                    │
│  2. Remove commands from context                                 │
│  3. Deactivate hooks (PreToolUse no longer enforces)             │
│  4. Stop registry MCP server                                     │
│  5. Configuration files remain unchanged (safe to re-enable)     │
└─────────────────────────────────────────────────────────────────┘
```

**Important Notes:**
- Disabling plugin does NOT remove blocking configurations
- Blocked servers remain blocked (dummy overrides persist)
- Re-enabling plugin restores full functionality
- Use `/plugin uninstall` to completely remove plugin

---

## 2. Configuration Hierarchy Integration

### 2.1 3-Scope Hierarchy

```
Scope Precedence: Local > Project > User

┌─────────────────────────────────────────────────────────────────┐
│ Scope 1: Local (private) - ~/.claude.json                       │
│  {                                                                │
│    "projects": {                                                  │
│      "/home/user/project": {                                      │
│        "mcpServers": {                                            │
│          "context7": { ... }  ← Highest precedence               │
│        }                                                          │
│      }                                                            │
│    }                                                              │
│  }                                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Scope 2: Project (shared) - /project/.mcp.json                  │
│  {                                                                │
│    "mcpServers": {                                                │
│      "magic": { ... },       ← Medium precedence                 │
│      "playwright": { ... }                                        │
│    }                                                              │
│  }                                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Scope 3: User (global) - ~/.claude.json                         │
│  {                                                                │
│    "mcpServers": {                                                │
│      "sequential-thinking": { ... },  ← Lowest precedence        │
│      "database": { ... }                                          │
│    }                                                              │
│  }                                                                │
└─────────────────────────────────────────────────────────────────┘

Final Loaded Servers:
  - context7 (from local scope)
  - magic (from project scope)
  - playwright (from project scope)
  - sequential-thinking (from user scope)
  - database (from user scope)
```

### 2.2 Blocking Override Integration

```
Blocking Inherited Server (from User Scope)

Before:
  User config (~/.claude.json):
    { "mcpServers": { "sequential-thinking": { command: "npx", ... } } }

  Project config (.mcp.json):
    { "mcpServers": {} }  ← Empty

After /toggle server sequential-thinking off:
  User config (~/.claude.json):
    { "mcpServers": { "sequential-thinking": { command: "npx", ... } } }  ← Unchanged

  Project config (.mcp.json):
    {
      "mcpServers": {
        "sequential-thinking": {              ← Override added
          "command": "echo",
          "args": ["Blocked by mcp-toggle"],
          "_mcpToggleBlocked": true,
          "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
          "_mcpToggleOriginal": { command: "npx", ... }
        }
      }
    }

Result:
  - Claude Code loads project config (higher precedence)
  - Dummy override prevents inherited server from loading
  - Original config preserved in metadata for restoration
```

---

## 3. Hook Integration

### 3.1 Hook Registration

```
Plugin Manifest (.claude-plugin/plugin.json):
  {
    "hooks": "./hooks/hooks.json"
  }

Hook Configuration (hooks/hooks.json):
  {
    "PreToolUse": [
      {
        "matcher": "mcp__.*",               ← Matches all MCP server tools
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-tool-use.js",
            "timeout": 10000
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": ".*",                    ← Matches all sessions
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-end.js"
          }
        ]
      }
    ]
  }
```

### 3.2 Hook Execution Chain

```
Claude Calls MCP Tool: mcp__context7__search_docs

┌─────────────────────────────────────────────────────────────────┐
│ 1. Claude Code Core                                              │
│    - User prompt requires context7 tool                          │
│    - Prepare tool call: mcp__context7__search_docs               │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Hook Dispatcher                                               │
│    - Check registered hooks for matcher: mcp__.*                 │
│    - Found: pre-tool-use.js hook                                 │
│    - Prepare hook input JSON                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. mcp-toggle PreToolUse Hook                                    │
│    - Receive input via stdin                                     │
│    - Parse tool name: server='context7'                          │
│    - Check .mcp.json for blocking metadata                       │
│    - Decision: BLOCK (has _mcpToggleBlocked: true)               │
│    - Output JSON response to stdout                              │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Hook Dispatcher (Response Processing)                        │
│    - Parse hook output: continue=false, decision="block"         │
│    - Extract systemMessage for user display                      │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Claude Code Core (Tool Call Blocked)                         │
│    - Cancel tool execution                                       │
│    - Display systemMessage to user:                              │
│      "⚠️ Server 'context7' is disabled. Run /toggle..."          │
│    - Continue conversation without tool result                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Registry MCP Server Integration

### 4.1 Server Registration

```
Plugin Installation:
  1. Claude Code reads .claude-plugin/plugin.json
  2. Detects mcpServers section:
     {
       "mcp-registry": {
         "command": "node",
         "args": ["${CLAUDE_PLUGIN_ROOT}/registry/server.js"]
       }
     }
  3. Registers server in MCP server registry
  4. Server starts on next Claude Code session

Session Start:
  1. Claude Code initializes all MCP servers
  2. mcp-registry server starts (lightweight, ~5k tokens)
  3. Server loads metadata from registry/metadata.json
  4. Tools registered: registry/list, registry/info, registry/suggest, registry/load
  5. Registry ready for queries
```

### 4.2 Registry Query Flow

```
Claude Processing Prompt: "Build a React component"

┌─────────────────────────────────────────────────────────────────┐
│ 1. Claude Reasoning                                              │
│    - Identify task: UI component creation                        │
│    - Extract keywords: ["build", "react", "component"]           │
│    - Check available tools                                       │
│    - Only registry tools available (other servers blocked)       │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Call Registry Tool                                            │
│    - Tool: registry/suggest                                      │
│    - Input: { keywords: ["build", "react", "component"] }        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Registry MCP Server Processing                                │
│    - Receive tool call                                           │
│    - Load server metadata database                               │
│    - Match keywords against server definitions                   │
│    - Rank servers by relevance score                             │
│    - Return suggestions with metadata                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Claude Response Generation                                    │
│    - Receive registry suggestions                                │
│    - Format user-friendly response:                              │
│      "To build React components, I need the 'magic' server.      │
│       Run: /toggle server magic on                               │
│       Then restart. Token cost: ~5,200 tokens"                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Profile System Integration

### 5.1 Profile Storage Structure

```
Project Directory Structure:

.claude/
├── profiles/                        ← Profile storage
│   ├── minimal.json                 ← Built-in profiles (copied on first use)
│   ├── react-dev.json
│   ├── wordpress.json
│   ├── full-stack.json
│   ├── documentation.json
│   └── my-custom-profile.json       ← User-created profiles
├── active-profile.json              ← Currently active profile marker
├── mcp-toggle-analytics.json        ← Usage analytics
└── mcp-toggle-errors.log            ← Error log
```

### 5.2 Profile Application Flow

```
User Action: /profile switch react-dev

┌─────────────────────────────────────────────────────────────────┐
│ 1. Load Profile Configuration                                    │
│    - Read: .claude/profiles/react-dev.json                       │
│    - Parse and validate profile structure                        │
│    - Check profile version compatibility                         │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Load Current State                                            │
│    - Read .mcp.json (project servers)                            │
│    - Read ~/.claude.json (user servers)                          │
│    - Scan .claude/memories/ (memory files)                       │
│    - Read settings.json (agent deny patterns)                    │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Calculate State Diff                                          │
│    Profile wants:                                                │
│      Servers enabled: [context7, magic, playwright]              │
│      Servers disabled: [sequential-thinking, database]           │
│    Current state:                                                │
│      Enabled: [context7, sequential-thinking]                    │
│      Disabled: [magic, playwright, database]                     │
│    Operations needed:                                            │
│      Enable: [magic, playwright]                                 │
│      Disable: [sequential-thinking]                              │
│      Keep: [context7 (enabled), database (disabled)]             │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Create Comprehensive Backup                                   │
│    - Backup .mcp.json → .mcp.json.backup.1728000000             │
│    - Backup ~/.claude.json → .claude.json.backup.1728000000      │
│    - Backup settings.json → settings.json.backup.1728000000      │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Apply Operations Atomically                                   │
│    For servers to enable:                                        │
│      - Remove dummy overrides from .mcp.json                     │
│    For servers to disable:                                       │
│      - Add dummy overrides to .mcp.json                          │
│    For memory files:                                             │
│      - Rename enabled: .md.blocked → .md                         │
│      - Rename disabled: .md → .md.blocked                        │
│    For agents:                                                   │
│      - Update settings.json deny patterns                        │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Verify Changes                                                │
│    - Validate all configurations (JSON schema)                   │
│    - Check file integrity                                        │
│    - Rollback if any verification fails                          │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Update Active Profile Marker                                  │
│    - Write .claude/active-profile.json:                          │
│      {                                                            │
│        "name": "react-dev",                                       │
│        "activatedAt": "2025-10-12T10:45:00Z",                    │
│        "previousProfile": "minimal"                               │
│      }                                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. User Notification                                             │
│    ✓ Profile 'react-dev' applied successfully                   │
│    • Enabled: 2 servers (magic, playwright)                     │
│    • Disabled: 1 server (sequential-thinking)                   │
│    • Token reduction: 74,200 tokens (69%)                        │
│    ⚠️ Restart Claude Code to apply changes                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Migration Integration

### 6.1 Legacy Format Detection

```
Session Start → Check for Legacy Configuration

┌─────────────────────────────────────────────────────────────────┐
│ sessionStart Hook                                                │
│  1. Check for .claude/blocked.md existence                       │
│  2. If found:                                                    │
│     - Parse legacy format                                        │
│     - Count items (servers, memory, agents)                      │
│     - Display migration prompt:                                  │
│       "⚠️ Legacy configuration detected                          │
│        • 2 MCP servers                                           │
│        • 1 memory file                                           │
│        • 1 agent                                                 │
│        Run /migrate to upgrade to v2.0.0 format"                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Migration Process Integration

```
User Action: /migrate

┌─────────────────────────────────────────────────────────────────┐
│ 1. Pre-Migration Checks                                          │
│    - Verify legacy file exists                                   │
│    - Check if .mcp.json already exists                           │
│    - Detect conflicts (same server names)                        │
│    - Prompt user for conflict resolution                         │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Backup Phase                                                  │
│    - Create timestamped backups:                                 │
│      • .claude/blocked.md.backup.1728000000                      │
│      • .mcp.json.backup.1728000000 (if exists)                   │
│      • settings.json.backup.1728000000                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Transformation Phase                                          │
│    Parse legacy blocked.md:                                      │
│      mcp:sequential-thinking                                     │
│      mcp:database                                                │
│      memory:production-notes.md                                  │
│      agent:security-audit                                        │
│                                                                   │
│    Transform to v2.0.0:                                          │
│      MCP servers → dummy overrides in .mcp.json                  │
│      Memory files → rename to .md.blocked                        │
│      Agents → add to settings.json deny patterns                 │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Verification Phase                                            │
│    - Validate all generated configurations                       │
│    - Ensure file integrity                                       │
│    - Test configuration loading                                  │
│    - Rollback if any validation fails                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Cleanup Phase                                                 │
│    - Optionally archive legacy blocked.md                        │
│    - Move to .claude/legacy-blocked.md.archived                  │
│    - Generate migration report                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Notification                                                  │
│    ✓ Migration completed successfully                           │
│    • Migrated 2 MCP servers                                     │
│    • Migrated 1 memory file                                     │
│    • Migrated 1 agent                                           │
│    📝 Backups saved in .claude/backups/                          │
│    📝 Legacy file archived                                       │
│    ⚠️ Restart Claude Code to apply changes                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CLI Tool Compatibility

### 7.1 Shared Core Library

```
Project Structure:

mcp-toggle/
├── packages/
│   ├── core/                       ← Shared business logic
│   │   ├── src/
│   │   │   ├── config-manager.ts   ← Used by both CLI and plugin
│   │   │   ├── profile-manager.ts
│   │   │   ├── block-state-tracker.ts
│   │   │   └── migration-engine.ts
│   │   └── package.json
│   ├── cli/                        ← CLI tool (existing functionality)
│   │   ├── src/
│   │   │   ├── tui/                ← Terminal UI components
│   │   │   └── cli.ts              ← CLI entry point
│   │   └── package.json
│   └── plugin/                     ← Claude Code plugin (new)
│       ├── .claude-plugin/
│       ├── commands/
│       ├── hooks/
│       ├── registry/
│       └── package.json
└── package.json                    ← Monorepo root
```

### 7.2 Configuration Format Compatibility

Both CLI and plugin use identical configuration formats:

```
Shared Formats:
  - .mcp.json (v2.0.0 server definitions)
  - .claude/profiles/*.json (profile format)
  - .md.blocked (memory file blocking)
  - settings.json deny patterns (agent blocking)

CLI Usage:
  $ mcp-toggle                      # Interactive TUI
  $ mcp-toggle server context7 off  # Direct command

Plugin Usage:
  /toggle                           # Interactive command
  /toggle server context7 off       # Same direct command

Both tools:
  - Use same core library
  - Read/write same configuration files
  - Can be used interchangeably
  - No migration needed between CLI and plugin
```

---

## 8. Team Collaboration Integration

### 8.1 Repository-Level Configuration

```
Team Repository Setup:

project/.claude/
├── settings.json                   ← Repository settings (committed)
│   {
│     "extraKnownMarketplaces": {
│       "company-plugins": {
│         "source": {
│           "source": "github",
│           "repo": "company/claude-plugins"
│         }
│       }
│     }
│   }
├── profiles/                       ← Team profiles (committed)
│   ├── backend-dev.json
│   ├── frontend-dev.json
│   └── qa-testing.json
└── blocked.md                      ← Optional: default blocking (committed)

Benefits:
  - Team members inherit marketplace configuration
  - Shared profiles for consistent workflows
  - Optional default blocking for resource-constrained environments
  - Version controlled team standards
```

### 8.2 Personal Overrides

```
User-Level Customization:

~/.claude.json                      ← Personal configuration (not committed)
  {
    "projects": {
      "/home/user/team-project": {
        "mcpServers": {
          "my-custom-server": { ... }  ← Personal server
        }
      }
    }
  }

Result:
  - Team configuration from repository
  - Personal overrides from ~/.claude.json
  - Personal overrides take precedence (scope 1)
  - No conflicts with team settings
```

---

## 9. Analytics Integration

### 9.1 Usage Tracking

```
Analytics Data Structure (.claude/mcp-toggle-analytics.json):

{
  "version": "2.0.0",
  "projectId": "hashed-project-path",
  "sessions": [
    {
      "id": "abc-123",
      "startedAt": "2025-10-12T10:00:00Z",
      "endedAt": "2025-10-12T12:30:00Z",
      "duration": 9000,
      "profile": "react-dev",
      "serversUsed": ["context7", "magic"],
      "toolsCalled": {
        "mcp__context7__search_docs": 5,
        "mcp__magic__create_component": 3
      },
      "estimatedTokens": 33800
    }
  ],
  "totalSessions": 42,
  "averageTokenUsage": 35000,
  "mostUsedProfile": "react-dev",
  "serverUsageFrequency": {
    "context7": 38,
    "magic": 32,
    "playwright": 15
  }
}
```

### 9.2 Optimization Suggestions

```
/context-stats --suggest

Analytics Engine:
  1. Load analytics data
  2. Calculate token usage patterns
  3. Identify unused servers (frequency = 0)
  4. Suggest profile optimizations
  5. Estimate token savings

Output:
  Current Token Usage: 82,450 / 200,000 (41%)

  Optimization Opportunities:

  1. Disable 3 unused servers → Save 19,000 tokens (23%)
     Servers: database, cloud-storage, monitoring
     Last used: Never

  2. Switch to 'react-dev' profile → Save 48,650 tokens (59%)
     Based on usage: 80% of tool calls use context7, magic

  3. Block 2 unused agents → Save 10,000 tokens (12%)
     Agents: security-audit, performance-analyzer
     Last used: > 30 days ago

  Recommended Action:
  /profile switch react-dev
```

---

## 10. Error Recovery Integration

### 10.1 Atomic Operations with Rollback

```
Operation: Apply Profile

┌─────────────────────────────────────────────────────────────────┐
│ 1. Create Transaction                                            │
│    - Generate transaction ID: tx-1728000000                      │
│    - Create backup directory: .claude/backups/tx-1728000000/     │
│    - Backup all files to be modified                             │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Execute Operations                                            │
│    try {                                                         │
│      - Update .mcp.json                                          │
│      - Rename memory files                                       │
│      - Update settings.json                                      │
│      - Write active-profile.json                                 │
│    } catch (error) {                                             │
│      → Proceed to rollback                                       │
│    }                                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Verification                                                  │
│    - Validate all modified files                                 │
│    - Check configuration integrity                               │
│    - Test configuration loading                                  │
│    If any validation fails → Proceed to rollback                 │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Commit or Rollback                                            │
│    if (all validations pass) {                                   │
│      - Delete backup directory                                   │
│      - Log success to analytics                                  │
│      - Return success result                                     │
│    } else {                                                      │
│      - Restore all files from backup                             │
│      - Log error with details                                    │
│      - Return error result with recovery info                    │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Graceful Degradation

```
Scenario: Registry MCP Server Fails to Start

┌─────────────────────────────────────────────────────────────────┐
│ Session Start                                                    │
│  - Claude Code attempts to start all MCP servers                 │
│  - mcp-registry fails (port conflict, permission issue, etc.)    │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ sessionStart Hook Detection                                      │
│  - Detect registry server is not running                         │
│  - Check if other servers are available                          │
│  - Determine degraded mode capabilities                          │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Degraded Mode Notification                                       │
│  ⚠️ mcp-toggle running in degraded mode                          │
│  - Registry server unavailable                                   │
│  - Server suggestions disabled                                   │
│  - /toggle and /profile commands still available                 │
│  - PreToolUse hook enforcement active                            │
│  💡 Try restarting Claude Code or check logs                     │
└─────────────────────────────────────────────────────────────────┘

User Impact:
  - Can still toggle servers manually
  - Can still apply profiles
  - No automatic server suggestions
  - All other functionality preserved
```

---

## Summary

The mcp-toggle plugin integrates deeply with Claude Code through:

1. **Plugin Lifecycle**: Installation, enable/disable, updates
2. **Configuration Hierarchy**: 3-scope precedence with override mechanism
3. **Hooks**: PreToolUse enforcement, session lifecycle management
4. **Registry**: Lightweight MCP server for suggestions
5. **Profiles**: Workflow-based configuration management
6. **Migration**: Seamless v1 → v2 transformation
7. **CLI Compatibility**: Shared core library, identical formats
8. **Team Collaboration**: Repository settings, shared profiles
9. **Analytics**: Usage tracking and optimization suggestions
10. **Error Recovery**: Atomic operations with rollback capability

All integration points are designed for:
- **Safety**: Backups, rollback, validation
- **Performance**: <100ms plugin load, <50ms hook execution
- **Compatibility**: Works with existing CLI tool
- **Team-Friendly**: Repository-level configuration sharing
- **User-Friendly**: Clear notifications, helpful error messages

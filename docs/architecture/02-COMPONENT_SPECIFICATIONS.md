# Component Specifications
*mcp-toggle Claude Code Plugin*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## 1. Plugin Structure

### 1.1 Directory Layout

```
mcp-toggle/
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest
├── commands/                        # Slash commands
│   ├── toggle.md                   # /toggle server/memory/agent
│   ├── profile.md                  # /profile management
│   ├── migrate.md                  # /migrate legacy → v2
│   └── context-stats.md            # /context-stats monitoring
├── hooks/                           # Event handlers
│   ├── hooks.json                  # Hook configuration
│   ├── pre-tool-use.ts             # PreToolUse handler
│   ├── session-start.ts            # sessionStart handler
│   └── session-end.ts              # sessionEnd handler
├── registry/                        # Registry MCP server
│   ├── server.ts                   # Main server implementation
│   ├── keyword-matcher.ts          # Keyword detection engine
│   ├── schema.ts                   # Registry tool schemas
│   └── metadata.json               # Server metadata database
├── core/                            # Shared business logic
│   ├── config-manager.ts           # Configuration CRUD
│   ├── profile-manager.ts          # Profile operations
│   ├── block-state-tracker.ts      # Blocking state
│   ├── migration-engine.ts         # Legacy migration
│   └── analytics.ts                # Usage tracking
├── lib/                             # Reusable utilities
│   ├── file-utils.ts               # File operations
│   ├── json-parser.ts              # Safe JSON parsing
│   ├── token-estimator.ts          # Token counting
│   └── validation.ts               # Input validation
├── types/                           # TypeScript definitions
│   ├── plugin.d.ts                 # Plugin types
│   ├── hook.d.ts                   # Hook types
│   └── config.d.ts                 # Configuration types
├── schemas/                         # JSON schemas
│   ├── plugin-manifest.schema.json
│   ├── profile.schema.json
│   └── registry-metadata.schema.json
├── tests/                           # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                            # Documentation
│   ├── architecture/
│   ├── user-guide/
│   └── developer/
├── .mcp.json                        # Plugin's MCP server config
├── package.json                     # Node.js dependencies
├── tsconfig.json                    # TypeScript configuration
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### 1.2 Plugin Manifest (`.claude-plugin/plugin.json`)

```json
{
  "name": "mcp-toggle",
  "version": "2.0.0",
  "description": "Manage MCP servers, memory files, and agents with lazy loading support",
  "author": {
    "name": "MCP Toggle Contributors",
    "email": "[email protected]",
    "url": "https://github.com/machjesusmoto"
  },
  "homepage": "https://github.com/machjesusmoto/mcp-toggle#readme",
  "repository": "https://github.com/machjesusmoto/mcp-toggle",
  "license": "MIT",
  "keywords": [
    "mcp",
    "lazy-loading",
    "context-optimization",
    "memory-management",
    "agent-management"
  ],
  "commands": [
    "./commands/toggle.md",
    "./commands/profile.md",
    "./commands/migrate.md",
    "./commands/context-stats.md"
  ],
  "hooks": "./hooks/hooks.json",
  "mcpServers": {
    "mcp-registry": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/registry/server.js"]
    }
  }
}
```

## 2. Core Components

### 2.1 Command Handlers

#### /toggle Command
**Purpose**: Interactive server/memory/agent blocking interface

**Implementation**: `commands/toggle.md`
```markdown
---
description: Toggle MCP servers, memory files, and agents on/off
---

# /toggle - MCP Toggle Control

## Usage
```bash
/toggle                          # Interactive menu
/toggle server <name> [on|off]   # Toggle specific server
/toggle memory <name> [on|off]   # Toggle memory file
/toggle agent <name> [on|off]    # Toggle agent
/toggle list                     # Show all blocked items
```

## Behavior
1. Read current configuration from .mcp.json and ~/.claude.json
2. Display interactive selection interface (TUI)
3. Apply blocking changes:
   - **Local servers**: Remove from .mcp.json
   - **Inherited servers**: Add dummy override to .mcp.json
   - **Memory files**: Rename to .md.blocked
   - **Agents**: Add to settings.json deny patterns
4. Notify user: "⚠️ Restart Claude Code to apply changes"
5. Log operation to .claude/mcp-toggle.log

## Examples
# Disable filesystem server
/toggle server filesystem off
# Result: Adds dummy override to .mcp.json

# Enable memory server
/toggle server memory on
# Result: Removes override from .mcp.json

# Block coding standards memory
/toggle memory coding-standards off
# Result: Renames to .claude/memories/coding-standards.md.blocked
```

#### /profile Command
**Purpose**: Workflow-based configuration management

**Implementation**: `commands/profile.md`
```markdown
---
description: Switch between configuration profiles
---

# /profile - Profile Management

## Usage
```bash
/profile                         # List available profiles
/profile switch <name>           # Apply profile
/profile create <name>           # Create new profile
/profile edit <name>             # Modify profile
/profile delete <name>           # Remove profile
```

## Profile Format
Profiles stored in `.claude/profiles/<name>.json`:

```json
{
  "name": "react-dev",
  "description": "React development workflow",
  "servers": {
    "enabled": ["context7", "magic", "playwright"],
    "disabled": ["database", "cloud-storage"]
  },
  "memory": {
    "enabled": ["coding-standards.md"],
    "disabled": ["production-notes.md"]
  },
  "agents": {
    "enabled": ["frontend-developer"],
    "disabled": ["security-audit"]
  }
}
```

## Built-in Profiles
- `minimal`: Only registry server (~5k tokens)
- `react-dev`: React development (context7, magic, playwright)
- `wordpress`: WordPress development (context7, filesystem)
- `full-stack`: Full development environment
- `documentation`: Writing and documentation workflow
```

#### /migrate Command
**Purpose**: Migrate v1 CLI format to v2 plugin format

**Implementation**: `commands/migrate.md`
```markdown
---
description: Migrate legacy configurations to plugin format
---

# /migrate - Configuration Migration

## Usage
```bash
/migrate                         # Auto-detect and migrate
/migrate --dry-run               # Preview changes
/migrate --force                 # Overwrite existing
```

## Migration Process
1. **Detection**: Check for legacy .claude/blocked.md
2. **Analysis**: Parse legacy format and validate
3. **Backup**: Create timestamped backup
4. **Conversion**: Transform to .mcp.json format
5. **Verification**: Validate migrated configuration
6. **Cleanup**: Optionally remove legacy file

## Legacy Format Support
- `.claude/blocked.md` (v1.x)
- `mcp:server-name` → dummy override
- `memory:file.md` → .md.blocked rename
- `agent:agent-name` → deny pattern
```

#### /context-stats Command
**Purpose**: Monitor token usage and suggest optimizations

**Implementation**: `commands/context-stats.md`
```markdown
---
description: Monitor context token usage and optimization opportunities
---

# /context-stats - Context Monitoring

## Usage
```bash
/context-stats                   # Show current usage
/context-stats --suggest         # Get optimization suggestions
```

## Output
```
Context Usage Report
─────────────────────
Total Tokens: 82,450 / 200,000 (41%)

By Category:
  MCP Servers:    38,000 tokens (19 servers)
  Memory Files:   12,000 tokens (8 files)
  Agents:         20,000 tokens (4 agents)
  System Prompts: 12,450 tokens

Top Token Consumers:
  1. sequential-thinking     8,500 tokens
  2. context7                6,200 tokens
  3. playwright              5,800 tokens

Optimization Suggestions:
  ✓ Switch to 'minimal' profile → Save 76,000 tokens (93%)
  ✓ Disable unused agents → Save 15,000 tokens
  ✓ Block 3 unused servers → Save 19,000 tokens
```
```

### 2.2 Hook Implementations

#### PreToolUse Hook
**Purpose**: Enforce blocking rules and provide user feedback

**Implementation**: `hooks/pre-tool-use.ts`
```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface HookOutput {
  continue: boolean;
  decision?: 'approve' | 'block';
  stopReason?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
}

export async function preToolUse(input: HookInput): Promise<HookOutput> {
  const { tool_name, cwd } = input;

  // Only handle MCP server tools
  if (!tool_name.startsWith('mcp__')) {
    return { continue: true };
  }

  // Extract server name from tool (format: mcp__<server>__<tool>)
  const parts = tool_name.split('__');
  if (parts.length < 2) {
    return { continue: true };
  }
  const serverName = parts[1];

  // Check if server is blocked
  const mcpJsonPath = path.join(cwd, '.mcp.json');
  if (await fs.pathExists(mcpJsonPath)) {
    const config = await fs.readJson(mcpJsonPath);
    const serverConfig = config.mcpServers?.[serverName];

    // Check for blocking metadata
    if (serverConfig?._mcpToggleBlocked === true) {
      return {
        continue: false,
        decision: 'block',
        stopReason: `MCP server '${serverName}' is currently disabled.`,
        systemMessage: `⚠️ MCP server '${serverName}' is disabled. Run /toggle server ${serverName} on to enable it.`,
      };
    }
  }

  // Server not blocked, allow execution
  return { continue: true };
}

// Main hook entry point
(async () => {
  try {
    const input: HookInput = JSON.parse(await readStdin());
    const output = await preToolUse(input);
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    console.error('PreToolUse hook error:', error);
    process.exit(1);
  }
})();

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
```

#### sessionStart Hook
**Purpose**: Load active profile and validate configuration

**Implementation**: `hooks/session-start.ts`
```typescript
interface SessionStartInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'SessionStart';
}

interface SessionStartOutput {
  systemMessage?: string;
}

export async function sessionStart(input: SessionStartInput): Promise<SessionStartOutput> {
  const { cwd } = input;

  // Load active profile (if any)
  const profilePath = path.join(cwd, '.claude', 'active-profile.json');
  if (await fs.pathExists(profilePath)) {
    const profile = await fs.readJson(profilePath);
    return {
      systemMessage: `✓ Profile '${profile.name}' loaded (${profile.description})`,
    };
  }

  // Check for pending migrations
  const legacyPath = path.join(cwd, '.claude', 'blocked.md');
  if (await fs.pathExists(legacyPath)) {
    return {
      systemMessage: '⚠️ Legacy configuration detected. Run /migrate to upgrade.',
    };
  }

  return {};
}
```

#### sessionEnd Hook
**Purpose**: Save analytics and suggest optimizations

**Implementation**: `hooks/session-end.ts`
```typescript
interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'SessionEnd';
}

interface SessionEndOutput {
  systemMessage?: string;
}

export async function sessionEnd(input: SessionEndInput): Promise<SessionEndOutput> {
  const { session_id, cwd } = input;

  // Track session in analytics
  const analyticsPath = path.join(cwd, '.claude', 'mcp-toggle-analytics.json');
  const analytics = (await fs.pathExists(analyticsPath))
    ? await fs.readJson(analyticsPath)
    : { sessions: [] };

  analytics.sessions.push({
    id: session_id,
    endedAt: new Date().toISOString(),
  });

  await fs.writeJson(analyticsPath, analytics, { spaces: 2 });

  return {
    systemMessage: '✓ Session saved. Run /context-stats for optimization suggestions.',
  };
}
```

### 2.3 Registry MCP Server

#### Server Architecture
**Purpose**: Lightweight keyword-based server discovery

**Token Budget**: ~5k tokens (95% reduction from eager loading)

**Implementation**: `registry/server.ts`
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadServerMetadata, matchKeywords } from './keyword-matcher.js';

// Registry tool schemas (~5k tokens total)
const REGISTRY_TOOLS = {
  'registry/list': {
    description: 'List all available MCP servers with metadata',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filter by keyword' },
      },
    },
  },
  'registry/info': {
    description: 'Get detailed information about a specific server',
    inputSchema: {
      type: 'object',
      properties: {
        serverName: { type: 'string', description: 'Server name' },
      },
      required: ['serverName'],
    },
  },
  'registry/suggest': {
    description: 'Suggest servers based on keywords in prompt',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' } },
      },
      required: ['keywords'],
    },
  },
  'registry/load': {
    description: 'Request server activation (requires restart)',
    inputSchema: {
      type: 'object',
      properties: {
        serverName: { type: 'string', description: 'Server to activate' },
      },
      required: ['serverName'],
    },
  },
};

const server = new Server(
  {
    name: 'mcp-registry',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler('tools/list', async () => {
  return {
    tools: Object.entries(REGISTRY_TOOLS).map(([name, schema]) => ({
      name,
      description: schema.description,
      inputSchema: schema.inputSchema,
    })),
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'registry/list':
      return await handleList(args);
    case 'registry/info':
      return await handleInfo(args);
    case 'registry/suggest':
      return await handleSuggest(args);
    case 'registry/load':
      return await handleLoad(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### Keyword Matcher
**Purpose**: Intelligent server suggestion based on prompt analysis

**Implementation**: `registry/keyword-matcher.ts`
```typescript
interface ServerMetadata {
  name: string;
  keywords: string[];
  description: string;
  tokenCost: number;
  dependencies?: string[];
  category: string;
}

// Server metadata database (loaded from registry/metadata.json)
const SERVER_DATABASE: Record<string, ServerMetadata> = {
  'context7': {
    name: 'context7',
    keywords: ['documentation', 'library', 'api', 'reference', 'docs'],
    description: 'Official library documentation lookup',
    tokenCost: 2800,
    category: 'documentation',
  },
  'sequential-thinking': {
    name: 'sequential-thinking',
    keywords: ['analysis', 'debug', 'investigate', 'complex', 'reasoning'],
    description: 'Multi-step reasoning for complex problems',
    tokenCost: 8500,
    category: 'analysis',
  },
  'magic': {
    name: 'magic',
    keywords: ['ui', 'component', 'react', 'vue', 'frontend', 'interface'],
    description: 'UI component generation',
    tokenCost: 5200,
    category: 'development',
  },
  'playwright': {
    name: 'playwright',
    keywords: ['test', 'e2e', 'browser', 'automation', 'testing'],
    description: 'Browser automation and E2E testing',
    tokenCost: 5800,
    category: 'testing',
  },
  // ... more servers
};

export function matchKeywords(keywords: string[]): ServerMetadata[] {
  const matches = new Map<string, number>();

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [serverName, metadata] of Object.entries(SERVER_DATABASE)) {
      const score = metadata.keywords.filter((k) => k.includes(lowerKeyword)).length;
      if (score > 0) {
        matches.set(serverName, (matches.get(serverName) || 0) + score);
      }
    }
  }

  // Sort by match score
  return Array.from(matches.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => SERVER_DATABASE[name]);
}

export async function loadServerMetadata(): Promise<Record<string, ServerMetadata>> {
  // Load from metadata.json (generated during build)
  const metadataPath = path.join(__dirname, 'metadata.json');
  return await fs.readJson(metadataPath);
}
```

## 3. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Plugin load time | < 100ms | Session start |
| Command response | < 200ms | User input → feedback |
| Hook execution | < 50ms | Tool call interception |
| Registry query | < 10ms | Keyword matching |
| Token reduction | 78-95% | Context usage |

## 4. Security Considerations

### 4.1 Input Validation
- All user inputs sanitized before file operations
- Server names validated against pattern: `/^[a-zA-Z0-9_-]+$/`
- File paths validated as absolute paths within project
- JSON configurations schema-validated before writing

### 4.2 File Operations
- Atomic writes with backup/rollback capability
- File permissions preserved during modifications
- Temporary files cleaned up on error
- No arbitrary code execution from configurations

### 4.3 Hook Security
- Hooks execute with user permissions (sandboxed)
- No network access from hooks
- Timeout enforcement (60 seconds max)
- Error messages sanitized (no sensitive data leakage)

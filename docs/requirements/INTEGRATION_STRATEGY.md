# Integration Strategy: mcp-toggle + voicetreelab/lazy-mcp
*Collaborative Integration Plan*
*Date: October 12, 2025*
*Status: Draft*

## Executive Summary

This document defines the integration strategy for combining mcp-toggle's comprehensive context management capabilities with voicetreelab/lazy-mcp's MCP server lazy loading proxy. Rather than duplicating effort, we leverage lazy-mcp's proven registry pattern for MCP servers while focusing mcp-toggle on its unique value: memory files, agents, profiles, and user-friendly management.

**Key Decision**: **Integrate, Don't Duplicate**

**Value Proposition**:
> mcp-toggle provides complete Claude Code context management (servers + memory + agents + profiles) powered by voicetreelab/lazy-mcp for MCP server lazy loading.

## 1. Strategic Rationale

### 1.1 Why Integrate?

**lazy-mcp Strengths**:
- ✅ Production-ready Go implementation
- ✅ Works TODAY (no Claude Code changes needed)
- ✅ True runtime lazy loading (95% context reduction)
- ✅ Proven proxy pattern with 2 meta-tools
- ✅ Docker deployment available
- ✅ Active maintenance (forked from TBXark/mcp-proxy)

**mcp-toggle Strengths**:
- ✅ Manages ALL context types (servers + memory + agents)
- ✅ User-friendly TUI and slash commands
- ✅ Workflow profile system
- ✅ Team collaboration features
- ✅ Native Claude Code plugin integration
- ✅ Comprehensive token estimation

**Integration Benefits**:
1. **No Wasted Effort**: Use existing, working solution for server lazy loading
2. **Focus on Unique Value**: Memory, agents, profiles are our differentiators
3. **Better Together**: Combined solution more powerful than either alone
4. **Community Leverage**: Benefit from lazy-mcp improvements upstream
5. **User Simplicity**: One tool configures everything

### 1.2 Overlap Analysis

**Shared Responsibility**: MCP Server Lazy Loading
- **lazy-mcp Handles**: Runtime proxy, tool routing, server lifecycle
- **mcp-toggle Handles**: User-facing management, configuration generation, profiles

**No Overlap**: Memory Files, Agents, Profiles
- **lazy-mcp**: Doesn't manage these
- **mcp-toggle**: Exclusive responsibility

**Minimal Overlap**: Configuration Management
- **lazy-mcp**: Requires configuration file for server hierarchy
- **mcp-toggle**: Can generate and validate this configuration

## 2. Integration Architecture

### 2.1 System Diagram

```
┌────────────────────────────────────────────────────────────┐
│                      Claude Code                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              mcp-toggle Plugin                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │  │
│  │  │  Commands  │  │   Hooks    │  │   Profiles    │  │  │
│  │  │  /toggle   │  │PreToolUse  │  │  Management   │  │  │
│  │  │  /profile  │  │SessionHooks│  │               │  │  │
│  │  └─────┬──────┘  └──────┬─────┘  └───────┬───────┘  │  │
│  │        │                │                 │          │  │
│  │        └────────┬───────┴────────┬────────┘          │  │
│  │                 ▼                ▼                    │  │
│  │        ┌────────────────────────────────┐            │  │
│  │        │   Configuration Manager        │            │  │
│  │        │  - Memory file blocking        │            │  │
│  │        │  - Agent blocking              │            │  │
│  │        │  - lazy-mcp config generation  │            │  │
│  │        └────────┬───────────────────────┘            │  │
│  └─────────────────┼───────────────────────────────────┘  │
│                    │                                       │
│                    ▼                                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           MCP Server: lazy-mcp                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Meta-Tools (2 tools exposed to Claude):      │ │  │
│  │  │  • get_tools_in_category(category)            │ │  │
│  │  │  • execute_tool(path, params)                 │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Server Registry (loaded on demand):          │ │  │
│  │  │  coding_tools/                                 │ │  │
│  │  │    serena/           (loads @serena/mcp)       │ │  │
│  │  │    copilot/          (loads @copilot/mcp)      │ │  │
│  │  │  database_tools/                               │ │  │
│  │  │    postgres/         (loads @postgres/mcp)     │ │  │
│  │  │  cloud_tools/                                  │ │  │
│  │  │    aws/              (loads @aws/mcp)          │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

User Flow:
1. User runs /toggle or /profile command
2. mcp-toggle updates configurations:
   - Memory/agents → settings.json permissions.deny
   - lazy-mcp config → ~/.claude/lazy-mcp-config.json
3. User restarts Claude Code
4. lazy-mcp proxy loads with minimal context (2 tools)
5. On MCP tool use, lazy-mcp loads actual server on demand
```

### 2.2 Component Responsibilities

#### mcp-toggle Plugin

**Primary Responsibilities**:
1. **Memory File Management**
   - Enumerate .md files from project and user scopes
   - Block/unblock via settings.json permissions.deny
   - Token estimation and context analysis

2. **Agent Management**
   - Enumerate agents from project and user directories
   - Parse frontmatter metadata
   - Block/unblock via settings.json permissions.deny

3. **Profile Management**
   - Store workflow-based configurations
   - Apply profiles atomically
   - Preview profile changes

4. **lazy-mcp Configuration**
   - Generate lazy-mcp configuration files
   - Validate lazy-mcp setup
   - Migrate existing MCP servers to lazy-mcp hierarchy
   - Provide configuration templates

5. **User Interface**
   - Slash commands (/toggle, /profile, /migrate, /context-stats)
   - Helpful error messages
   - User confirmations and previews

#### lazy-mcp (voicetreelab)

**Primary Responsibilities**:
1. **MCP Server Proxy**
   - Intercept tool calls
   - Route to appropriate servers
   - Lazy load servers on demand

2. **Server Lifecycle**
   - Start servers when needed
   - Manage server processes
   - Handle errors and timeouts

3. **Registry Management**
   - Hierarchical tool organization
   - Category-based server grouping
   - Tool metadata and discovery

**Not Responsible For**:
- Memory file management
- Agent management
- Profile system
- User-facing CLI/TUI
- Configuration generation UI

## 3. Integration Points

### 3.1 Configuration Files

#### 3.1.1 User Global Configuration (~/.claude.json)

**Purpose**: Enable lazy-mcp as MCP server

**Content**:
```json
{
  "mcpServers": {
    "lazy-mcp": {
      "command": "npx",
      "args": ["-y", "@voicetreelab/lazy-mcp"],
      "env": {
        "LAZY_MCP_CONFIG": "${HOME}/.claude/lazy-mcp-config.json"
      }
    }
  },
  "permissions": {
    "deny": [
      "memory:**/archive/*.md",
      "agent:**/deprecated/*"
    ]
  }
}
```

**mcp-toggle Actions**:
- Validates lazy-mcp server configuration exists
- Never modifies lazy-mcp server definition
- Updates permissions.deny for memory/agents only

#### 3.1.2 lazy-mcp Configuration (~/.claude/lazy-mcp-config.json)

**Purpose**: Define MCP server hierarchy for lazy loading

**Content**:
```json
{
  "tools": {
    "coding_tools": {
      "description": "Code analysis and development",
      "tools": {
        "serena": {
          "description": "Semantic code analysis",
          "server": "serena",
          "config": {
            "command": "npx",
            "args": ["-y", "@serena/mcp-server"]
          }
        },
        "copilot": {
          "description": "AI pair programming",
          "server": "copilot",
          "config": {
            "command": "github-copilot-cli",
            "args": ["mcp"]
          }
        }
      }
    },
    "database_tools": {
      "description": "Database operations",
      "tools": {
        "postgres": {
          "description": "PostgreSQL database tools",
          "server": "postgres-mcp",
          "config": {
            "command": "npx",
            "args": ["-y", "@postgres/mcp-server"],
            "env": {
              "DATABASE_URL": "${DATABASE_URL}"
            }
          }
        }
      }
    }
  }
}
```

**mcp-toggle Actions**:
- Generates initial configuration from detected MCP servers
- Provides templates for common server hierarchies
- Validates configuration syntax
- Suggests optimal categorization

#### 3.1.3 Project Configuration (.mcp.json)

**Purpose**: Project-specific overrides (not used with lazy-mcp)

**Content**:
```json
{
  "mcpServers": {}
}
```

**mcp-toggle Actions**:
- Detects when lazy-mcp is in use
- Warns if project tries to define MCP servers (conflicts with lazy-mcp)
- Suggests migrating project servers to lazy-mcp config instead

#### 3.1.4 mcp-toggle Profile (.claude/profiles/development.json)

**Purpose**: Workflow-based context configuration

**Content**:
```json
{
  "name": "development",
  "description": "Minimal context for focused development",
  "lazy_mcp": {
    "enabled_categories": ["coding_tools"],
    "disabled_servers": ["database_tools.postgres"]
  },
  "blocked": {
    "memories": ["archive/*.md", "production-notes.md"],
    "agents": ["security-audit", "performance-optimizer"]
  },
  "metadata": {
    "createdAt": "2025-10-12T00:00:00Z",
    "author": "team",
    "tags": ["development", "minimal"]
  }
}
```

**mcp-toggle Actions**:
- Stores profiles in `.claude/profiles/`
- Applies profile by updating:
  - lazy-mcp config (server enablement)
  - settings.json permissions.deny (memory/agents)
- Provides diff preview before applying

### 3.2 User Workflows

#### 3.2.1 Initial Setup (New User)

**Step 1: Install mcp-toggle Plugin**
```bash
/plugin marketplace add machjesusmoto/claude-plugins
/plugin install mcp-toggle
/plugin enable mcp-toggle
```

**Step 2: Configure lazy-mcp (via mcp-toggle)**
```bash
/toggle setup-lazy-mcp
```

This command:
1. Detects existing MCP servers from `~/.claude.json`
2. Generates lazy-mcp configuration with suggested hierarchy
3. Prompts user to review and confirm
4. Updates `~/.claude.json` to use lazy-mcp
5. Creates `~/.claude/lazy-mcp-config.json`
6. Instructs user to restart Claude Code

**Step 3: Verify Setup**
```bash
/context-stats
```

Expected output:
```
✅ lazy-mcp: Active (2 meta-tools loaded)
📊 Available Servers: 12 (0 currently loaded)
📝 Memory Files: 8 active, 2 blocked
👥 Agents: 12 available (7 project, 5 user)
📈 Estimated Context: ~5KB (vs ~108KB without lazy-mcp)
💡 Context Reduction: 95%
```

#### 3.2.2 Blocking a Server (via lazy-mcp Config)

**User Action**:
```bash
/toggle server postgres off
```

**mcp-toggle Behavior**:
1. Reads `~/.claude/lazy-mcp-config.json`
2. Locates `database_tools.postgres` server
3. Comments out or removes server from config
4. Writes updated config
5. Notifies user: "⚠️ Restart Claude Code to apply changes"

**Alternative**: Profile-based blocking
```bash
/profile load no-database
```

Where `no-database.json` profile specifies:
```json
{
  "lazy_mcp": {
    "disabled_servers": ["database_tools.*"]
  }
}
```

#### 3.2.3 Adding a New Server (via mcp-toggle Helper)

**User Action**:
```bash
/toggle add-server
```

**Interactive Prompts**:
```
Server name: github-mcp
Category: coding_tools | database_tools | cloud_tools | [new category]
> coding_tools

Command: npx
Arguments: -y @github/mcp-server
Environment variables (optional):
> GITHUB_TOKEN=${GITHUB_TOKEN}

Description: GitHub repository and issue management
```

**mcp-toggle Behavior**:
1. Validates inputs
2. Generates server configuration
3. Updates `~/.claude/lazy-mcp-config.json`
4. Confirms addition with user
5. Suggests restarting Claude Code

#### 3.2.4 Migrating Existing Setup to lazy-mcp

**User Action**:
```bash
/migrate to-lazy-mcp
```

**Migration Flow**:
1. **Detection**: Scan `~/.claude.json` for `mcpServers`
2. **Analysis**: Categorize servers by purpose (coding, database, cloud, etc.)
3. **Preview**: Show proposed lazy-mcp hierarchy
4. **Confirmation**: User approves or adjusts categorization
5. **Backup**: Create backup of original config
6. **Migration**:
   - Generate `~/.claude/lazy-mcp-config.json`
   - Update `~/.claude.json` to use lazy-mcp proxy
   - Remove old mcpServers definitions (backed up)
7. **Verification**: Validate migrated configuration
8. **Report**: Show migration summary and next steps

**Example Migration**:
```
📊 Migration Plan
─────────────────────────────────────────────────────

Before:
  ~/.claude.json: 12 MCP servers defined
  Estimated context: ~108KB

After:
  lazy-mcp proxy: 2 meta-tools (~5KB)
  Server registry: 12 servers (lazy loaded)

Proposed Hierarchy:
  coding_tools/
    ├── serena (semantic analysis)
    ├── copilot (AI assistance)
    └── prettier (code formatting)

  database_tools/
    ├── postgres (PostgreSQL)
    └── mongodb (MongoDB)

  cloud_tools/
    ├── aws (AWS operations)
    └── gcp (Google Cloud)

⚠️ This will modify ~/.claude.json and create ~/.claude/lazy-mcp-config.json
✅ Backup will be created at ~/.claude.json.backup.1728720000

Proceed with migration? [y/N]
```

### 3.3 Error Handling

#### 3.3.1 lazy-mcp Not Installed

**Detection**: `/context-stats` or `/toggle` command checks for lazy-mcp

**Error Message**:
```
❌ lazy-mcp is not configured

mcp-toggle requires voicetreelab/lazy-mcp for MCP server management.

To set up:
  1. Run: /toggle setup-lazy-mcp
  2. Restart Claude Code

Or install manually:
  https://github.com/voicetreelab/lazy-mcp#installation
```

#### 3.3.2 Invalid lazy-mcp Configuration

**Detection**: Validation fails when reading config

**Error Message**:
```
❌ Invalid lazy-mcp configuration

File: ~/.claude/lazy-mcp-config.json
Error: Invalid JSON syntax at line 15

To fix:
  1. Edit ~/.claude/lazy-mcp-config.json
  2. Or run: /toggle setup-lazy-mcp --reset

Documentation: https://github.com/voicetreelab/lazy-mcp#configuration
```

#### 3.3.3 Conflicting Configuration

**Detection**: User has both lazy-mcp and direct MCP servers

**Warning Message**:
```
⚠️ Configuration conflict detected

You have both:
  • lazy-mcp proxy configured in ~/.claude.json
  • Direct MCP servers: filesystem, sequential-thinking

Recommendation:
  • Migrate direct servers to lazy-mcp for better context management
  • Run: /migrate to-lazy-mcp

Or disable lazy-mcp if not needed:
  • Remove lazy-mcp from ~/.claude.json mcpServers
```

### 3.4 Performance Considerations

#### 3.4.1 Configuration Read Caching

**Problem**: Reading config files on every /toggle command is slow

**Solution**: Cache configuration with TTL
```typescript
class ConfigCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private TTL = 5000; // 5 seconds

  async get(path: string): Promise<any> {
    const cached = this.cache.get(path);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    const data = await fs.readJSON(path);
    this.cache.set(path, { data, expires: Date.now() + this.TTL });
    return data;
  }

  invalidate(path: string): void {
    this.cache.delete(path);
  }
}
```

#### 3.4.2 lazy-mcp Startup Time

**Observation**: lazy-mcp proxy adds ~500ms to session start

**Mitigation**: Document expected startup time, clarify it's one-time cost

**Communication**:
```
ℹ️ lazy-mcp is starting (this may take a moment)

First use per session: ~500ms overhead
Subsequent tool calls: No additional overhead
Context savings: 95% reduction (~103KB saved)

This one-time startup cost enables instant lazy loading of 12 MCP servers.
```

## 4. Documentation Strategy

### 4.1 User-Facing Documentation

#### 4.1.1 README Integration Section

**Content**:
```markdown
## lazy-mcp Integration

mcp-toggle uses [voicetreelab/lazy-mcp](https://github.com/voicetreelab/lazy-mcp)
for MCP server lazy loading, achieving 95% context reduction.

### What is lazy-mcp?

lazy-mcp is a proxy MCP server that loads other MCP servers on demand:
- Exposes only 2 meta-tools to Claude (vs 100+ tools normally)
- Loads actual servers when their tools are used
- Reduces initial context from ~108KB to ~5KB

### How mcp-toggle Uses lazy-mcp

mcp-toggle handles:
- lazy-mcp configuration generation
- Server hierarchy organization
- Memory file and agent management
- Profile system

lazy-mcp handles:
- Runtime server lazy loading
- Tool routing and proxying
- Server process lifecycle

### Setup

Run the automated setup:
```bash
/toggle setup-lazy-mcp
```

Or configure manually:
1. Install lazy-mcp: `npm install -g @voicetreelab/lazy-mcp`
2. Create config: `~/.claude/lazy-mcp-config.json` (see template below)
3. Add to `~/.claude.json`:
   ```json
   {
     "mcpServers": {
       "lazy-mcp": {
         "command": "npx",
         "args": ["-y", "@voicetreelab/lazy-mcp"]
       }
     }
   }
   ```

### Migration

If you have existing MCP servers configured:
```bash
/migrate to-lazy-mcp
```

This will:
- Detect all configured MCP servers
- Generate lazy-mcp configuration
- Backup existing configuration
- Update to use lazy-mcp proxy

### Troubleshooting

**lazy-mcp not starting**:
- Verify installation: `npx @voicetreelab/lazy-mcp --version`
- Check config syntax: `/toggle validate-lazy-mcp`

**Servers not loading**:
- Check lazy-mcp logs: `~/.claude/logs/lazy-mcp.log`
- Validate server configs: `/context-stats`

**Context still high**:
- Ensure lazy-mcp is actually running (not bypassed)
- Check for direct MCP server definitions in `~/.claude.json`
```

#### 4.1.2 lazy-mcp Configuration Guide

**File**: `docs/lazy-mcp-integration.md`

**Sections**:
1. **Introduction**: What is lazy-mcp and why use it?
2. **Installation**: Step-by-step setup with mcp-toggle
3. **Configuration**: Understanding the hierarchy structure
4. **Migration**: Moving existing setups to lazy-mcp
5. **Troubleshooting**: Common issues and solutions
6. **Advanced**: Custom categories, server relationships

### 4.2 Developer Documentation

#### 4.2.1 Integration Architecture Doc

**File**: `docs/architecture/lazy-mcp-integration.md`

**Content**:
- System diagram (from this document)
- Component responsibilities
- Configuration file relationships
- API boundaries
- Error handling flows

#### 4.2.2 Testing Strategy

**Test Scenarios**:
1. **Setup**: `/toggle setup-lazy-mcp` creates valid configuration
2. **Migration**: `/migrate to-lazy-mcp` preserves all servers
3. **Server Management**: Adding/removing servers updates lazy-mcp config
4. **Profile Application**: Profiles correctly enable/disable server categories
5. **Error Handling**: Invalid configs detected and reported

## 5. Collaboration with Upstream

### 5.1 Communication Channels

**GitHub Issues**:
- Report bugs in lazy-mcp integration
- Request features that would benefit both projects
- Share usage patterns and insights

**Pull Requests**:
- Documentation improvements
- Bug fixes
- Integration examples

**Recognition**:
- Credit lazy-mcp prominently in README
- Link to lazy-mcp documentation
- Acknowledge maintainers in CREDITS.md

### 5.2 Version Compatibility

**lazy-mcp Version Tracking**:
- Test against latest stable release
- Document minimum compatible version
- Monitor for breaking changes
- Update integration layer as needed

**Compatibility Matrix**:
```markdown
| mcp-toggle | lazy-mcp | Status |
|------------|----------|--------|
| 2.0.0      | 1.0.0+   | ✅ Tested |
| 2.1.0      | 1.0.0+   | ✅ Tested |
```

### 5.3 Feature Requests

**Areas for Collaboration**:
1. **Profile Export**: Allow lazy-mcp to export configuration for mcp-toggle profiles
2. **Usage Metrics**: Share anonymized usage data to improve both tools
3. **Config Schema**: Standardize configuration format
4. **Error Reporting**: Improve error messages for user benefit

## 6. Rollout Plan

### 6.1 Phase 1: Basic Integration (v2.0.0)

**Goals**:
- Setup command works reliably
- Migration from existing configs successful
- Documentation complete

**Deliverables**:
- `/toggle setup-lazy-mcp` command
- `/migrate to-lazy-mcp` command
- Integration guide in README
- Example configurations

### 6.2 Phase 2: Enhanced Management (v2.1.0)

**Goals**:
- Server management via mcp-toggle UI
- Profile system integrated with lazy-mcp
- Advanced configuration options

**Deliverables**:
- `/toggle add-server` interactive wizard
- Profile support for lazy-mcp server categories
- Validation and troubleshooting commands

### 6.3 Phase 3: Optimization (v2.2.0)

**Goals**:
- Performance optimization
- Advanced features
- Community feedback integration

**Deliverables**:
- Config caching improvements
- Automatic optimization suggestions
- Usage analytics and insights

## 7. Success Metrics

**Integration Quality**:
- [ ] 95% of users successfully set up lazy-mcp via mcp-toggle
- [ ] <5% of setup attempts result in errors
- [ ] Migration preserves 100% of server configurations

**User Experience**:
- [ ] Average setup time <5 minutes
- [ ] Users understand division of responsibilities
- [ ] Documentation clarity >4.5/5 rating

**Performance**:
- [ ] Context reduction 90-95% achieved
- [ ] Setup command completes in <10 seconds
- [ ] Configuration validation <1 second

## 8. Open Questions

1. **Version Pinning**: Should we recommend specific lazy-mcp version or always latest?
2. **Default Hierarchy**: What default category structure works for most users?
3. **Conflict Resolution**: How to handle users with both lazy-mcp and direct servers?
4. **Docker Support**: Should we support lazy-mcp Docker deployment?
5. **Config Format**: Should we propose standardized config format to lazy-mcp maintainers?

## 9. References

- [voicetreelab/lazy-mcp Repository](https://github.com/voicetreelab/lazy-mcp)
- [lazy-mcp Comparison Analysis](/tmp/lazy-mcp-comparison.md)
- [Plugin Requirements](./PLUGIN_REQUIREMENTS.md)
- [mcp-toggle Architecture](../architecture/01-SYSTEM_ARCHITECTURE.md)

---

**Document Status**: Draft
**Next Steps**: Review with stakeholders, validate approach with lazy-mcp maintainers
**Last Updated**: October 12, 2025

# User Stories and Scenarios
*mcp-toggle v2.0.0 Plugin Edition*
*Date: October 12, 2025*
*Status: Draft*

## Overview

This document defines user stories and usage scenarios for the mcp-toggle Claude Code plugin. Stories are organized by persona and prioritized using MoSCoW method (Must Have, Should Have, Could Have, Won't Have).

## Personas

1. **Sarah - Solo Developer**: Works alone on multiple projects, needs context optimization
2. **Tom - Team Lead**: Manages team's Claude Code setup, wants consistent configuration
3. **Maria - New User**: Just discovered Claude Code, needs simple setup
4. **Alex - Power User**: Advanced workflows, wants maximum customization
5. **Lisa - Migrator**: Existing v0.5.2 CLI user, needs smooth transition

## Epic: Plugin Installation and Setup

### US-01: First-Time Plugin Installation (Maria)
**As a** new Claude Code user
**I want to** install mcp-toggle plugin easily
**So that** I can start managing my context without complex setup

**Acceptance Criteria**:
- Can find plugin in marketplace
- Installation completes in <30 seconds
- Plugin provides welcome message with next steps
- Documentation link clearly visible

**Story Points**: 2
**Priority**: Must Have

**Scenario**:
```
Given Maria has Claude Code installed
When she runs /plugin marketplace add machjesusmoto/claude-plugins
And she runs /plugin install mcp-toggle
Then she sees "✅ mcp-toggle installed successfully"
And she receives a message "Run /toggle to get started"
```

### US-02: Automated lazy-mcp Setup (Maria)
**As a** new user
**I want to** set up lazy-mcp automatically
**So that** I don't need to manually configure complex settings

**Acceptance Criteria**:
- /toggle setup-lazy-mcp detects existing MCP servers
- Suggests optimal hierarchy categorization
- Creates configuration with user confirmation
- Validates setup after completion
- Provides clear error messages if setup fails

**Story Points**: 5
**Priority**: Must Have

**Scenario**:
```
Given Maria has mcp-toggle installed
When she runs /toggle setup-lazy-mcp
Then she sees detected MCP servers: filesystem, sequential-thinking, postgres
And she sees suggested categories: coding_tools/, database_tools/
And she confirms the setup
Then lazy-mcp configuration is created at ~/.claude/lazy-mcp-config.json
And she sees "✅ Setup complete. Restart Claude Code to activate."
```

### US-03: Plugin Validation (Tom)
**As a** team lead
**I want to** validate plugin installation
**So that** I can ensure all team members have correct setup

**Acceptance Criteria**:
- /context-stats shows plugin status
- Reports lazy-mcp integration status
- Shows configuration file locations
- Provides troubleshooting suggestions if issues detected

**Story Points**: 3
**Priority**: Should Have

**Scenario**:
```
Given Tom installed mcp-toggle for his team
When he runs /context-stats
Then he sees:
  ✅ mcp-toggle v2.0.0 active
  ✅ lazy-mcp configured (2 meta-tools)
  📊 12 MCP servers available (0 loaded)
  📝 8 memory files, 2 blocked
  👥 15 agents (10 project, 5 user)
```

## Epic: MCP Server Management

### US-04: View All Servers (Sarah)
**As a** solo developer
**I want to** see all my MCP servers in one view
**So that** I can understand what's consuming context

**Acceptance Criteria**:
- /toggle lists all servers (local + inherited)
- Shows source (project, user, global)
- Indicates blocked/active status
- Displays estimated token usage
- Supports filtering and searching

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Sarah has 15 MCP servers configured
When she runs /toggle list
Then she sees a table with:
  Name                  | Source     | Status  | Tokens
  ────────────────────────────────────────────────────
  filesystem            | User       | Active  | ~2.1K
  sequential-thinking   | User       | Active  | ~3.5K
  postgres              | Project    | Blocked | ~1.8K
  serena                | User       | Active  | ~4.2K
```

### US-05: Block MCP Server (Sarah)
**As a** solo developer
**I want to** quickly disable a server I'm not using
**So that** I can reduce context consumption

**Acceptance Criteria**:
- /toggle server <name> off blocks the server
- Creates appropriate override in .mcp.json
- Shows confirmation message
- Reminds user to restart Claude Code
- Logs action for audit trail

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Sarah wants to block postgres server
When she runs /toggle server postgres off
Then postgres is added to .mcp.json as blocked override
And she sees "✅ Blocked server 'postgres'. Restart Claude Code to apply."
And action is logged to .claude/mcp-toggle.log
```

### US-06: Unblock MCP Server (Sarah)
**As a** solo developer
**I want to** re-enable a server I previously blocked
**So that** I can use its tools again

**Acceptance Criteria**:
- /toggle server <name> on unblocks the server
- Removes override from .mcp.json (for inherited) OR requires manual re-add (for local)
- Shows helpful message about manual re-add if needed
- Confirms action with user

**Story Points**: 3
**Priority**: Must Have

**Scenario 1: Inherited Server**:
```
Given Sarah blocked sequential-thinking (inherited server)
When she runs /toggle server sequential-thinking on
Then override is removed from .mcp.json
And she sees "✅ Unblocked server 'sequential-thinking'. Restart to apply."
```

**Scenario 2: Local Server**:
```
Given Sarah blocked filesystem (local server)
When she runs /toggle server filesystem on
Then she sees:
  "⚠️ Cannot auto-restore local server 'filesystem'.
   You must manually add its configuration to .mcp.json:

   {
     \"mcpServers\": {
       \"filesystem\": {
         \"command\": \"npx\",
         \"args\": [\"-y\", \"@modelcontextprotocol/server-filesystem\"]
       }
     }
   }"
```

### US-07: Bulk Server Management (Alex)
**As a** power user
**I want to** block/unblock multiple servers at once
**So that** I can quickly switch contexts

**Acceptance Criteria**:
- /toggle server <name1,name2,name3> off blocks multiple servers
- Shows preview of changes
- Requires confirmation for bulk operations
- Reports success/failure for each server

**Story Points**: 5
**Priority**: Could Have

**Scenario**:
```
Given Alex wants to disable all database tools
When he runs /toggle server postgres,mongodb,redis off
Then he sees:
  "About to block 3 servers:
   • postgres (project)
   • mongodb (user)
   • redis (user)

   Continue? [y/N]"
And after confirmation:
  "✅ Blocked 3 servers. Restart to apply."
```

## Epic: Memory File Management

### US-08: View Memory Files (Sarah)
**As a** solo developer
**I want to** see all memory files Claude loads
**So that** I understand what context is being included

**Acceptance Criteria**:
- /toggle list --type memory shows all memory files
- Displays source (project vs user)
- Shows file size and estimated tokens
- Indicates blocked status

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Sarah has memory files in project and user scopes
When she runs /toggle list --type memory
Then she sees:
  Name                    | Source  | Size   | Status
  ─────────────────────────────────────────────────────
  project-notes.md        | Project | 4.2KB  | Active
  coding-standards.md     | User    | 12KB   | Active
  archive/old-notes.md    | Project | 8KB    | Blocked
```

### US-09: Block Memory File (Sarah)
**As a** solo developer
**I want to** block memory files I don't need
**So that** I can reduce context overhead

**Acceptance Criteria**:
- /toggle memory <filename> off adds to permissions.deny
- Supports glob patterns (archive/*.md)
- Shows confirmation message
- Validates pattern before applying

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Sarah has archive/old-notes.md loaded
When she runs /toggle memory archive/*.md off
Then pattern is added to settings.json permissions.deny
And she sees "✅ Blocked memory: archive/*.md. Restart to apply."
```

### US-10: Unblock Memory File (Sarah)
**As a** solo developer
**I want to** re-enable blocked memory files
**So that** I can access their content again

**Acceptance Criteria**:
- /toggle memory <filename> on removes from permissions.deny
- Handles exact matches and patterns
- Confirms action with user

**Story Points**: 2
**Priority**: Must Have

## Epic: Agent Management

### US-11: Discover Available Agents (Sarah)
**As a** solo developer
**I want to** see all available agents
**So that** I know what specialized assistants I can use

**Acceptance Criteria**:
- /toggle list --type agents shows all agents
- Displays frontmatter metadata (name, description)
- Shows source (project vs user)
- Indicates override status

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Sarah has agents in project and user directories
When she runs /toggle list --type agents
Then she sees:
  Name                 | Description              | Source  | Status
  ──────────────────────────────────────────────────────────────────
  rapid-prototyper     | Quick MVP creation       | Project | Active
  security-audit       | Security analysis        | User    | Active
  test-writer          | Test automation          | Project | Blocked
```

### US-12: Block Agent (Tom)
**As a** team lead
**I want to** disable agents that aren't relevant
**So that** I can simplify the agent list

**Acceptance Criteria**:
- /toggle agent <name> off adds to permissions.deny
- Preserves frontmatter and file
- Shows confirmation

**Story Points**: 2
**Priority**: Should Have

**Scenario**:
```
Given Tom has experimental-agent.md in project
When he runs /toggle agent experimental-agent off
Then pattern is added to settings.json
And file remains in .claude/agents/
And he sees "✅ Blocked agent 'experimental-agent'. Restart to apply."
```

### US-13: View Agent Details (Sarah)
**As a** solo developer
**I want to** see detailed information about an agent
**So that** I can decide whether to use it

**Acceptance Criteria**:
- /toggle agent <name> --info shows full frontmatter
- Displays model, tools, color metadata
- Shows file path and token estimate
- Links to agent file for editing

**Story Points**: 2
**Priority**: Could Have

## Epic: Profile System

### US-14: Create Profile (Tom)
**As a** team lead
**I want to** save my current configuration as a profile
**So that** I can share it with my team

**Acceptance Criteria**:
- /profile create <name> captures current state
- Prompts for description and metadata
- Saves to .claude/profiles/<name>.json
- Validates profile name format

**Story Points**: 5
**Priority**: Should Have

**Scenario**:
```
Given Tom has configured minimal context for development
When he runs /profile create development
Then he's prompted for description
And profile is saved to .claude/profiles/development.json
And he sees "✅ Profile 'development' created. Share with: git add .claude/profiles/"
```

### US-15: Load Profile (Sarah)
**As a** solo developer
**I want to** switch to a different workflow profile
**So that** I can optimize context for current task

**Acceptance Criteria**:
- /profile load <name> shows diff of changes
- Requires user confirmation
- Applies changes atomically
- Provides rollback if error occurs

**Story Points**: 5
**Priority**: Should Have

**Scenario**:
```
Given Sarah wants to switch to analysis profile
When she runs /profile load analysis
Then she sees diff:
  "Changes to apply:
   Servers:
   + Enable: sequential-thinking, serena
   - Disable: postgres, filesystem

   Memory:
   + Load: coding-standards.md
   - Block: archive/*.md

   Proceed? [y/N]"
And after confirmation:
  "✅ Profile 'analysis' applied. Restart to activate."
```

### US-16: List Profiles (Sarah)
**As a** solo developer
**I want to** see all available profiles
**So that** I can choose the right one for my task

**Acceptance Criteria**:
- /profile list shows all profiles
- Displays description and metadata
- Indicates current active profile
- Shows profile source (project vs user)

**Story Points**: 2
**Priority**: Should Have

**Scenario**:
```
Given Sarah has multiple profiles configured
When she runs /profile list
Then she sees:
  Name          | Description                    | Source
  ─────────────────────────────────────────────────────────
  ► development | Minimal context for coding     | Project
    analysis    | Full tools for code review     | User
    minimal     | Absolute minimum context       | User
```

### US-17: Profile Diff Preview (Alex)
**As a** power user
**I want to** preview profile changes without applying
**So that** I can verify it matches my needs

**Acceptance Criteria**:
- /profile diff <name> shows detailed changes
- Color-coded additions and removals
- Shows estimated token impact
- No modifications to configuration

**Story Points**: 3
**Priority**: Should Have

**Scenario**:
```
Given Alex wants to preview minimal profile
When he runs /profile diff minimal
Then he sees:
  "Profile: minimal
   Description: Absolute minimum context

   Changes:
   Servers:
   - Disable: sequential-thinking (-3.5K tokens)
   - Disable: serena (-4.2K tokens)
   + Enable: filesystem (+2.1K tokens)

   Memory:
   - Block: coding-standards.md (-12K tokens)

   Agents:
   - Block: rapid-prototyper (-2.8K tokens)

   Net Impact: -20.4K tokens (18% reduction)"
```

### US-18: Share Team Profiles (Tom)
**As a** team lead
**I want to** version control profiles
**So that** my team uses consistent configurations

**Acceptance Criteria**:
- Profiles stored in .claude/profiles/ (version controllable)
- Git-friendly JSON format
- Documentation for profile sharing
- Team members inherit project profiles

**Story Points**: 2
**Priority**: Should Have

**Scenario**:
```
Given Tom created development.json profile
When he runs git add .claude/profiles/development.json
And commits: "Add development profile for team"
And team members pull changes
Then they see development profile in /profile list
And can load it with /profile load development
```

## Epic: Migration from CLI

### US-19: Detect Legacy Configuration (Lisa)
**As a** CLI user
**I want** the plugin to detect my existing setup
**So that** I know migration is available

**Acceptance Criteria**:
- Plugin detects .claude/blocked.md on session start
- Shows notification about migration
- Provides /migrate command
- Doesn't nag if user dismisses

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Lisa has mcp-toggle CLI installed with blocked.md
When she installs the plugin and starts Claude Code
Then she sees:
  "ℹ️ Legacy mcp-toggle configuration detected

   You have .claude/blocked.md from CLI version.
   Migrate to v2.0.0 plugin format?

   Run: /migrate to-v2
   Dismiss: /migrate dismiss"
```

### US-20: Preview Migration (Lisa)
**As a** CLI user
**I want to** see what will change during migration
**So that** I can verify it's safe

**Acceptance Criteria**:
- /migrate check analyzes current configuration
- Shows what will be migrated
- Estimates token impact
- Highlights potential issues

**Story Points**: 3
**Priority**: Must Have

**Scenario**:
```
Given Lisa runs /migrate check
Then she sees:
  "📊 Migration Analysis

   .claude/blocked.md contains:
   • 5 MCP servers → Will create .mcp.json overrides
   • 12 memory files → Will add to settings.json permissions.deny
   • 3 agents → Will add to settings.json permissions.deny

   Backup location: .claude/blocked.md.backup.1728720000

   Ready to migrate? Run: /migrate to-v2"
```

### US-21: Execute Migration (Lisa)
**As a** CLI user
**I want to** migrate my configuration automatically
**So that** I don't have to manually reconfigure everything

**Acceptance Criteria**:
- /migrate to-v2 performs migration
- Creates backups before changes
- Validates migrated configuration
- Reports success/failure details
- Provides rollback instructions

**Story Points**: 8
**Priority**: Must Have

**Scenario**:
```
Given Lisa runs /migrate to-v2
Then migration executes:
  "🔄 Starting Migration...

   [1/5] Creating backup... ✅
   [2/5] Migrating MCP servers... ✅ (5 servers)
   [3/5] Migrating memory files... ✅ (12 files)
   [4/5] Migrating agents... ✅ (3 agents)
   [5/5] Validating configuration... ✅

   Migration Complete!
   • Migrated: 20 items
   • Failed: 0
   • Backup: .claude/blocked.md.backup.1728720000

   ⚠️ Restart Claude Code to apply changes

   To rollback: /migrate rollback 1728720000"
```

### US-22: Rollback Migration (Lisa)
**As a** CLI user
**I want to** undo migration if something goes wrong
**So that** I can return to working state

**Acceptance Criteria**:
- /migrate rollback <timestamp> restores from backup
- Removes migrated configurations
- Restores original blocked.md
- Confirms successful rollback

**Story Points**: 5
**Priority**: Should Have

**Scenario**:
```
Given Lisa wants to rollback migration
When she runs /migrate rollback 1728720000
Then backup is restored:
  "🔄 Rolling back migration...

   [1/3] Restoring .claude/blocked.md... ✅
   [2/3] Removing .mcp.json overrides... ✅
   [3/3] Cleaning settings.json... ✅

   Rollback Complete!
   Configuration restored to pre-migration state.

   ⚠️ Restart Claude Code to apply."
```

## Epic: Context Optimization

### US-23: View Context Statistics (Sarah)
**As a** solo developer
**I want to** see comprehensive context statistics
**So that** I can understand and optimize token usage

**Acceptance Criteria**:
- /context-stats shows breakdown by type
- Displays active vs blocked items
- Estimates total token usage
- Shows lazy-mcp impact
- Provides optimization suggestions

**Story Points**: 5
**Priority**: Should Have

**Scenario**:
```
Given Sarah runs /context-stats
Then she sees detailed breakdown:
  "📊 Context Overview

   MCP Servers (via lazy-mcp):
   • Meta-tools: 2 (~5K tokens)
   • Available: 12 servers (lazy loaded)
   • Blocked: 3 servers

   Memory Files:
   • Active: 8 files (~45K tokens)
   • Blocked: 4 files (~18K saved)

   Agents:
   • Active: 12 agents (~32K tokens)
   • Blocked: 3 agents (~8K saved)

   Total Context: ~82K tokens (vs ~160K without lazy-mcp)
   Savings: ~78K tokens (49%)

   💡 Optimization Suggestions:
   • Block archive/*.md to save ~12K tokens
   • Consider 'minimal' profile for focused work"
```

### US-24: Automatic Optimization Suggestions (Sarah)
**As a** solo developer
**I want** automatic suggestions for reducing context
**So that** I can optimize without manual analysis

**Acceptance Criteria**:
- Analyzes usage patterns
- Suggests unused servers/memory/agents to block
- Recommends appropriate profiles
- Explains impact of each suggestion

**Story Points**: 8
**Priority**: Could Have

**Scenario**:
```
Given Sarah hasn't used postgres server in 2 weeks
When she runs /toggle optimize
Then she sees:
  "💡 Optimization Opportunities

   Unused Servers (not used in 14 days):
   • postgres → Block to save ~1.8K tokens

   Large Memory Files:
   • coding-standards.md (12KB) → Consider archiving old sections

   Suggested Profile:
   • Switch to 'development' profile → Save ~24K tokens

   Apply suggestions? [y/N/custom]"
```

### US-25: Profile Recommendation (Alex)
**As a** power user
**I want** profile recommendations based on my task
**So that** I can quickly optimize for current work

**Acceptance Criteria**:
- Analyzes current project and task
- Suggests relevant profile
- Explains why profile is recommended
- Shows estimated impact

**Story Points**: 8
**Priority**: Won't Have (v2.0)

## Epic: Collaboration and Sharing

### US-26: Export Configuration (Tom)
**As a** team lead
**I want to** export my configuration
**So that** I can share it with team members

**Acceptance Criteria**:
- /toggle export creates portable config
- Includes servers, memory, agents, profiles
- Sanitizes sensitive information
- Provides import instructions

**Story Points**: 5
**Priority**: Could Have

**Scenario**:
```
Given Tom runs /toggle export
Then configuration is exported:
  "📦 Configuration Exported

   File: mcp-toggle-export-2025-10-12.json
   Location: ~/Downloads/

   Contains:
   • 12 MCP servers (without credentials)
   • 8 memory file patterns
   • 12 agents
   • 3 profiles

   To import:
   1. Share file with team member
   2. They run: /toggle import mcp-toggle-export-2025-10-12.json
   3. They review and confirm changes"
```

### US-27: Import Configuration (Maria)
**As a** new team member
**I want to** import team configuration
**So that** I match team's setup quickly

**Acceptance Criteria**:
- /toggle import <file> loads configuration
- Shows preview of changes
- Requires confirmation
- Validates imported configuration

**Story Points**: 5
**Priority**: Could Have

## Success Metrics

**User Adoption**:
- 80% of CLI users migrate within 3 months
- 90% of new users complete setup successfully
- <5% of users abandon due to complexity

**User Satisfaction**:
- Average rating >4.0/5
- Migration satisfaction >4.5/5
- Documentation clarity >4.5/5

**Feature Usage**:
- /toggle command: Used by 95% of users
- /profile system: Used by 50% of users
- lazy-mcp setup: Completed by 70% of users

**Performance**:
- Context reduction: 50-95% (depending on lazy-mcp adoption)
- Migration time: <10 minutes average
- Error rate: <5% for all operations

## Priority Summary

### Must Have (v2.0.0)
- US-01: First-time installation
- US-02: Automated lazy-mcp setup
- US-04: View all servers
- US-05: Block MCP server
- US-06: Unblock MCP server
- US-08: View memory files
- US-09: Block memory file
- US-10: Unblock memory file
- US-11: Discover available agents
- US-19: Detect legacy configuration
- US-20: Preview migration
- US-21: Execute migration

### Should Have (v2.1.0)
- US-03: Plugin validation
- US-12: Block agent
- US-14: Create profile
- US-15: Load profile
- US-16: List profiles
- US-17: Profile diff preview
- US-18: Share team profiles
- US-22: Rollback migration
- US-23: View context statistics

### Could Have (v2.2.0+)
- US-07: Bulk server management
- US-13: View agent details
- US-24: Automatic optimization
- US-26: Export configuration
- US-27: Import configuration

### Won't Have (v2.0)
- US-25: Profile recommendation (AI-powered)

## References

- [Plugin Requirements](./PLUGIN_REQUIREMENTS.md)
- [Integration Strategy](./INTEGRATION_STRATEGY.md)
- [Migration Plan](./MIGRATION_PLAN.md)

---

**Document Status**: Draft
**Next Steps**: Review with stakeholders, prioritize for v2.0.0
**Last Updated**: October 12, 2025

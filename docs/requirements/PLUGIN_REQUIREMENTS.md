# Plugin Requirements Document
*mcp-toggle v2.0 - Claude Code Plugin Edition*
*Date: October 12, 2025*
*Status: Draft for Review*

## Executive Summary

This document defines comprehensive requirements for converting mcp-toggle from a standalone CLI/TUI tool (v0.5.2) to a Claude Code plugin (v2.0.0) that integrates with voicetreelab/lazy-mcp for MCP server lazy loading while adding comprehensive memory file and agent management capabilities.

**Core Value Proposition**:
> Complete Claude Code context management through native plugin integration, leveraging voicetreelab/lazy-mcp for MCP server lazy loading while providing unique memory file, agent, and profile management capabilities.

**Key Decision**: Use voicetreelab/lazy-mcp as the MCP server registry component rather than building our own, allowing mcp-toggle to focus on its unique value: comprehensive context management (servers + memory + agents + profiles) with user-friendly interfaces.

## 1. Functional Requirements

### 1.1 Core Plugin Infrastructure

#### FR-1.1.1 Plugin Manifest
**Priority**: Critical
**Requirement**: The plugin MUST include a valid `.claude-plugin/plugin.json` manifest file.

**Acceptance Criteria**:
- [ ] Manifest includes required fields: `name`, `version`
- [ ] Manifest includes optional metadata: `description`, `author`, `homepage`, `repository`, `license`, `keywords`
- [ ] Manifest specifies component paths: `commands`, `hooks`, `mcpServers` (optional)
- [ ] Manifest validates with `claude plugin validate .`
- [ ] Version follows semantic versioning (MAJOR.MINOR.PATCH)

**Example**:
```json
{
  "name": "mcp-toggle",
  "version": "2.0.0",
  "description": "Complete Claude Code context management with lazy loading",
  "author": {
    "name": "Dylan Taylor",
    "email": "[email protected]",
    "url": "https://github.com/machjesusmoto"
  },
  "homepage": "https://github.com/machjesusmoto/mcp-toggle",
  "repository": "https://github.com/machjesusmoto/mcp-toggle",
  "license": "MIT",
  "keywords": ["mcp", "context-management", "lazy-loading", "memory", "agents"],
  "commands": ["./commands/toggle.md", "./commands/profile.md", "./commands/migrate.md"],
  "hooks": "./hooks/hooks.json"
}
```

#### FR-1.1.2 Directory Structure
**Priority**: Critical
**Requirement**: The plugin MUST follow the standard Claude Code plugin directory structure.

**Acceptance Criteria**:
- [ ] `.claude-plugin/` directory contains plugin.json
- [ ] `commands/` directory contains slash command markdown files
- [ ] `hooks/` directory contains hook configuration and scripts
- [ ] `scripts/` directory contains utility scripts for hooks
- [ ] Root level contains README.md, LICENSE, CHANGELOG.md
- [ ] All paths in manifest are relative and start with `./`

**Structure**:
```
mcp-toggle/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── toggle.md
│   ├── profile.md
│   ├── migrate.md
│   └── context-stats.md
├── hooks/
│   ├── hooks.json
│   ├── pre-tool-use.sh
│   ├── session-start.sh
│   └── session-end.sh
├── scripts/
│   ├── block-enforcement.js
│   ├── profile-loader.js
│   └── config-manager.js
├── README.md
├── LICENSE
├── CHANGELOG.md
└── package.json
```

#### FR-1.1.3 Environment Variables
**Priority**: High
**Requirement**: The plugin MUST correctly use Claude Code environment variables.

**Acceptance Criteria**:
- [ ] All plugin-relative paths use `${CLAUDE_PLUGIN_ROOT}`
- [ ] Project directory accessible via `${CLAUDE_PROJECT_DIR}` in hooks
- [ ] Scripts handle missing environment variables gracefully
- [ ] Paths work on Windows, macOS, and Linux

### 1.2 Slash Commands

#### FR-1.2.1 /toggle Command
**Priority**: Critical
**Requirement**: Users MUST be able to manage blocked items via `/toggle` slash command.

**Acceptance Criteria**:
- [ ] `/toggle` without arguments shows interactive management interface
- [ ] `/toggle server <name> [on|off]` blocks/unblocks MCP server
- [ ] `/toggle memory <path> [on|off]` blocks/unblocks memory file
- [ ] `/toggle agent <name> [on|off]` blocks/unblocks agent
- [ ] `/toggle list` shows all current blocking rules
- [ ] Command updates appropriate configuration files (.mcp.json for servers, settings.json for memory/agents)
- [ ] Command notifies user when restart required
- [ ] Command logs all actions to `.claude/mcp-toggle.log`

**Command Specification** (commands/toggle.md):
```markdown
---
description: Manage blocked MCP servers, memory files, and agents
---

# /toggle - Context Item Management

Control which MCP servers, memory files, and agents are loaded by Claude Code.

## Usage

```bash
/toggle                        # Interactive management interface
/toggle server <name> [on|off] # Block/unblock MCP server
/toggle memory <path> [on|off] # Block/unblock memory file
/toggle agent <name> [on|off]  # Block/unblock agent
/toggle list                   # Show all blocking rules
```

## Implementation

When user runs `/toggle`:

1. Read current configuration:
   - `.mcp.json` for server blocks
   - `.claude/settings.json` for memory/agent blocks
2. Present interactive interface or execute command
3. Update appropriate configuration files
4. Log action to `.claude/mcp-toggle.log`
5. Notify user: "⚠️ Restart Claude Code to apply changes"

## Examples

```bash
# Block an MCP server
/toggle server sequential-thinking off
# Result: Adds override to .mcp.json or removes local definition

# Enable a memory file
/toggle memory project-notes.md on
# Result: Removes from permissions.deny in settings.json

# Block an agent
/toggle agent rapid-prototyper off
# Result: Adds to permissions.deny in settings.json
```
```

#### FR-1.2.2 /profile Command
**Priority**: High
**Requirement**: Users MUST be able to switch between pre-configured workflow profiles.

**Acceptance Criteria**:
- [ ] `/profile list` shows all available profiles
- [ ] `/profile load <name>` activates a profile
- [ ] `/profile show <name>` displays profile configuration
- [ ] `/profile diff <name>` shows changes from current state
- [ ] Profile application updates all relevant configs
- [ ] User can confirm changes before applying
- [ ] Profiles stored in `.claude/profiles/` directory

**Profile Format** (.claude/profiles/development.json):
```json
{
  "name": "development",
  "description": "Minimal context for focused development",
  "blocked": {
    "mcpServers": ["database-tools", "cloud-storage"],
    "memories": ["production-notes.md", "archive/*.md"],
    "agents": ["security-audit", "performance-optimizer"]
  },
  "metadata": {
    "createdAt": "2025-10-12T00:00:00Z",
    "author": "team",
    "tags": ["development", "minimal"]
  }
}
```

#### FR-1.2.3 /migrate Command
**Priority**: Medium
**Requirement**: Users MUST be able to migrate from CLI tool to plugin.

**Acceptance Criteria**:
- [ ] Detects legacy `.claude/blocked.md` files
- [ ] Converts legacy format to plugin-compatible structure
- [ ] Migrates MCP server blocks to .mcp.json overrides
- [ ] Migrates memory blocks to settings.json permissions.deny
- [ ] Creates backup before migration
- [ ] Validates migrated configuration
- [ ] Reports migration results to user

#### FR-1.2.4 /context-stats Command
**Priority**: Low
**Requirement**: Users SHOULD be able to view context usage statistics.

**Acceptance Criteria**:
- [ ] Shows count of active/blocked items by type
- [ ] Displays estimated token usage
- [ ] Shows context breakdown (servers, memory, agents)
- [ ] Provides optimization suggestions
- [ ] Displays lazy-mcp integration status

### 1.3 PreToolUse Hook

#### FR-1.3.1 MCP Server Blocking Enforcement
**Priority**: Critical
**Requirement**: Hook MUST block tool calls to disabled MCP servers before execution.

**Acceptance Criteria**:
- [ ] Hook matches all MCP server tool calls (`mcp__.*`)
- [ ] Hook reads project `.mcp.json` for blocked servers
- [ ] Hook reads settings.json for permissions.deny rules
- [ ] Hook returns `continue: false` for blocked server tools
- [ ] Hook provides helpful error message with `/toggle` command suggestion
- [ ] Hook executes in <100ms for performance
- [ ] Hook handles missing configuration files gracefully

**Hook Implementation** (hooks/pre-tool-use.sh):
```bash
#!/bin/bash
set -euo pipefail

# Read input JSON from stdin
input=$(cat)

# Extract tool name and project directory
tool_name=$(echo "$input" | jq -r '.tool_name')
project_dir=$(echo "$input" | jq -r '.cwd')

# Only process MCP server tool calls
if [[ ! "$tool_name" =~ ^mcp__ ]]; then
  echo '{"continue": true}' | jq -c
  exit 0
fi

# Extract server name from tool (mcp__servername__toolname)
server_name=$(echo "$tool_name" | cut -d'_' -f3)

# Check if server is blocked in .mcp.json
if node "${CLAUDE_PLUGIN_ROOT}/scripts/is-server-blocked.js" "$project_dir" "$server_name"; then
  echo '{
    "continue": false,
    "decision": "block",
    "stopReason": "MCP server '"'$server_name'"' is currently disabled. Run /toggle server '"'$server_name'"' on to enable it.",
    "systemMessage": "⚠️ MCP server '"'$server_name'"' is disabled. Use /toggle to enable."
  }' | jq -c
  exit 0
fi

# Server not blocked, allow tool call
echo '{"continue": true}' | jq -c
```

#### FR-1.3.2 Memory File Blocking
**Priority**: High
**Requirement**: Hook SHOULD prevent loading of blocked memory files (if technically feasible).

**Acceptance Criteria**:
- [ ] Hook detects memory file loading operations
- [ ] Hook checks settings.json permissions.deny for memory patterns
- [ ] Hook blocks memory file loading if denied
- [ ] OR provides notification if blocking not feasible

**Note**: Memory files may be loaded at session start before hooks execute. If blocking at load time is not possible, we'll rely on .md.blocked file renaming mechanism from v0.5.2.

### 1.4 Session Lifecycle Hooks

#### FR-1.4.1 Session Start Hook
**Priority**: Medium
**Requirement**: Plugin SHOULD display helpful information when session starts.

**Acceptance Criteria**:
- [ ] Hook detects if migration from v0.5.2 is needed
- [ ] Hook suggests profile if context usage is high
- [ ] Hook displays count of blocked items
- [ ] Hook verifies lazy-mcp integration status
- [ ] Hook logs session start to `.claude/mcp-toggle.log`

#### FR-1.4.2 Session End Hook
**Priority**: Low
**Requirement**: Plugin SHOULD clean up and save state when session ends.

**Acceptance Criteria**:
- [ ] Hook saves session statistics
- [ ] Hook cleans up temporary files
- [ ] Hook logs session end with summary

### 1.5 Integration with voicetreelab/lazy-mcp

#### FR-1.5.1 lazy-mcp Configuration
**Priority**: Critical
**Requirement**: Plugin MUST configure lazy-mcp as the MCP server registry.

**Acceptance Criteria**:
- [ ] Installation guide includes lazy-mcp setup instructions
- [ ] Plugin provides example lazy-mcp configuration
- [ ] Plugin helps users migrate MCP servers to lazy-mcp hierarchy
- [ ] Plugin detects and validates lazy-mcp installation
- [ ] Documentation clearly explains division of responsibilities

**Configuration Example** (user ~/.claude.json):
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
  }
}
```

**lazy-mcp Config** (~/.claude/lazy-mcp-config.json):
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
        }
      }
    }
  }
}
```

#### FR-1.5.2 lazy-mcp Coordination
**Priority**: High
**Requirement**: Plugin MUST NOT duplicate lazy-mcp functionality.

**Acceptance Criteria**:
- [ ] Plugin focuses on memory, agents, and profiles
- [ ] Plugin provides configuration helpers for lazy-mcp
- [ ] Plugin does not implement its own registry MCP server
- [ ] Documentation clearly delineates responsibilities
- [ ] `/context-stats` shows lazy-mcp status

**Division of Responsibilities**:
- **lazy-mcp**: MCP server lazy loading via proxy pattern
- **mcp-toggle**: Memory files, agents, profiles, user-friendly management

### 1.6 Memory File Management

#### FR-1.6.1 Memory File Enumeration
**Priority**: High
**Requirement**: Plugin MUST discover memory files from all scopes.

**Acceptance Criteria**:
- [ ] Discovers .md files in project `.claude/memories/`
- [ ] Discovers .md files in user `~/.claude/memories/`
- [ ] Identifies blocked files (.md.blocked extension)
- [ ] Estimates token count for each file
- [ ] Displays source (project vs user)

#### FR-1.6.2 Memory File Blocking
**Priority**: High
**Requirement**: Plugin MUST allow blocking/unblocking memory files.

**Acceptance Criteria**:
- [ ] Blocking adds file pattern to settings.json permissions.deny
- [ ] Unblocking removes file pattern from permissions.deny
- [ ] Supports glob patterns (e.g., `archive/*.md`)
- [ ] Validates patterns before applying
- [ ] Provides user confirmation before changes

### 1.7 Agent Management

#### FR-1.7.1 Agent Enumeration
**Priority**: High
**Requirement**: Plugin MUST discover agents from all scopes.

**Acceptance Criteria**:
- [ ] Discovers .md files in project `.claude/agents/`
- [ ] Discovers .md files in user `~/.claude/agents/`
- [ ] Parses agent frontmatter for metadata (name, description, model, tools)
- [ ] Identifies overrides (project agent with same name as user agent)
- [ ] Detects blocked agents via permissions.deny

#### FR-1.7.2 Agent Blocking
**Priority**: Medium
**Requirement**: Plugin SHOULD allow blocking/unblocking agents.

**Acceptance Criteria**:
- [ ] Blocking adds agent path to settings.json permissions.deny
- [ ] Unblocking removes agent path from permissions.deny
- [ ] Preserves agent override relationships
- [ ] Displays helpful error messages for conflicts

### 1.8 Profile System

#### FR-1.8.1 Profile Storage
**Priority**: High
**Requirement**: Plugin MUST store profiles in `.claude/profiles/` directory.

**Acceptance Criteria**:
- [ ] Profiles are JSON files with standardized schema
- [ ] Profile names are kebab-case (e.g., `development.json`)
- [ ] Profiles support metadata (author, tags, description)
- [ ] Profiles can be version controlled
- [ ] Invalid profiles are detected and reported

#### FR-1.8.2 Profile Application
**Priority**: High
**Requirement**: Plugin MUST apply profiles to current project.

**Acceptance Criteria**:
- [ ] Profile application updates .mcp.json for server blocks
- [ ] Profile application updates settings.json for memory/agent blocks
- [ ] User can preview changes before applying
- [ ] Atomic application (all or nothing)
- [ ] Rollback capability on error
- [ ] User notification when restart required

#### FR-1.8.3 Built-in Profiles
**Priority**: Medium
**Requirement**: Plugin SHOULD include useful default profiles.

**Acceptance Criteria**:
- [ ] `minimal.json` - Bare minimum context
- [ ] `development.json` - Focused development workflow
- [ ] `analysis.json` - Code analysis and review
- [ ] `documentation.json` - Writing and documentation
- [ ] Users can customize default profiles

## 2. Non-Functional Requirements

### 2.1 Performance

#### NFR-2.1.1 Hook Execution Time
**Priority**: Critical
**Requirement**: PreToolUse hook MUST execute in <100ms.

**Rationale**: Hooks execute before every tool call. Slow hooks degrade user experience.

**Acceptance Criteria**:
- [ ] Hook script executes in <100ms on average
- [ ] Hook uses caching for configuration reads
- [ ] Hook minimizes file I/O operations
- [ ] Performance tested with 50+ servers configured

#### NFR-2.1.2 Command Response Time
**Priority**: High
**Requirement**: Slash commands SHOULD respond in <2 seconds.

**Acceptance Criteria**:
- [ ] `/toggle list` responds in <1 second
- [ ] `/profile load` responds in <2 seconds
- [ ] `/migrate` completes in <5 seconds (one-time operation)
- [ ] Interactive interfaces are responsive

#### NFR-2.1.3 Context Token Overhead
**Priority**: Critical
**Requirement**: Plugin commands MUST consume <2000 tokens in Claude context.

**Rationale**: Plugin commands are loaded into every session. Excessive tokens reduce available conversation space.

**Acceptance Criteria**:
- [ ] All command markdown files combined <2000 tokens
- [ ] Command descriptions are concise
- [ ] Examples are minimal but illustrative
- [ ] Token usage measured and documented

### 2.2 Usability

#### NFR-2.2.1 Error Messages
**Priority**: High
**Requirement**: Error messages MUST be helpful and actionable.

**Acceptance Criteria**:
- [ ] Errors include context (what failed, why)
- [ ] Errors suggest corrective actions
- [ ] Errors reference relevant documentation
- [ ] Errors use consistent formatting

**Examples**:
```
❌ Cannot block local server 'filesystem': server not found in .mcp.json

Suggestion: Use /toggle list to see all available servers.
```

```
⚠️ Profile 'development' conflicts with current configuration:
  - Server 'database-tools' is currently enabled
  - Memory file 'archive/notes.md' is currently loaded

Run /profile diff development to see all changes before applying.
```

#### NFR-2.2.2 User Confirmation
**Priority**: High
**Requirement**: Destructive operations MUST require user confirmation.

**Acceptance Criteria**:
- [ ] Profile application shows diff and requires confirmation
- [ ] Migration shows what will change and requires confirmation
- [ ] Blocking operations can be previewed
- [ ] Users can cancel operations

#### NFR-2.2.3 Documentation Quality
**Priority**: High
**Requirement**: All features MUST be documented with examples.

**Acceptance Criteria**:
- [ ] README.md covers all major features
- [ ] Each command has usage examples
- [ ] Installation guide is complete and tested
- [ ] Troubleshooting section addresses common issues
- [ ] lazy-mcp integration is clearly explained

### 2.3 Compatibility

#### NFR-2.3.1 Claude Code Version
**Priority**: Critical
**Requirement**: Plugin MUST work with Claude Code 2.0.12+.

**Acceptance Criteria**:
- [ ] Manifest specifies minimum Claude Code version
- [ ] Features use APIs available in 2.0.12+
- [ ] Plugin validates at installation
- [ ] Graceful degradation for missing features

#### NFR-2.3.2 Platform Support
**Priority**: High
**Requirement**: Plugin MUST work on Windows, macOS, and Linux.

**Acceptance Criteria**:
- [ ] Path handling uses platform-agnostic methods
- [ ] Scripts use portable shell features (bash on all platforms)
- [ ] File permissions handled correctly per platform
- [ ] Installation tested on all three platforms

#### NFR-2.3.3 Node.js Version
**Priority**: High
**Requirement**: Plugin MUST work with Node.js 18+.

**Acceptance Criteria**:
- [ ] package.json specifies `"engines": {"node": ">=18.0.0"}`
- [ ] Dependencies are compatible with Node 18+
- [ ] ES modules used correctly
- [ ] No deprecated Node.js APIs

### 2.4 Security

#### NFR-2.4.1 Input Validation
**Priority**: Critical
**Requirement**: All user inputs MUST be validated and sanitized.

**Acceptance Criteria**:
- [ ] Server names validated against allowed characters
- [ ] File paths validated and canonicalized
- [ ] JSON configuration validated against schema
- [ ] Command injection prevented in shell scripts

#### NFR-2.4.2 File System Safety
**Priority**: Critical
**Requirement**: File operations MUST be safe and atomic.

**Acceptance Criteria**:
- [ ] Configuration writes are atomic (write to temp, then rename)
- [ ] Backups created before destructive operations
- [ ] File permissions preserved
- [ ] Symlink attacks prevented

#### NFR-2.4.3 Sensitive Data
**Priority**: High
**Requirement**: Plugin MUST NOT log sensitive information.

**Acceptance Criteria**:
- [ ] Environment variables not logged
- [ ] Configuration secrets not logged
- [ ] User home paths obfuscated in logs
- [ ] Log files have restrictive permissions (600)

### 2.5 Maintainability

#### NFR-2.5.1 Code Quality
**Priority**: High
**Requirement**: Code MUST meet quality standards.

**Acceptance Criteria**:
- [ ] TypeScript strict mode enabled
- [ ] ESLint configuration enforced
- [ ] All functions have JSDoc comments
- [ ] Test coverage >80% for core logic
- [ ] No TODO comments in production code

#### NFR-2.5.2 Versioning
**Priority**: High
**Requirement**: Plugin MUST follow semantic versioning.

**Acceptance Criteria**:
- [ ] Version bumps follow semver rules
- [ ] CHANGELOG.md updated for each release
- [ ] Breaking changes documented in migration guide
- [ ] Version compatibility matrix maintained

## 3. Integration Requirements

### 3.1 lazy-mcp Integration

#### IR-3.1.1 Installation Coordination
**Priority**: High
**Requirement**: Plugin installation SHOULD guide users through lazy-mcp setup.

**Acceptance Criteria**:
- [ ] Installation docs include lazy-mcp setup
- [ ] Plugin provides lazy-mcp config generator
- [ ] Plugin validates lazy-mcp installation
- [ ] Plugin offers to install lazy-mcp if missing

#### IR-3.1.2 Configuration Management
**Priority**: High
**Requirement**: Plugin SHOULD help users configure lazy-mcp.

**Acceptance Criteria**:
- [ ] Plugin provides template lazy-mcp configs
- [ ] Plugin can migrate existing MCP servers to lazy-mcp hierarchy
- [ ] Plugin validates lazy-mcp configuration
- [ ] Documentation explains lazy-mcp integration benefits

### 3.2 Claude Code Integration

#### IR-3.2.1 Settings.json Management
**Priority**: Critical
**Requirement**: Plugin MUST correctly modify `.claude/settings.json`.

**Acceptance Criteria**:
- [ ] Reads existing settings without corruption
- [ ] Merges changes with existing permissions.deny
- [ ] Preserves other settings (hooks, mcpServers, etc.)
- [ ] Atomic write with backup
- [ ] Validation after write

#### IR-3.2.2 .mcp.json Management
**Priority**: Critical
**Requirement**: Plugin MUST correctly modify project `.mcp.json`.

**Acceptance Criteria**:
- [ ] Creates .mcp.json if not exists
- [ ] Preserves existing server definitions
- [ ] Creates valid dummy overrides for blocking
- [ ] Atomic write with backup
- [ ] Validation after write

## 4. Migration Requirements

### 4.1 CLI to Plugin Migration

#### MR-4.1.1 Feature Parity
**Priority**: High
**Requirement**: Plugin MUST maintain feature parity with CLI v0.5.2.

**Features to Preserve**:
- [x] MCP server enumeration (local + inherited)
- [x] Memory file enumeration (project + user)
- [x] Agent enumeration (project + user)
- [x] Blocking/unblocking MCP servers
- [x] Blocking/unblocking memory files
- [x] Blocking/unblocking agents
- [x] Context overview
- [x] Token estimation

**New Plugin Features**:
- [ ] Slash commands
- [ ] PreToolUse hook enforcement
- [ ] Profile system
- [ ] lazy-mcp integration
- [ ] Session lifecycle hooks

#### MR-4.1.2 Data Migration
**Priority**: Critical
**Requirement**: Plugin MUST migrate existing v0.5.2 configurations.

**Acceptance Criteria**:
- [ ] `/migrate` command detects legacy `.claude/blocked.md`
- [ ] Migrates MCP server blocks to .mcp.json overrides
- [ ] Migrates memory blocks to settings.json permissions.deny
- [ ] Migrates agent blocks to settings.json permissions.deny
- [ ] Creates backup before migration
- [ ] Reports migration results

**Migration Mapping**:
```
Legacy (.claude/blocked.md):
  mcp:servername → .mcp.json dummy override
  memory:filename → settings.json permissions.deny pattern
  agent:agentname → settings.json permissions.deny pattern
```

#### MR-4.1.3 Backward Compatibility
**Priority**: Medium
**Requirement**: CLI tool SHOULD remain available for non-plugin use.

**Acceptance Criteria**:
- [ ] CLI tool still works standalone
- [ ] CLI tool detects plugin installation
- [ ] CLI tool defers to plugin if available
- [ ] Documentation explains when to use each

### 4.2 User Experience Migration

#### MR-4.2.1 Learning Curve
**Priority**: High
**Requirement**: Migration guide MUST minimize user confusion.

**Acceptance Criteria**:
- [ ] Migration guide with screenshots
- [ ] Before/after comparison
- [ ] FAQ addressing common questions
- [ ] Video walkthrough
- [ ] Troubleshooting section

#### MR-4.2.2 Gradual Adoption
**Priority**: Medium
**Requirement**: Users SHOULD be able to adopt plugin gradually.

**Acceptance Criteria**:
- [ ] Plugin can coexist with CLI tool
- [ ] Users can test plugin before full migration
- [ ] Rollback procedure documented
- [ ] No data loss during migration

## 5. Testing Requirements

### 5.1 Unit Tests

#### TR-5.1.1 Core Logic
**Priority**: High
**Requirement**: All core functions MUST have unit tests.

**Acceptance Criteria**:
- [ ] Configuration loading/saving
- [ ] Blocking logic
- [ ] Profile application
- [ ] Migration logic
- [ ] Validation functions
- [ ] Token estimation
- [ ] >80% code coverage

### 5.2 Integration Tests

#### TR-5.2.1 Hook Execution
**Priority**: High
**Requirement**: Hooks MUST be tested in Claude Code environment.

**Acceptance Criteria**:
- [ ] PreToolUse hook blocks disabled servers
- [ ] Session hooks execute correctly
- [ ] Hook error handling works
- [ ] Hook performance meets requirements

#### TR-5.2.2 Command Execution
**Priority**: High
**Requirement**: Commands MUST be tested in Claude Code.

**Acceptance Criteria**:
- [ ] All slash commands work as documented
- [ ] Commands modify configurations correctly
- [ ] Commands provide helpful feedback
- [ ] Error cases handled gracefully

### 5.3 End-to-End Tests

#### TR-5.3.1 User Workflows
**Priority**: Medium
**Requirement**: Common workflows SHOULD be tested end-to-end.

**Scenarios**:
- [ ] Install plugin → configure lazy-mcp → block server → verify blocking
- [ ] Create profile → apply profile → verify changes
- [ ] Migrate from CLI → verify all data migrated → use plugin
- [ ] Block memory file → restart Claude → verify not loaded

## 6. Documentation Requirements

### 6.1 User Documentation

#### DR-6.1.1 README
**Priority**: Critical
**Requirement**: README MUST cover all user-facing features.

**Sections**:
- [ ] Overview and value proposition
- [ ] Installation instructions
- [ ] lazy-mcp integration setup
- [ ] Slash command reference
- [ ] Profile system guide
- [ ] Migration from CLI guide
- [ ] Troubleshooting
- [ ] FAQ

#### DR-6.1.2 Command Reference
**Priority**: High
**Requirement**: Each command MUST have complete documentation.

**Per Command**:
- [ ] Purpose and use cases
- [ ] Syntax and arguments
- [ ] Examples (common and edge cases)
- [ ] Error messages explained
- [ ] Related commands

### 6.2 Developer Documentation

#### DR-6.2.1 Architecture
**Priority**: Medium
**Requirement**: Architecture SHOULD be documented for maintainers.

**Documents**:
- [ ] System architecture overview
- [ ] Component specifications
- [ ] Data flow diagrams
- [ ] Integration patterns
- [ ] Hook implementation guide

#### DR-6.2.2 Contributing Guide
**Priority**: Low
**Requirement**: Contributing guide SHOULD help new contributors.

**Sections**:
- [ ] Development setup
- [ ] Code standards
- [ ] Testing requirements
- [ ] Pull request process
- [ ] Release process

## 7. Acceptance Criteria Summary

### 7.1 Critical Path (Must Have for v2.0.0)

**Plugin Infrastructure**:
- [x] Valid plugin.json manifest
- [x] Standard directory structure
- [x] Environment variable handling

**Core Commands**:
- [ ] /toggle for MCP servers (with .mcp.json overrides)
- [ ] /toggle for memory files (with settings.json permissions.deny)
- [ ] /toggle for agents (with settings.json permissions.deny)
- [ ] /profile load/list

**Hook Enforcement**:
- [ ] PreToolUse blocks disabled MCP servers
- [ ] Hook performance <100ms
- [ ] Helpful error messages

**lazy-mcp Integration**:
- [ ] Installation guide
- [ ] Configuration templates
- [ ] Integration validation

**Migration**:
- [ ] /migrate command functional
- [ ] Legacy .claude/blocked.md detection
- [ ] Backup before migration

### 7.2 High Priority (Should Have for v2.0.0)

- [ ] /profile diff preview
- [ ] /context-stats command
- [ ] Session start/end hooks
- [ ] Built-in profiles (minimal, development, etc.)
- [ ] Comprehensive README
- [ ] Migration guide with examples

### 7.3 Medium Priority (Could Have for v2.1.0)

- [ ] Profile creation UI
- [ ] Automatic profile suggestions
- [ ] Usage analytics
- [ ] lazy-mcp config generator wizard
- [ ] Video tutorials

### 7.4 Low Priority (Nice to Have for Future)

- [ ] Team profile sharing
- [ ] Server recommendation engine
- [ ] Context optimization suggestions
- [ ] Integration with other tools

## 8. Success Metrics

### 8.1 Technical Metrics

- **Hook Performance**: <100ms execution time (95th percentile)
- **Command Response**: <2s for all commands
- **Token Overhead**: <2000 tokens for all commands combined
- **Test Coverage**: >80% for core logic
- **Installation Success**: >95% on first attempt

### 8.2 User Experience Metrics

- **Time to Value**: <5 minutes from install to first block
- **Migration Success**: >90% of CLI users migrate without issues
- **Error Recovery**: <10% of operations require manual intervention
- **Documentation Clarity**: >80% of users find answers in docs

### 8.3 Adoption Metrics

- **Plugin Downloads**: Target 1000+ in first 3 months
- **GitHub Stars**: Target 100+ in first 6 months
- **Issue Resolution**: <7 days median time to close
- **User Satisfaction**: >4.5/5.0 average rating

## 9. Risks and Mitigations

### 9.1 Technical Risks

**Risk**: PreToolUse hook performance degrades with many servers
- **Mitigation**: Implement caching, optimize configuration reading
- **Contingency**: Add configuration to skip hook if performance critical

**Risk**: Memory file blocking not possible at load time
- **Mitigation**: Fall back to .md.blocked file renaming
- **Contingency**: Document limitation, rely on settings.json permissions.deny

**Risk**: lazy-mcp integration breaks with upstream changes
- **Mitigation**: Version pin lazy-mcp, monitor for updates
- **Contingency**: Maintain compatibility layer

### 9.2 User Experience Risks

**Risk**: Users confused by CLI vs plugin
- **Mitigation**: Clear migration guide, prominent documentation
- **Contingency**: Offer guided migration wizard

**Risk**: Users don't understand lazy-mcp integration
- **Mitigation**: Detailed integration guide with examples
- **Contingency**: Provide working example configurations

**Risk**: Profile system too complex
- **Mitigation**: Include simple default profiles, progressive disclosure
- **Contingency**: Simplify to preset profiles only

## 10. Dependencies

### 10.1 External Dependencies

**Claude Code**:
- Version: 2.0.12+
- Features: Plugin system, PreToolUse hooks, slash commands

**voicetreelab/lazy-mcp**:
- Version: Latest stable
- Purpose: MCP server lazy loading
- Integration: User-configured, plugin provides templates

**Node.js**:
- Version: 18.0.0+
- Runtime for scripts and utilities

### 10.2 Internal Dependencies

**Current codebase (v0.5.2)**:
- Configuration loading (`config-loader.ts`)
- Blocking logic (`blocked-manager.ts`)
- Memory management (`memory-loader.ts`)
- Agent management (`agent-manager.ts`)
- Token estimation (`token-estimator.ts`)

**New components**:
- Hook scripts (Bash + Node.js)
- Command markdown files
- Profile management system
- Migration engine

## 11. Timeline Estimate

### Phase 1: Core Infrastructure (Week 1)
- Plugin manifest and structure
- Basic /toggle command
- PreToolUse hook for server blocking

### Phase 2: Hook Integration (Week 2)
- Complete hook implementation
- Memory and agent blocking
- Error handling and logging

### Phase 3: Profile System (Week 3)
- Profile storage and loading
- /profile commands
- Built-in profiles

### Phase 4: lazy-mcp Integration (Week 4)
- Integration guide
- Configuration templates
- Validation logic

### Phase 5: Migration & Polish (Week 5)
- /migrate command
- Documentation
- Testing
- Beta release

### Phase 6: Release (Week 6)
- Bug fixes
- Performance optimization
- Final documentation
- v2.0.0 release

## 12. Open Questions

1. **Memory File Loading**: Can we block memory files at load time via hooks, or must we rely on settings.json permissions.deny?
2. **lazy-mcp Versioning**: Should we version-pin lazy-mcp or track latest?
3. **Profile Distribution**: Should profiles be per-user or can they be shared in version control?
4. **CLI Deprecation**: Should we deprecate CLI tool or maintain both indefinitely?
5. **Hook Language**: Bash + Node.js or pure Node.js for hooks?
6. **Context Token Budget**: What's the actual token budget for plugin commands in Claude context?

## 13. References

- [Plugin System Research](../PLUGIN_SYSTEM_RESEARCH.md)
- [Research Executive Summary](../RESEARCH_EXECUTIVE_SUMMARY.md)
- [lazy-mcp Comparison](../lazy-mcp-comparison.md)
- [System Architecture](../architecture/01-SYSTEM_ARCHITECTURE.md)
- [Claude Code Plugin Documentation](https://docs.claude.com/en/docs/claude-code/plugins)
- [Claude Code Hooks Reference](https://docs.claude.com/en/docs/claude-code/hooks)
- [voicetreelab/lazy-mcp Repository](https://github.com/voicetreelab/lazy-mcp)

---

**Document Status**: Draft for Review
**Next Steps**: Review with stakeholders, refine based on feedback, begin Phase 1 implementation
**Last Updated**: October 12, 2025

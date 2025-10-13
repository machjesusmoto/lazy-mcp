# Claude Code Plugin System Research
*Comprehensive Documentation for mcp-toggle Plugin Migration*
*Research Date: October 12, 2025*
*Target Version: Claude Code 2.0.12+*

---

## Executive Summary

Claude Code's plugin system (released v2.0.12, October 2025) provides extensibility through:
- **Custom Commands**: Slash commands for specialized workflows
- **Agents**: Purpose-built subagents for development tasks
- **Hooks**: Event-driven automation at key lifecycle points
- **MCP Servers**: Bundled Model Context Protocol integrations

**Key Finding for mcp-toggle**: While the plugin system enables sophisticated customization, **true runtime dynamic loading/unloading of MCP servers is not yet available**. However, PreToolUse hooks combined with plugin-level MCP server configuration provides a viable path for lazy loading patterns.

**Feasibility Assessment**: ⚠️ **Partially Feasible with Workarounds**
- ✅ Plugin infrastructure is mature and well-documented
- ✅ PreToolUse hooks can block and modify tool calls
- ✅ Plugins can bundle MCP server configurations
- ❌ Runtime MCP server loading requires Claude Code restart
- ⚡ Workaround: Use PreToolUse hooks to conditionally enable plugin MCP servers

---

## 1. Plugin Architecture

### 1.1 Plugin Manifest (plugin.json)

**Location**: `.claude-plugin/plugin.json` in plugin root

**Required Fields**:
```json
{
  "name": "plugin-name",           // Unique identifier (kebab-case)
  "version": "1.0.0"               // Semantic versioning
}
```

**Optional Metadata**:
```json
{
  "description": "Brief plugin purpose",
  "author": {
    "name": "Author Name",
    "email": "[email protected]",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["mcp", "management", "lazy-loading"]
}
```

**Component Path Fields**:
```json
{
  "commands": ["./custom/commands/special.md"],  // Custom command files
  "agents": "./custom/agents/",                  // Agent directory
  "hooks": "./config/hooks.json",                // Hook configurations
  "mcpServers": "./mcp-config.json"             // MCP server definitions
}
```

**Important Notes**:
- All paths must be relative to plugin root and start with `./`
- Custom paths supplement default directories (don't replace them)
- Use `${CLAUDE_PLUGIN_ROOT}` environment variable for plugin-relative paths

### 1.2 Directory Structure

**Standard Layout**:
```
mcp-toggle/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── commands/                     # Slash commands (*.md files)
│   ├── toggle.md                # /toggle command
│   ├── profile.md               # /profile command
│   └── migrate.md               # /migrate command
├── agents/                       # Custom agents (optional)
├── hooks/                        # Hook scripts
│   └── pre-tool-use.sh          # PreToolUse hook handler
├── .mcp.json                     # Plugin MCP server config
├── scripts/                      # Utility scripts
├── package.json                  # Node.js dependencies
├── LICENSE
└── README.md
```

### 1.3 Environment Variables

- **`${CLAUDE_PLUGIN_ROOT}`**: Absolute path to plugin directory
- **`CLAUDE_PROJECT_DIR`**: Current project directory in hooks
- Available in all plugin components (manifest, hooks, MCP configs)

### 1.4 Validation

**Command**: `claude plugin validate .`

Validates:
- JSON syntax in plugin.json
- Directory structure integrity
- Hook script permissions and existence
- MCP server configuration validity

---

## 2. Hook System Deep Dive

### 2.1 Available Hook Events

| Hook Event | Timing | Can Block? | Can Modify? | Use Cases |
|------------|--------|------------|-------------|-----------|
| **PreToolUse** | Before tool execution | ✅ Yes | ✅ Yes (v2.0.10+) | Validation, lazy loading, access control |
| **PostToolUse** | After tool success | ❌ No | ❌ No | Logging, notifications, cleanup |
| **UserPromptSubmit** | After user submits prompt | ✅ Yes | ✅ Yes | Context injection, validation |
| **SessionStart** | Session initialization | ❌ No | ❌ No | Environment setup, state loading |
| **SessionEnd** | Session termination | ❌ No | ❌ No | Cleanup, state persistence |
| **Stop** | Claude finishes response | ✅ Yes | ❌ No | Workflow continuation control |
| **SubagentStop** | Subagent task complete | ✅ Yes | ❌ No | Task validation, chaining |
| **PreCompact** | Before context compaction | ❌ No | ❌ No | Critical state preservation |
| **Notification** | Claude sends notification | ❌ No | ❌ No | Custom notification routing |

### 2.2 PreToolUse Hook Configuration

**Configuration Location**: `.claude/settings.json` or plugin `hooks/` directory

**Basic Structure**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script.sh",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

**Matcher Patterns**:
```json
// Match specific tool
"matcher": "Bash"

// Match tool family with regex
"matcher": "mcp__.*"

// Match specific MCP server tools
"matcher": "mcp__memory__.*"

// Match write operations across all MCP servers
"matcher": "mcp__.*__write.*"
```

### 2.3 PreToolUse Hook Input/Output

**Input JSON** (via stdin):
```json
{
  "session_id": "abc123-session-id",
  "transcript_path": "/path/to/session-transcript.jsonl",
  "cwd": "/current/working/directory",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  }
}
```

**Output JSON** (via stdout):
```json
{
  "continue": true,                     // Whether to proceed (default: true)
  "decision": "approve",                // "approve", "block", or undefined
  "stopReason": "Blocked by policy",    // Message shown if continue: false
  "systemMessage": "Warning: ...",      // Optional user warning
  "suppressOutput": false,              // Hide hook output (default: false)
  "updatedInput": {                     // Modified tool input (v2.0.10+)
    "file_path": "/modified/path.txt",
    "content": "modified content"
  }
}
```

**Exit Codes**:
- `0`: Success (continue)
- `2`: Blocking error (stop execution)
- Other: Non-blocking error (log and continue)

### 2.4 Hook Execution Model

**Timing**: Hooks execute synchronously before tool execution
**Timeout**: 60 seconds default (configurable)
**Parallelization**: Multiple hooks for same event run in parallel
**Error Handling**: Non-zero exit codes can block or warn based on code

**Security Warning**: 🚨 Hooks execute with user credentials and full system access. Always validate and sanitize inputs. Review hook code before installation.

---

## 3. MCP Server Lifecycle Management

### 3.1 Current Limitations

**Session-Scoped Loading**:
- All MCP servers load at session start
- Servers remain in context for entire session
- Tool schemas loaded eagerly (not lazily)
- Restart required to enable/disable servers

**Context Impact**:
- Each server adds tool definitions to system prompt
- Consumes context tokens even when unused
- Typical overhead: 50-2000 tokens per server
- Cumulative effect can be 50-100k tokens for large setups

**GitHub Issue Tracking**:
- [#6638](https://github.com/anthropics/claude-code/issues/6638): Dynamic loading/unloading
- [#7172](https://github.com/anthropics/claude-code/issues/7172): Token management
- [#7336](https://github.com/anthropics/claude-code/issues/7336): Lazy loading (95% reduction proof)

### 3.2 Plugin MCP Server Configuration

**Option 1: Separate .mcp.json**
```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_URL": "${DB_URL}"
    },
    "lazyLoad": true
  }
}
```

**Option 2: Inline in plugin.json**
```json
{
  "name": "mcp-toggle",
  "version": "1.0.0",
  "mcpServers": {
    "registry": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/registry-server.js",
      "args": ["--mode", "lazy"]
    }
  }
}
```

**Server Lifecycle**:
1. Plugin installation registers MCP servers
2. Servers start when plugin enables
3. Servers stop when plugin disables
4. **Restart required** to apply changes

### 3.3 @mentioning MCP Servers (v2.0.10)

**Feature**: Enable/disable MCP servers by @mentioning or via `/mcp` command

**Usage**:
```
@memory/create-note "My note content"
/mcp enable memory
/mcp disable filesystem
```

**Limitations**:
- Still requires restart for configuration changes
- Doesn't reduce initial context loading
- Toggle state persists across sessions

### 3.4 Workaround: Pseudo-Lazy Loading

**Strategy**: Use PreToolUse hooks to conditionally enable plugin functionality

**Implementation Pattern**:
```bash
#!/bin/bash
# hooks/pre-tool-use.sh

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Check if tool requires specific MCP server
if [[ "$tool_name" == "mcp__memory__"* ]]; then
  # Load memory server context or enable additional tools
  echo '{"continue": true, "systemMessage": "Memory MCP server activated"}' | jq -c
else
  echo '{"continue": true}' | jq -c
fi
```

**Benefits**:
- ✅ Zero-code changes to Claude Code
- ✅ Works within current plugin system
- ✅ Can provide user feedback
- ⚠️ Still loads server at session start
- ⚠️ Doesn't reduce context tokens

---

## 4. Command System

### 4.1 Command Registration

**Format**: Markdown files in `commands/` directory

**File Structure** (`commands/toggle.md`):
```markdown
---
description: Toggle MCP servers and memory files on/off
---

# Toggle Command

This command enables toggling MCP servers and memory files.

## Usage

```bash
/toggle server <server-name>
/toggle memory <memory-name>
/toggle profile <profile-name>
```

## Examples

```bash
# Disable filesystem server
/toggle server filesystem off

# Enable memory MCP server
/toggle server memory on

# Switch to development profile
/toggle profile dev
```
```

### 4.2 Command Implementation

**How It Works**:
1. Command markdown becomes part of Claude's context
2. Claude interprets command usage from markdown
3. Command can trigger tools, hooks, or provide guidance
4. No separate execution script required

**Limitations**:
- Commands are guidance, not executable code
- Claude interprets and executes based on markdown
- Cannot directly modify Claude Code state
- Useful for standardizing workflows

### 4.3 Command Examples for mcp-toggle

**commands/toggle.md**:
```markdown
---
description: Toggle MCP servers and memory files on/off
---

When user runs `/toggle`, read `.claude/blocked.md` and present interactive menu.
Use TUI to display current state and allow toggling items.
Update blocked.md with changes and notify user to restart Claude Code.
```

**commands/profile.md**:
```markdown
---
description: Switch between configuration profiles
---

Load configuration profile from `.claude/profiles/<profile-name>.json`.
Apply profile settings to current session by updating blocked.md.
Show diff of changes and confirm with user before applying.
```

**commands/migrate.md**:
```markdown
---
description: Migrate legacy blocked.md format to new structure
---

Detect legacy blocked.md format and convert to plugin-compatible structure.
Back up existing configuration before migration.
Validate migrated configuration and report any issues.
```

---

## 5. Distribution & Marketplace

### 5.1 Marketplace Structure

**marketplace.json** (in repository root):
```json
{
  "name": "mcp-tools",
  "owner": {
    "name": "MCP Toggle Team",
    "email": "[email protected]"
  },
  "plugins": [
    {
      "name": "mcp-toggle",
      "source": "./plugins/mcp-toggle",
      "description": "Manage MCP servers and memory files",
      "version": "1.0.0",
      "keywords": ["mcp", "management", "lazy-loading"]
    }
  ]
}
```

### 5.2 Installation Flow

**1. Add Marketplace**:
```bash
/plugin marketplace add user-or-org/repo-name
```

**2. Browse Plugins**:
```bash
/plugin
```

**3. Install Plugin**:
```bash
/plugin install mcp-toggle
```

**4. Enable Plugin**:
```bash
/plugin enable mcp-toggle
```

**5. Verify Installation**:
```bash
/plugin list
```

### 5.3 Team Collaboration

**Repository-Level Configuration** (`.claude/settings.json`):
```json
{
  "extraKnownMarketplaces": {
    "company-plugins": {
      "source": {
        "source": "github",
        "repo": "company/claude-plugins"
      }
    }
  }
}
```

**Benefits**:
- Team members inherit marketplace configuration
- Consistent plugin availability across team
- Version control for plugin specifications
- Easy onboarding for new team members

### 5.4 Versioning & Updates

**Semantic Versioning**:
- MAJOR: Breaking changes to plugin interface
- MINOR: New features, backwards compatible
- PATCH: Bug fixes, no interface changes

**Update Workflow**:
```bash
# Check for updates
/plugin marketplace update

# Update specific plugin
/plugin update mcp-toggle

# Update all plugins
/plugin update --all
```

---

## 6. Implementation Considerations

### 6.1 Technical Constraints

**Execution Environment**:
- Node.js version: Matches Claude Code runtime (18+)
- Available APIs: Standard Node.js + Claude Code SDK (limited)
- File system access: Full user permissions
- Network access: Unrestricted (use caution)

**Security Model**:
- Plugins run with user credentials
- No sandboxing or isolation
- Full file system and network access
- User must trust plugin authors

**Performance**:
- Hook timeout: 60 seconds default
- Parallel hook execution
- Context loading: Session start only
- Plugin overhead: Minimal (~1-5ms per hook)

### 6.2 Token/Context Impact

**Plugin Loading**:
- Plugin commands: ~500-2000 tokens (added to context)
- Plugin hooks: ~0 tokens (not in context)
- Plugin MCP servers: 50-2000 tokens per server
- Total overhead: Depends on plugin complexity

**Optimization Strategies**:
- Use hooks instead of commands when possible
- Minimize MCP server tool schemas
- Lazy load plugin functionality via hooks
- Keep command descriptions concise

### 6.3 Best Practices

**Security**:
- ✅ Validate all inputs from hooks
- ✅ Use absolute paths for scripts
- ✅ Sanitize user-provided data
- ✅ Review third-party plugin code
- ❌ Never execute arbitrary commands
- ❌ Avoid exposing sensitive environment variables

**Performance**:
- ⚡ Keep hooks fast (<1 second)
- ⚡ Use caching for expensive operations
- ⚡ Minimize context token usage
- ⚡ Batch operations when possible

**Maintainability**:
- 📝 Document plugin configuration
- 📝 Provide clear error messages
- 📝 Include usage examples
- 📝 Maintain CHANGELOG.md

---

## 7. Lazy Loading Feasibility Analysis

### 7.1 Proof of Concept Results

**Source**: [GitHub Issue #7336](https://github.com/anthropics/claude-code/issues/7336)

**Problem**:
- Initial loading: ~108k tokens (54% of 200k limit)
- Leaves only 92k tokens for conversation
- 19 MCP servers + 4 agents loaded

**Solution**:
- Lightweight registry system (~5k tokens)
- Keyword-based on-demand loading
- Tool relationship mapping
- Intelligent preloading

**Results**:
- **95% token reduction** (108k → 5k)
- Functional implementation: [claude-lazy-loading](https://github.com/machjesusmoto/claude-lazy-loading)
- Registry generation working
- Keyword-based loading validated

### 7.2 Plugin-Based Approach

**Strategy**: Hybrid registry + hook-based activation

**Phase 1: Registry MCP Server**
```json
{
  "mcpServers": {
    "mcp-registry": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/registry-server.js"]
    }
  }
}
```

**Registry Server Capabilities**:
- Minimal tool schema (~5k tokens)
- `registry/list`: Show available servers
- `registry/load`: Trigger server activation
- `registry/unload`: Deactivate server
- `registry/info`: Server metadata

**Phase 2: PreToolUse Hook**
```bash
#!/bin/bash
# Detect keyword-based MCP server needs

keywords=$(echo "$input" | jq -r '.tool_input | to_entries[] | .value' | grep -oE 'memory|filesystem|database' | head -1)

if [ -n "$keywords" ]; then
  # Log server activation request
  echo "Activating $keywords server" >> "$CLAUDE_PROJECT_DIR/.claude/mcp-activation.log"

  # Return with system message
  echo "{\"continue\": true, \"systemMessage\": \"Activated $keywords MCP server\"}" | jq -c
fi
```

### 7.3 Implementation Roadmap

**✅ Viable Now (within current constraints)**:
1. Plugin infrastructure with commands
2. PreToolUse hooks for tool blocking
3. User notification about server activation
4. Profile management via blocked.md
5. Migration tools for existing setups

**⚠️ Requires Workarounds**:
1. True lazy loading → Use registry pattern
2. Runtime server activation → Requires restart
3. Token reduction → Registry MCP server approach
4. Conditional loading → PreToolUse hook + user interaction

**❌ Not Currently Possible**:
1. Runtime MCP server loading without restart
2. Dynamically reducing context tokens
3. Automatic server unloading after use
4. Zero-restart configuration changes

---

## 8. Code Examples & Patterns

### 8.1 Basic Plugin Structure

```bash
# Create plugin directory
mkdir -p mcp-toggle/.claude-plugin
mkdir -p mcp-toggle/{commands,hooks,scripts}

# Create manifest
cat > mcp-toggle/.claude-plugin/plugin.json <<'EOF'
{
  "name": "mcp-toggle",
  "version": "1.0.0",
  "description": "Manage MCP servers and memory files with lazy loading",
  "author": {
    "name": "Dylan Taylor",
    "email": "[email protected]"
  },
  "repository": "https://github.com/machjesusmoto/mcp-toggle",
  "license": "MIT",
  "keywords": ["mcp", "lazy-loading", "memory", "management"],
  "commands": ["./commands/toggle.md", "./commands/profile.md"],
  "hooks": "./hooks/hooks.json"
}
EOF
```

### 8.2 PreToolUse Hook Example

**hooks/hooks.json**:
```json
{
  "PreToolUse": [
    {
      "matcher": "mcp__.*",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-tool-use.sh",
          "timeout": 10
        }
      ]
    }
  ]
}
```

**hooks/pre-tool-use.sh**:
```bash
#!/bin/bash
set -euo pipefail

# Read input JSON
input=$(cat)

# Extract tool name and input
tool_name=$(echo "$input" | jq -r '.tool_name')
project_dir=$(echo "$input" | jq -r '.cwd')

# Check if server is blocked
blocked_file="$project_dir/.claude/blocked.md"
if [ -f "$blocked_file" ]; then
  server=$(echo "$tool_name" | cut -d'_' -f2)

  if grep -q "^mcp:$server$" "$blocked_file" 2>/dev/null; then
    # Server is blocked, notify user
    echo '{
      "continue": false,
      "decision": "block",
      "stopReason": "MCP server '"$server"' is currently disabled. Run /toggle server '"$server"' on to enable it.",
      "systemMessage": "⚠️  MCP server '"$server"' is disabled. Use /toggle to enable."
    }' | jq -c
    exit 0
  fi
fi

# Server not blocked, continue
echo '{"continue": true}' | jq -c
```

### 8.3 Toggle Command Implementation

**commands/toggle.md**:
```markdown
---
description: Toggle MCP servers and memory files on/off
---

# /toggle - MCP Toggle Control

Manage MCP servers and memory files via `.claude/blocked.md`.

## Usage

```bash
/toggle server <server-name> [on|off]
/toggle memory <memory-name> [on|off]
/toggle agent <agent-name> [on|off]
/toggle profile <profile-name>
/toggle list
```

## Implementation

When user runs `/toggle`:

1. Read `.claude/blocked.md` to get current state
2. Present interactive menu or apply command directly
3. Update `blocked.md` with changes:
   - Add `mcp:<server-name>` to block server
   - Add `memory:<memory-name>` to block memory
   - Add `agent:<agent-name>` to block agent
   - Remove lines to unblock
4. Notify user: "⚠️  Restart Claude Code to apply changes"
5. Log action to `.claude/mcp-toggle.log`

## Examples

```bash
# Disable filesystem server
/toggle server filesystem off
# Adds "mcp:filesystem" to blocked.md

# Enable memory server
/toggle server memory on
# Removes "mcp:memory" from blocked.md

# Switch to development profile
/toggle profile dev
# Loads .claude/profiles/dev.json and updates blocked.md
```

## Profile Format

Profiles are JSON files in `.claude/profiles/`:

```json
{
  "name": "development",
  "description": "Minimal MCP servers for development",
  "blocked": {
    "mcpServers": ["database", "cloud-storage"],
    "memories": ["production-notes"],
    "agents": ["security-audit"]
  }
}
```
```

### 8.4 Migration Script Example

**scripts/migrate.sh**:
```bash
#!/bin/bash
set -euo pipefail

BLOCKED_FILE="${1:-.claude/blocked.md}"
BACKUP_FILE="$BLOCKED_FILE.backup.$(date +%s)"

# Backup existing file
if [ -f "$BLOCKED_FILE" ]; then
  cp "$BLOCKED_FILE" "$BACKUP_FILE"
  echo "✅ Backed up to $BACKUP_FILE"
fi

# Detect legacy format and convert
if [ -f "$BLOCKED_FILE" ]; then
  # Check for legacy format (lines without prefixes)
  if grep -qvE '^(mcp|memory|agent):' "$BLOCKED_FILE" 2>/dev/null; then
    echo "🔄 Migrating legacy format..."

    # Create temporary file with prefixes
    temp_file=$(mktemp)
    while IFS= read -r line; do
      # Skip empty lines and comments
      [[ -z "$line" || "$line" =~ ^# ]] && continue

      # Add prefix based on content
      if [[ "$line" =~ ^[a-z-]+$ ]]; then
        # Assume MCP server name
        echo "mcp:$line"
      elif [[ "$line" =~ \.md$ ]]; then
        # Assume memory file
        echo "memory:$line"
      else
        # Keep as-is
        echo "$line"
      fi
    done < "$BLOCKED_FILE" > "$temp_file"

    # Replace original
    mv "$temp_file" "$BLOCKED_FILE"
    echo "✅ Migration complete"
  else
    echo "✅ Already using new format"
  fi
fi
```

---

## 9. Migration Path for mcp-toggle

### 9.1 Current mcp-toggle Architecture

**Existing Capabilities**:
- ✅ CLI tool for managing blocked.md
- ✅ Local server blocking (MCP servers, memories, agents)
- ✅ Project hierarchy traversal
- ✅ Interactive TUI interface
- ✅ Profile management

**Current Limitations**:
- ❌ External tool (not integrated into Claude Code)
- ❌ No PreToolUse hook integration
- ❌ Manual restart required
- ❌ No lazy loading mechanism

### 9.2 Plugin Conversion Strategy

**Phase 1: Basic Plugin (Week 1)**
1. Create plugin manifest and structure
2. Convert CLI commands to slash commands
3. Implement basic hooks for blocking enforcement
4. Test installation and validation

**Phase 2: Hook Integration (Week 2)**
1. Implement PreToolUse hook for MCP tool blocking
2. Add user notifications via systemMessage
3. Create profile switching via commands
4. Test hook execution and error handling

**Phase 3: Registry MCP Server (Week 3-4)**
1. Build lightweight registry server
2. Implement keyword-based activation
3. Create registry tools (list, load, info)
4. Test context token reduction

**Phase 4: Documentation & Distribution (Week 5)**
1. Write comprehensive README
2. Create marketplace.json
3. Publish to GitHub
4. Announce to community

### 9.3 Technical Migration Steps

**Step 1: Restructure Project**
```bash
# Create plugin structure
mkdir -p .claude-plugin
mv src/tui/app.tsx commands/toggle.md  # Convert TUI to command
mv src/core/* scripts/                  # Move core logic to scripts
```

**Step 2: Create Plugin Manifest**
```json
{
  "name": "mcp-toggle",
  "version": "2.0.0",
  "description": "Manage MCP servers with lazy loading and profiles",
  "commands": ["./commands/toggle.md", "./commands/profile.md"],
  "hooks": "./hooks/hooks.json"
}
```

**Step 3: Implement Hooks**
```bash
# Create hook configuration
cat > hooks/hooks.json <<'EOF'
{
  "PreToolUse": [
    {
      "matcher": "mcp__.*",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-tool-use.sh"
        }
      ]
    }
  ]
}
EOF
```

**Step 4: Convert CLI to Commands**
```markdown
<!-- commands/toggle.md -->
---
description: Toggle MCP servers and memory files
---

Use the mcp-toggle scripts to manage blocked.md.

When /toggle is run:
1. Execute ${CLAUDE_PLUGIN_ROOT}/scripts/toggle.js
2. Present current state from blocked.md
3. Allow user to toggle items
4. Update blocked.md
5. Notify user to restart
```

### 9.4 Compatibility Considerations

**Backwards Compatibility**:
- ✅ Keep CLI tool for non-plugin use
- ✅ Support existing blocked.md format
- ✅ Provide migration script
- ⚠️ Plugin requires Claude Code 2.0.12+

**Migration Path**:
1. Users install plugin via marketplace
2. Plugin detects existing blocked.md
3. Offers to migrate to new format
4. Maintains both CLI and plugin interfaces

---

## 10. Open Questions

### 10.1 Technical Uncertainties

1. **PreToolUse Hook Capabilities**:
   - ❓ Can hooks trigger MCP server loading mid-session?
   - ❓ What's the performance impact of blocking every MCP tool call?
   - ❓ Can hooks modify Claude's context dynamically?

2. **Registry MCP Server**:
   - ❓ What's the minimum viable registry schema?
   - ❓ Can registry intercept and redirect tool calls?
   - ❓ How to implement server activation without restart?

3. **Plugin Distribution**:
   - ❓ Can plugins bundle Node.js dependencies (node_modules)?
   - ❓ What's the size limit for plugin packages?
   - ❓ How are plugin updates distributed?

### 10.2 Feature Requests to Track

**GitHub Issues**:
- [#6638](https://github.com/anthropics/claude-code/issues/6638): Dynamic loading/unloading
- [#7172](https://github.com/anthropics/claude-code/issues/7172): Token management improvements
- [#7336](https://github.com/anthropics/claude-code/issues/7336): Lazy loading feature request
- [#4368](https://github.com/anthropics/claude-code/issues/4368): Enhance PreToolUse to modify inputs

**Community Developments**:
- Watch for Claude Code 2.1.x releases
- Monitor plugin marketplace for similar tools
- Track MCP server specification updates

### 10.3 Areas Needing Experimentation

**Proof-of-Concept Tests**:
1. Build minimal registry MCP server
2. Test PreToolUse hook blocking latency
3. Measure context token impact of registry
4. Validate keyword detection accuracy
5. Benchmark hook execution overhead

**User Experience Tests**:
1. Command discoverability
2. Error message clarity
3. Restart friction assessment
4. Profile switching workflows

---

## 11. Recommended Next Steps

### 11.1 Immediate Actions

1. **Create Plugin Prototype** (1-2 days)
   - Set up basic plugin structure
   - Implement simple toggle command
   - Test installation and validation

2. **Build PreToolUse Hook POC** (2-3 days)
   - Implement blocking logic
   - Test with various MCP servers
   - Measure performance impact

3. **Design Registry Schema** (1 day)
   - Define minimal tool schema
   - Plan keyword detection logic
   - Document activation flow

### 11.2 Medium-Term Goals

1. **Registry MCP Server** (1-2 weeks)
   - Implement core registry functionality
   - Build keyword-based loading
   - Test token reduction metrics

2. **Profile Management** (1 week)
   - Design profile JSON schema
   - Implement profile switching
   - Create profile templates

3. **Documentation** (1 week)
   - Write user guide
   - Create developer documentation
   - Record demo videos

### 11.3 Long-Term Vision

1. **Community Adoption**
   - Publish to plugin marketplace
   - Gather user feedback
   - Iterate on features

2. **Advanced Features**
   - Intelligent server recommendation
   - Usage analytics and optimization
   - Team-wide profile sharing

3. **Ecosystem Integration**
   - Collaborate with MCP server authors
   - Build server compatibility database
   - Create best practices guide

---

## 12. References & Resources

### 12.1 Official Documentation

- **Plugin System**: https://docs.claude.com/en/docs/claude-code/plugins
- **Hooks Reference**: https://docs.claude.com/en/docs/claude-code/hooks
- **Hooks Guide**: https://docs.claude.com/en/docs/claude-code/hooks-guide
- **Plugin Reference**: https://docs.claude.com/en/docs/claude-code/plugins-reference
- **Marketplace**: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- **MCP Integration**: https://docs.claude.com/en/docs/claude-code/mcp

### 12.2 Community Resources

- **Plugin Announcement**: https://www.anthropic.com/news/claude-code-plugins
- **Best Practices**: https://www.anthropic.com/engineering/claude-code-best-practices
- **Lazy Loading POC**: https://github.com/machjesusmoto/claude-lazy-loading

### 12.3 GitHub Issues

- **Dynamic Loading**: https://github.com/anthropics/claude-code/issues/6638
- **Token Management**: https://github.com/anthropics/claude-code/issues/7172
- **Lazy Loading Request**: https://github.com/anthropics/claude-code/issues/7336
- **PreToolUse Enhancement**: https://github.com/anthropics/claude-code/issues/4368

### 12.4 Third-Party Examples

- **Claude Code Hooks Mastery**: https://github.com/disler/claude-code-hooks-mastery
- **Hook Multi-Agent Observability**: https://github.com/disler/claude-code-hooks-multi-agent-observability
- **MCP Server Manager**: https://lobehub.com/mcp/yourusername-mcp-server-manager

---

## Appendix A: Plugin Manifest Schema

```typescript
interface PluginManifest {
  // Required fields
  name: string;                      // Unique identifier (kebab-case)
  version: string;                   // Semantic version (e.g., "1.0.0")

  // Metadata (optional)
  description?: string;              // Brief plugin description
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;                 // Documentation URL
  repository?: string;               // Source code repository
  license?: string;                  // License identifier (e.g., "MIT")
  keywords?: string[];               // Discovery keywords

  // Component paths (optional)
  commands?: string[];               // Custom command files/directories
  agents?: string;                   // Agent directory path
  hooks?: string;                    // Hook configuration file path
  mcpServers?: string | object;     // MCP server config (file path or inline)
}
```

## Appendix B: Hook Event Reference

```typescript
interface HookEvent {
  PreToolUse: {
    input: {
      session_id: string;
      transcript_path: string;
      cwd: string;
      hook_event_name: "PreToolUse";
      tool_name: string;
      tool_input: Record<string, any>;
    };
    output: {
      continue?: boolean;              // Default: true
      decision?: "approve" | "block";  // Bypass permission system
      stopReason?: string;             // Message when continue: false
      systemMessage?: string;          // Warning to user
      suppressOutput?: boolean;        // Hide stdout (default: false)
      updatedInput?: Record<string, any>; // Modified tool input
    };
  };

  PostToolUse: {
    input: {
      session_id: string;
      transcript_path: string;
      cwd: string;
      hook_event_name: "PostToolUse";
      tool_name: string;
      tool_input: Record<string, any>;
      tool_response: any;
    };
    output: {
      continue?: boolean;
      systemMessage?: string;
      suppressOutput?: boolean;
    };
  };

  SessionStart: {
    input: {
      session_id: string;
      transcript_path: string;
      cwd: string;
      hook_event_name: "SessionStart";
    };
    output: {
      systemMessage?: string;
    };
  };

  SessionEnd: {
    input: {
      session_id: string;
      transcript_path: string;
      cwd: string;
      hook_event_name: "SessionEnd";
    };
    output: {
      systemMessage?: string;
    };
  };
}
```

---

**End of Research Document**

*This comprehensive research provides the foundation for converting mcp-toggle into a Claude Code plugin with lazy loading capabilities. While true runtime MCP server loading is not yet available, the plugin system offers sufficient hooks and mechanisms to implement a practical lazy-loading solution using a registry pattern combined with PreToolUse hooks.*

# Migration Plan: CLI to Plugin
*mcp-toggle v0.5.2 → v2.0.0*
*Date: October 12, 2025*
*Status: Draft*

## Executive Summary

This document defines the comprehensive plan for migrating mcp-toggle from a standalone CLI/TUI tool (v0.5.2) to a Claude Code plugin (v2.0.0). The migration preserves all existing functionality while adding native plugin integration, lazy-mcp support, and enhanced profile management.

**Migration Goals**:
1. **Zero Data Loss**: All existing configurations and blocks migrate successfully
2. **Feature Parity**: All v0.5.2 features available in v2.0.0
3. **Smooth Transition**: Users can migrate with minimal friction
4. **Backward Compatibility**: v0.5.2 CLI remains available for transition period

## 1. Migration Overview

### 1.1 Scope

**What's Changing**:
- Packaging: npm package → Claude Code plugin
- Interface: CLI/TUI → Slash commands + hooks
- Blocking mechanism: permissions.deny → .mcp.json overrides (servers) + permissions.deny (memory/agents)
- MCP integration: Direct management → lazy-mcp integration

**What's Staying**:
- Core functionality: Enumerate, block, unblock
- Configuration format: settings.json (for memory/agents)
- User workflows: Same mental model
- CLI tool: Available alongside plugin

### 1.2 Migration Phases

**Phase 1: Plugin Development** (Weeks 1-4)
- Build core plugin infrastructure
- Implement slash commands and hooks
- Develop migration logic

**Phase 2: Beta Testing** (Week 5)
- Internal testing
- Early adopter program
- Feedback collection

**Phase 3: Release Preparation** (Week 6)
- Documentation finalization
- Migration guide creation
- Support resources

**Phase 4: Public Release** (Week 7)
- v2.0.0 release announcement
- Migration campaign
- User support

**Phase 5: Transition Period** (Months 2-4)
- Maintain both versions
- Monitor adoption
- Address issues

**Phase 6: Deprecation** (Month 6+)
- Sunset CLI tool
- Plugin becomes primary distribution

## 2. Technical Migration

### 2.1 Data Migration

#### 2.1.1 Legacy Configuration Detection

**Current State** (v0.5.2):
```
.claude/
├── blocked.md              # Legacy blocking list
└── settings.json           # permissions.deny for memory/agents
```

**Target State** (v2.0.0):
```
.claude/
├── settings.json           # permissions.deny for memory/agents
└── profiles/               # Profile system
    ├── development.json
    └── minimal.json

.mcp.json                   # Server overrides for blocking
```

**Migration Detection**:
```typescript
async function detectLegacyConfiguration(projectDir: string): Promise<LegacyConfig | null> {
  const blockedMdPath = path.join(projectDir, '.claude', 'blocked.md');

  if (!await fs.pathExists(blockedMdPath)) {
    return null; // No legacy config
  }

  const content = await fs.readFile(blockedMdPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

  const legacy: LegacyConfig = {
    filePath: blockedMdPath,
    mcpServers: [],
    memoryFiles: [],
    agents: [],
  };

  for (const line of lines) {
    if (line.startsWith('mcp:')) {
      legacy.mcpServers.push(line.substring(4).trim());
    } else if (line.startsWith('memory:')) {
      legacy.memoryFiles.push(line.substring(7).trim());
    } else if (line.startsWith('agent:')) {
      legacy.agents.push(line.substring(6).trim());
    }
  }

  return legacy;
}
```

#### 2.1.2 MCP Server Migration

**Legacy Format** (.claude/blocked.md):
```
mcp:sequential-thinking
mcp:filesystem
```

**Target Format** (.mcp.json):
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "echo",
      "args": ["Server blocked by mcp-toggle v2.0.0"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@anthropic/sequential-thinking-mcp"]
      }
    },
    "filesystem": {
      "command": "echo",
      "args": ["Server blocked by mcp-toggle v2.0.0"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem"]
      }
    }
  }
}
```

**Migration Logic**:
```typescript
async function migrateServerBlocks(
  projectDir: string,
  legacyServers: string[]
): Promise<MigrationResult> {
  // Load all MCP servers to find original configs
  const allServers = await loadMCPServers(projectDir);
  const migrated: string[] = [];
  const failed: Array<{ server: string; reason: string }> = [];

  // Create backup of existing .mcp.json
  const mcpJsonPath = path.join(projectDir, '.mcp.json');
  if (await fs.pathExists(mcpJsonPath)) {
    await fs.copy(mcpJsonPath, `${mcpJsonPath}.backup.${Date.now()}`);
  }

  // Read or create .mcp.json
  await ensureMcpJson(projectDir);
  const config = await readMcpJson(projectDir);

  for (const serverName of legacyServers) {
    // Find server in loaded configs
    const server = allServers.find(s => s.name === serverName);

    if (!server) {
      failed.push({
        server: serverName,
        reason: 'Server not found in current configuration'
      });
      continue;
    }

    // Create blocking override
    const original = {
      command: server.command,
      args: server.args,
      env: server.env,
    };

    config.mcpServers[serverName] = createDummyOverride(serverName, original);
    migrated.push(serverName);
  }

  // Write updated .mcp.json
  await writeMcpJson(projectDir, config);

  return {
    success: failed.length === 0,
    migrated,
    failed,
  };
}
```

**Handling Edge Cases**:
1. **Server Not Found**: Log warning, skip migration for that server
2. **Server Already Blocked**: Skip (idempotent migration)
3. **Conflicting Override**: Preserve newer blocking metadata

#### 2.1.3 Memory File Migration

**Legacy Format** (.claude/blocked.md):
```
memory:project-notes.md
memory:archive/old-notes.md
```

**Target Format** (.claude/settings.json):
```json
{
  "permissions": {
    "deny": [
      "memory:**/project-notes.md",
      "memory:**/archive/old-notes.md"
    ]
  }
}
```

**Migration Logic**:
```typescript
async function migrateMemoryBlocks(
  projectDir: string,
  legacyMemories: string[]
): Promise<void> {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');

  // Read or create settings.json
  let settings: any = {};
  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJSON(settingsPath);
  }

  // Initialize permissions.deny if not exists
  if (!settings.permissions) {
    settings.permissions = { deny: [] };
  }
  if (!Array.isArray(settings.permissions.deny)) {
    settings.permissions.deny = [];
  }

  // Add memory file patterns
  for (const memoryFile of legacyMemories) {
    const pattern = `memory:**/${memoryFile}`;

    // Avoid duplicates
    if (!settings.permissions.deny.includes(pattern)) {
      settings.permissions.deny.push(pattern);
    }
  }

  // Write updated settings
  await fs.writeJSON(settingsPath, settings, { spaces: 2 });
}
```

#### 2.1.4 Agent Migration

**Same as memory files** - uses permissions.deny in settings.json:
```json
{
  "permissions": {
    "deny": [
      "agent:**/deprecated-agent.md",
      "agent:**/experimental-agent.md"
    ]
  }
}
```

### 2.2 Code Migration

#### 2.2.1 Reusable Components

**From v0.5.2** (keep as-is):
- `src/core/config-loader.ts` - MCP server loading
- `src/core/memory-loader.ts` - Memory file enumeration
- `src/core/agent-manager.ts` - Agent discovery
- `src/utils/token-estimator.ts` - Token counting
- `src/utils/mcp-json-utils.ts` - Configuration utilities

**Refactor** (adapt for plugin):
- `src/core/blocked-manager.ts` - Use .mcp.json instead of blocked.md
- `src/tui/app.tsx` - Convert to command markdown + hooks

**New for Plugin**:
- `hooks/pre-tool-use.sh` - Hook enforcement
- `commands/*.md` - Slash command definitions
- `scripts/migration.js` - Automated migration logic
- `scripts/lazy-mcp-setup.js` - lazy-mcp configuration

#### 2.2.2 Directory Restructure

**Before** (v0.5.2 CLI):
```
mcp-toggle/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── core/               # Core business logic
│   ├── tui/                # TUI components
│   ├── models/             # Type definitions
│   └── utils/              # Utilities
├── tests/
├── bin/mcp-toggle          # CLI executable
└── package.json
```

**After** (v2.0.0 Plugin):
```
mcp-toggle/
├── .claude-plugin/
│   └── plugin.json         # Plugin manifest
├── commands/               # Slash commands
│   ├── toggle.md
│   ├── profile.md
│   ├── migrate.md
│   └── context-stats.md
├── hooks/                  # Hook scripts
│   ├── hooks.json
│   ├── pre-tool-use.sh
│   └── session-start.sh
├── scripts/                # Utility scripts (Node.js)
│   ├── block-enforcement.js
│   ├── migration.js
│   └── lazy-mcp-setup.js
├── src/                    # Shared core logic
│   ├── core/
│   ├── models/
│   └── utils/
├── cli/                    # CLI tool (legacy support)
│   ├── cli.ts
│   ├── tui/
│   └── index.ts
├── tests/
└── package.json
```

**Migration Path**:
1. Create new plugin structure
2. Move core logic to `src/`
3. Move CLI-specific code to `cli/`
4. Create new `commands/` and `hooks/`
5. Implement `scripts/` for plugin runtime
6. Update package.json with dual entry points

#### 2.2.3 Dual Distribution

**package.json**:
```json
{
  "name": "mcp-toggle",
  "version": "2.0.0",
  "description": "Complete Claude Code context management (CLI + Plugin)",
  "main": "dist/cli/index.js",
  "bin": {
    "mcp-toggle": "bin/mcp-toggle"
  },
  "files": [
    ".claude-plugin/",
    "commands/",
    "hooks/",
    "scripts/",
    "dist/",
    "bin/",
    "README.md"
  ],
  "keywords": [
    "claude-code",
    "mcp",
    "plugin",
    "cli",
    "context-management"
  ]
}
```

**Installation Options**:

1. **Plugin Only** (Recommended):
```bash
/plugin marketplace add machjesusmoto/claude-plugins
/plugin install mcp-toggle
```

2. **CLI Only** (Legacy):
```bash
npm install -g mcp-toggle
mcp-toggle
```

3. **Both** (Transition):
```bash
npm install -g mcp-toggle
/plugin install mcp-toggle
```

### 2.3 Testing Strategy

#### 2.3.1 Migration Testing

**Test Scenarios**:

1. **Empty Project** (no existing config)
   - Should: Create new .mcp.json, settings.json
   - Verify: No errors, clean installation

2. **Legacy blocked.md Only**
   - Given: .claude/blocked.md with mcp/memory/agent blocks
   - Should: Migrate to .mcp.json and settings.json
   - Verify: All blocks preserved, backup created

3. **Partial Migration** (settings.json exists)
   - Given: .claude/settings.json with some permissions.deny
   - Should: Merge new blocks, preserve existing
   - Verify: No duplicates, all data preserved

4. **Already Migrated** (idempotent)
   - Given: Previously migrated project
   - Should: Detect existing migration, skip
   - Verify: No changes, no errors

5. **Complex Configuration**
   - Given: 20+ servers, 50+ memory files, 10+ agents
   - Should: Migrate all items successfully
   - Verify: 100% migration rate, performance <5s

#### 2.3.2 Integration Testing

**Plugin Installation**:
- [ ] Install via `/plugin install`
- [ ] Validate plugin.json
- [ ] Verify commands registered
- [ ] Verify hooks registered

**Command Functionality**:
- [ ] `/toggle` enumerates all items
- [ ] `/toggle server X off` blocks server
- [ ] `/profile load` applies profile
- [ ] `/migrate` detects and migrates legacy config

**Hook Execution**:
- [ ] PreToolUse blocks disabled servers
- [ ] SessionStart detects migration needs
- [ ] Error messages are helpful

#### 2.3.3 Backward Compatibility Testing

**CLI Tool**:
- [ ] `mcp-toggle` works standalone
- [ ] `mcp-toggle --help` shows usage
- [ ] TUI interface still functional
- [ ] No regression in v0.5.2 features

**Coexistence**:
- [ ] CLI and plugin can coexist
- [ ] CLI detects plugin installation
- [ ] No conflicts between CLI and plugin

## 3. User Communication

### 3.1 Migration Guide

**Target Audience**: Existing v0.5.2 CLI users

**Structure**:
1. **Why Migrate**: Benefits of plugin version
2. **Before You Start**: Prerequisites and backups
3. **Step-by-Step**: Migration walkthrough with screenshots
4. **Verification**: How to confirm successful migration
5. **Troubleshooting**: Common issues and solutions
6. **FAQ**: Frequently asked questions

**Example Content**:
```markdown
# Migrating from CLI to Plugin

## Why Migrate?

The plugin version offers:
- ✅ Native Claude Code integration
- ✅ Slash commands (no external tool needed)
- ✅ 95% context reduction via lazy-mcp
- ✅ Profile system for workflows
- ✅ Automatic enforcement via hooks

## Before You Start

1. **Backup your configuration**:
   ```bash
   cp -r ~/.claude ~/.claude.backup
   cp .claude/blocked.md .claude/blocked.md.backup
   ```

2. **Install the plugin**:
   ```bash
   /plugin marketplace add machjesusmoto/claude-plugins
   /plugin install mcp-toggle
   /plugin enable mcp-toggle
   ```

3. **Restart Claude Code** to activate the plugin

## Migration Steps

### Step 1: Detect Legacy Configuration

Run the migration check:
```bash
/migrate check
```

Expected output:
```
📊 Legacy Configuration Detected

.claude/blocked.md:
  • 5 MCP servers blocked
  • 12 memory files blocked
  • 3 agents blocked

Ready to migrate to v2.0.0 format?
Run: /migrate to-v2
```

### Step 2: Review Migration Plan

Preview the changes:
```bash
/migrate to-v2 --dry-run
```

This shows what will change without making modifications.

### Step 3: Execute Migration

Run the migration:
```bash
/migrate to-v2
```

Expected output:
```
🔄 Migrating Configuration...

✅ Backup created: .claude/blocked.md.backup.1728720000
✅ Migrated 5 MCP servers to .mcp.json
✅ Migrated 12 memory files to settings.json
✅ Migrated 3 agents to settings.json

⚠️  Restart Claude Code to apply changes

Migration Summary:
  • Total items: 20
  • Migrated successfully: 20
  • Failed: 0
  • Backup location: .claude/blocked.md.backup.1728720000
```

### Step 4: Verify Migration

After restarting Claude Code:
```bash
/context-stats
```

Expected output:
```
📊 Context Overview

MCP Servers:
  • Active: 7
  • Blocked: 5 (migrated from blocked.md)

Memory Files:
  • Active: 8
  • Blocked: 12 (migrated from blocked.md)

Agents:
  • Active: 9
  • Blocked: 3 (migrated from blocked.md)

Migration Status: ✅ Complete
```

### Step 5: Set Up lazy-mcp (Optional)

For 95% context reduction:
```bash
/toggle setup-lazy-mcp
```

## Troubleshooting

### Migration Failed

If migration fails:
1. Check error message for details
2. Restore from backup: `cp .claude/blocked.md.backup.* .claude/blocked.md`
3. Report issue with error message

### Some Items Not Migrated

If some items failed:
- Check that servers still exist in configuration
- Verify file paths for memory files
- Review migration log: `.claude/mcp-toggle-migration.log`

### Plugin Not Working

If plugin doesn't work after migration:
- Verify plugin is enabled: `/plugin list`
- Check Claude Code version: Must be 2.0.12+
- Reinstall plugin: `/plugin reinstall mcp-toggle`
```

### 3.2 Release Announcement

**Channels**:
- GitHub Release
- npm Package Update
- Claude Code Plugin Marketplace
- Community Forums
- Social Media

**Announcement Template**:
```markdown
# mcp-toggle v2.0.0 - Now a Claude Code Plugin!

We're excited to announce mcp-toggle v2.0.0, now available as a native Claude Code plugin!

## What's New

✨ **Native Plugin Integration**
- Slash commands: `/toggle`, `/profile`, `/migrate`
- PreToolUse hooks for automatic enforcement
- Session lifecycle integration

🚀 **95% Context Reduction**
- Integration with voicetreelab/lazy-mcp
- Lazy loading for MCP servers
- Minimal context overhead

📋 **Profile System**
- Workflow-based configurations
- Team-shareable profiles
- One-command context switching

## Migration from CLI

Existing CLI users can migrate easily:
```bash
/plugin install mcp-toggle
/migrate to-v2
```

Full migration guide: https://github.com/machjesusmoto/mcp-toggle/blob/main/docs/MIGRATION.md

## Backward Compatibility

The CLI tool remains available for users who prefer it or are in transition.

## Get Started

Install via Claude Code:
```bash
/plugin marketplace add machjesusmoto/claude-plugins
/plugin install mcp-toggle
```

Documentation: https://github.com/machjesusmoto/mcp-toggle

## What's Next

- v2.1.0: Enhanced profile management
- v2.2.0: Usage analytics and optimization suggestions
- v3.0.0: Team collaboration features

Thank you to all contributors and the voicetreelab team for lazy-mcp integration!
```

### 3.3 Support Resources

#### 3.3.1 Documentation

**New Documents**:
- [ ] Migration guide (detailed walkthrough)
- [ ] Plugin user guide (slash commands, hooks)
- [ ] lazy-mcp integration guide
- [ ] Troubleshooting guide
- [ ] FAQ

**Updated Documents**:
- [ ] README.md (plugin-first, CLI secondary)
- [ ] CONTRIBUTING.md (plugin development)
- [ ] CHANGELOG.md (v2.0.0 release notes)

#### 3.3.2 Support Channels

**GitHub Issues**:
- Template for migration issues
- Label: `migration-support`
- Priority: High (for first 2 months)

**Discussions**:
- Migration Q&A thread
- Plugin feedback thread
- Feature requests

**Community**:
- Discord/Slack channel for real-time support
- Migration showcase (successful migrations)
- Video tutorials

## 4. Rollback Strategy

### 4.1 User Rollback

**If migration fails or user wants to revert**:

1. **Restore Backup**:
```bash
# Restore blocked.md
cp .claude/blocked.md.backup.TIMESTAMP .claude/blocked.md

# Restore .mcp.json
cp .mcp.json.backup.TIMESTAMP .mcp.json

# Restore settings.json
cp .claude/settings.json.backup.TIMESTAMP .claude/settings.json
```

2. **Uninstall Plugin**:
```bash
/plugin disable mcp-toggle
/plugin uninstall mcp-toggle
```

3. **Reinstall CLI**:
```bash
npm install -g mcp-toggle@0.5.2
```

4. **Verify**:
```bash
mcp-toggle  # Should work as before
```

### 4.2 Developer Rollback

**If critical bug discovered post-release**:

1. **Publish Patch Release**:
```bash
npm publish mcp-toggle@2.0.1  # With fix
```

2. **Update Plugin Marketplace**:
```bash
# Push fix to GitHub
# Plugin marketplace auto-updates
```

3. **Notify Users**:
```markdown
⚠️ Important Update: mcp-toggle v2.0.1

A critical issue was discovered in v2.0.0 affecting [description].

Please update immediately:
- Plugin users: `/plugin update mcp-toggle`
- CLI users: `npm update -g mcp-toggle`

Details: [Link to issue]
```

4. **Yanking if Severe**:
```bash
npm unpublish mcp-toggle@2.0.0  # Last resort
```

## 5. Timeline and Milestones

### Week 1: Plugin Infrastructure
- [ ] Plugin manifest and directory structure
- [ ] Basic /toggle command
- [ ] PreToolUse hook for server blocking

### Week 2: Hook Integration
- [ ] Complete hook implementation
- [ ] Memory and agent blocking
- [ ] Error handling and logging
- [ ] Internal testing

### Week 3: Profile System
- [ ] Profile storage and loading
- [ ] /profile commands
- [ ] Built-in profiles
- [ ] Profile migration logic

### Week 4: lazy-mcp Integration
- [ ] /toggle setup-lazy-mcp command
- [ ] Configuration generator
- [ ] Integration validation
- [ ] Documentation

### Week 5: Migration & Beta
- [ ] /migrate command complete
- [ ] Migration guide written
- [ ] Beta release (internal + early adopters)
- [ ] Feedback collection

### Week 6: Release Preparation
- [ ] Bug fixes from beta
- [ ] Final documentation review
- [ ] Release announcement draft
- [ ] Support resources ready

### Week 7: Public Release
- [ ] v2.0.0 release
- [ ] Announcement on all channels
- [ ] Monitor for issues
- [ ] Provide user support

### Months 2-4: Transition
- [ ] Support both CLI and plugin
- [ ] Monitor adoption metrics
- [ ] Collect feedback for v2.1
- [ ] Address migration issues

### Month 6+: Deprecation
- [ ] Announce CLI deprecation plan
- [ ] Final migration push
- [ ] Plugin becomes primary

## 6. Success Criteria

**Migration Success**:
- [ ] 90%+ of CLI users migrate to plugin within 3 months
- [ ] <5% migration failure rate
- [ ] All data preserved in successful migrations
- [ ] No critical bugs in first 2 weeks

**User Experience**:
- [ ] Average migration time <10 minutes
- [ ] Migration documentation clarity >4.5/5
- [ ] User satisfaction with plugin >4.0/5
- [ ] Support ticket resolution <48 hours

**Technical Quality**:
- [ ] Test coverage >80% for migration logic
- [ ] Zero data loss in migrations
- [ ] Rollback successful in 100% of cases
- [ ] Performance meets all requirements

## 7. Risk Mitigation

### 7.1 Identified Risks

**High Risk: Data Loss During Migration**
- **Mitigation**: Mandatory backups before migration
- **Detection**: Verification step after migration
- **Recovery**: Documented rollback procedure

**Medium Risk: User Confusion**
- **Mitigation**: Clear migration guide with screenshots
- **Detection**: Support ticket monitoring
- **Recovery**: Enhanced documentation, video tutorials

**Medium Risk: Plugin Installation Failures**
- **Mitigation**: Automated validation, helpful error messages
- **Detection**: Installation analytics
- **Recovery**: Support resources, manual installation guide

**Low Risk: Backward Compatibility Breaking**
- **Mitigation**: Maintain CLI tool, version pinning
- **Detection**: Automated compatibility tests
- **Recovery**: Patch release with fix

### 7.2 Contingency Plans

**Plan A: Migration Wizard Fails**
- Fallback to manual migration instructions
- Provide migration scripts users can run directly
- Enhanced support documentation

**Plan B: Plugin Installation Blocked**
- Alternative npm installation method
- Manual plugin installation guide
- Git clone + manual setup instructions

**Plan C: Critical Bug Post-Release**
- Emergency patch release process
- Rollback instructions for affected users
- Communication plan for transparency

## 8. Open Items

**Technical**:
- [ ] Finalize .mcp.json override format validation
- [ ] Confirm memory file blocking mechanism
- [ ] Test on all supported platforms (Windows/macOS/Linux)

**Documentation**:
- [ ] Video walkthrough of migration
- [ ] Screenshots for each step
- [ ] FAQ based on beta feedback

**Process**:
- [ ] Beta tester recruitment
- [ ] Support team training
- [ ] Release checklist finalization

## 9. References

- [Plugin Requirements](./PLUGIN_REQUIREMENTS.md)
- [Integration Strategy](./INTEGRATION_STRATEGY.md)
- [v0.5.2 Codebase](/home/dtaylor/motodev/projects/mcp_toggle/)
- [Claude Code Plugin Documentation](https://docs.claude.com/en/docs/claude-code/plugins)

---

**Document Status**: Draft
**Next Steps**: Review with development team, begin Phase 1 implementation
**Last Updated**: October 12, 2025

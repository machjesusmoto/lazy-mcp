# Migration Architecture
*mcp-toggle CLI to Plugin Transformation*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## 1. Migration Overview

### 1.1 Current State (v1.x CLI Tool)

**Architecture:**
```
mcp-toggle CLI (v1.x)
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── tui/                      # Terminal UI (Ink/React)
│   │   ├── app.tsx               # Main TUI application
│   │   ├── components/           # TUI components
│   │   └── hooks/                # React hooks
│   ├── core/                     # Business logic
│   │   ├── config-loader.ts      # Load MCP servers
│   │   ├── blocked-manager.ts    # Blocking operations
│   │   ├── memory-loader.ts      # Load memory files
│   │   └── agent-manager.ts      # Agent management
│   ├── models/                   # Type definitions
│   └── utils/                    # Utilities
└── package.json

Usage:
  $ npx mcp-toggle                # Interactive TUI
  $ npx mcp-toggle server context7 off

Configuration Format:
  .claude/blocked.md              # Legacy format (v1.x)
  mcp:server-name
  memory:file.md
  agent:agent-name
```

**Strengths:**
- ✅ Fully functional blocking mechanism
- ✅ Interactive TUI with good UX
- ✅ Works independently of Claude Code
- ✅ Battle-tested with real usage

**Limitations:**
- ❌ External tool (not integrated into Claude Code)
- ❌ No PreToolUse hook enforcement
- ❌ Manual restart required (no feedback loop)
- ❌ No lazy loading mechanism
- ❌ Limited token reduction (removes servers but doesn't prevent loading)

---

### 1.2 Target State (v2.0 Plugin)

**Architecture:**
```
mcp-toggle Plugin (v2.0)
├── .claude-plugin/
│   └── plugin.json               # Plugin manifest
├── commands/                      # Slash commands
│   ├── toggle.md
│   ├── profile.md
│   ├── migrate.md
│   └── context-stats.md
├── hooks/                         # Event handlers
│   ├── hooks.json
│   ├── pre-tool-use.ts           # PreToolUse enforcement
│   ├── session-start.ts          # Session initialization
│   └── session-end.ts            # Analytics tracking
├── registry/                      # Registry MCP server
│   ├── server.ts                 # Lightweight discovery server
│   ├── keyword-matcher.ts        # Intelligent matching
│   └── metadata.json             # Server database
├── core/                          # Shared business logic
│   ├── config-manager.ts         # ← Reused from CLI
│   ├── profile-manager.ts        # ← New
│   ├── block-state-tracker.ts    # ← Enhanced from CLI
│   ├── migration-engine.ts       # ← New
│   └── analytics.ts              # ← New
├── lib/                           # Utilities (reused from CLI)
└── package.json

Usage:
  /toggle                          # Interactive command
  /toggle server context7 off      # Direct command
  /profile switch react-dev        # Profile management
  /migrate                         # Legacy migration

Configuration Format:
  .mcp.json                        # v2.0 format (Claude Code native)
  Dummy overrides with metadata
  .md.blocked for memory files
  settings.json deny patterns for agents
```

**Enhancements:**
- ✅ Integrated into Claude Code
- ✅ PreToolUse hook enforcement
- ✅ Registry pattern for lazy loading
- ✅ Profile system for workflows
- ✅ 78-95% token reduction
- ✅ Team collaboration support
- ✅ Analytics and optimization suggestions

---

## 2. Migration Strategy

### 2.1 Phase-Based Approach

#### Phase 1: Foundation (Week 1)

**Goal**: Working plugin with basic toggle functionality

**Tasks:**
1. **Project Restructure**
   - Create monorepo with `packages/core`, `packages/cli`, `packages/plugin`
   - Extract shared logic to `packages/core`
   - Add Lerna or npm workspaces for monorepo management

2. **Plugin Manifest**
   - Create `.claude-plugin/plugin.json`
   - Define plugin metadata
   - Configure command paths

3. **Command Implementation**
   - Convert TUI to command guidance (markdown)
   - Implement `/toggle` command
   - Add basic argument parsing

4. **Core Library Refactor**
   - Make `config-manager` plugin-aware
   - Update `blocked-manager` for v2.0 format
   - Add `.mcp.json` utilities

**Deliverables:**
- ✓ Monorepo structure
- ✓ Plugin installable via `/plugin install`
- ✓ `/toggle` command functional
- ✓ CLI tool still works (no breaking changes)

**Success Criteria:**
- Plugin installs without errors
- Can toggle servers on/off
- Changes persist across restarts
- CLI tool remains functional

---

#### Phase 2: Hook Integration (Week 2)

**Goal**: PreToolUse enforcement and user feedback

**Tasks:**
1. **Hook Configuration**
   - Create `hooks/hooks.json` with matchers
   - Implement `pre-tool-use.ts` handler
   - Add hook input/output parsing

2. **Blocking Logic**
   - Detect blocked servers from `.mcp.json`
   - Block tool calls with helpful messages
   - Log blocking events

3. **Session Hooks**
   - Implement `session-start.ts` for initialization
   - Implement `session-end.ts` for analytics
   - Add profile loading to session start

4. **Error Handling**
   - Add comprehensive error messages
   - Implement rollback on failures
   - Create error logging system

**Deliverables:**
- ✓ PreToolUse hook blocks disabled servers
- ✓ User sees helpful error messages
- ✓ Session lifecycle hooks active
- ✓ Error recovery implemented

**Success Criteria:**
- Blocked servers cannot be called
- User gets clear instructions to unblock
- Hooks execute in <50ms
- Graceful degradation on hook failures

---

#### Phase 3: Registry Implementation (Week 3-4)

**Goal**: Lazy loading pattern with registry MCP server

**Tasks:**
1. **Registry Server Development**
   - Create MCP server with Model Context Protocol SDK
   - Implement tool schemas (list, info, suggest, load)
   - Build keyword matching engine

2. **Metadata Database**
   - Create server metadata structure
   - Add keyword mappings for all common servers
   - Build category taxonomy

3. **Keyword Matcher**
   - Implement scoring algorithm
   - Add fuzzy matching support
   - Create suggestion ranking

4. **Registry Integration**
   - Register in plugin manifest
   - Test with Claude Code
   - Measure token reduction

**Deliverables:**
- ✓ Registry MCP server operational
- ✓ Keyword matching accurate
- ✓ Suggestions helpful and relevant
- ✓ Token usage < 5k for registry

**Success Criteria:**
- Registry loads on session start
- Suggestions match user intent (>80% accuracy)
- Token reduction: 78-95% achieved
- Query latency <10ms

---

#### Phase 4: Profile System (Week 3-4)

**Goal**: Workflow-based configuration management

**Tasks:**
1. **Profile Schema**
   - Define JSON schema for profiles
   - Create validation logic
   - Add built-in profiles

2. **Profile Manager**
   - Implement CRUD operations
   - Build profile application logic
   - Add diff calculation

3. **Command Implementation**
   - Create `/profile` command
   - Add interactive profile selection
   - Implement profile editor

4. **Team Collaboration**
   - Add repository-level profile support
   - Create profile sharing mechanism
   - Document team workflow

**Deliverables:**
- ✓ Profile system operational
- ✓ Built-in profiles available
- ✓ Custom profile creation works
- ✓ Team profiles shareable

**Success Criteria:**
- Profile switch <200ms
- Profile application atomic (rollback on error)
- Team members can share profiles
- Profile format documented

---

#### Phase 5: Migration & Compatibility (Week 5)

**Goal**: Seamless v1 → v2 migration and CLI compatibility

**Tasks:**
1. **Migration Engine**
   - Detect legacy `.claude/blocked.md`
   - Parse legacy format
   - Transform to v2.0 format

2. **Migration Command**
   - Implement `/migrate` command
   - Add dry-run mode
   - Create migration report

3. **CLI Compatibility**
   - Ensure CLI uses shared core
   - Test CLI and plugin together
   - Verify configuration compatibility

4. **Documentation**
   - Write migration guide
   - Create troubleshooting section
   - Add video walkthrough

**Deliverables:**
- ✓ Migration command functional
- ✓ Legacy users can migrate easily
- ✓ CLI and plugin interoperable
- ✓ Migration guide complete

**Success Criteria:**
- 100% successful migrations (no data loss)
- Migration <5 seconds
- CLI and plugin don't conflict
- Clear rollback instructions

---

#### Phase 6: Polish & Distribution (Week 6)

**Goal**: Production-ready plugin

**Tasks:**
1. **Testing**
   - Unit tests (>80% coverage)
   - Integration tests
   - E2E tests with Claude Code
   - Performance benchmarks

2. **Documentation**
   - User guide
   - Developer guide
   - API reference
   - Architecture docs

3. **Distribution**
   - Create marketplace listing
   - Set up CI/CD for releases
   - Create demo videos
   - Write blog post

4. **Community**
   - Create GitHub discussions
   - Set up issue templates
   - Write contributing guide
   - Plan feature roadmap

**Deliverables:**
- ✓ Test coverage >80%
- ✓ Documentation complete
- ✓ Plugin published to marketplace
- ✓ Community resources ready

**Success Criteria:**
- All tests passing
- Documentation covers all features
- Plugin appears in Claude Code marketplace
- Positive community feedback

---

### 2.2 Code Migration Patterns

#### Pattern 1: Extract Shared Logic

**Before (v1.x CLI):**
```typescript
// src/core/config-loader.ts (CLI-specific)
export async function loadMCPServers(projectDir: string): Promise<MCPServer[]> {
  // CLI-specific logic
  const settings = await loadSettings();
  // ...
}
```

**After (v2.0 Monorepo):**
```typescript
// packages/core/src/config-manager.ts (shared)
export async function loadMCPServers(projectDir: string): Promise<MCPServer[]> {
  // Shared logic, framework-agnostic
  const config = await readMcpJson(projectDir);
  // ...
}

// packages/cli/src/cli.ts (CLI uses core)
import { loadMCPServers } from '@mcp-toggle/core';

// packages/plugin/src/hooks/pre-tool-use.ts (plugin uses core)
import { loadMCPServers } from '@mcp-toggle/core';
```

---

#### Pattern 2: TUI → Command Markdown

**Before (v1.x CLI):**
```typescript
// src/tui/app.tsx (interactive TUI)
export function App() {
  const [servers, setServers] = useState([]);

  return (
    <Box flexDirection="column">
      <ServerList servers={servers} onToggle={handleToggle} />
    </Box>
  );
}
```

**After (v2.0 Plugin):**
```markdown
<!-- commands/toggle.md (command guidance) -->
---
description: Toggle MCP servers and memory files
---

# /toggle Command

When user runs /toggle:
1. Load current configuration from .mcp.json
2. Display interactive menu using native Claude capabilities
3. Apply user selections
4. Notify to restart
```

---

#### Pattern 3: Blocking Mechanism Update

**Before (v1.x CLI):**
```typescript
// .claude/blocked.md format
function blockServer(name: string) {
  // Add line to blocked.md
  await appendFile('.claude/blocked.md', `mcp:${name}\n`);
}
```

**After (v2.0 Plugin):**
```typescript
// .mcp.json format with dummy override
function blockServer(server: MCPServer) {
  const config = await readMcpJson(projectDir);
  config.mcpServers[server.name] = {
    command: 'echo',
    args: ['Blocked by mcp-toggle'],
    _mcpToggleBlocked: true,
    _mcpToggleBlockedAt: new Date().toISOString(),
    _mcpToggleOriginal: server,
  };
  await writeMcpJson(projectDir, config);
}
```

---

### 2.3 Data Migration

#### Configuration Format Transformation

**Legacy Format (v1.x):**
```
.claude/blocked.md:
  mcp:sequential-thinking
  mcp:database
  memory:production-notes.md
  agent:security-audit
```

**New Format (v2.0):**
```json
.mcp.json:
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "echo",
      "args": ["Blocked by mcp-toggle"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@sequential/server"]
      }
    },
    "database": {
      "command": "echo",
      "args": ["Blocked by mcp-toggle"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
      "_mcpToggleOriginal": {
        "command": "node",
        "args": ["./database-server.js"]
      }
    }
  }
}

.claude/memories/:
  production-notes.md.blocked       ← Renamed

settings.json:
{
  "permissions": {
    "deny": {
      "agents": ["security-audit"]  ← Added
    }
  }
}
```

---

### 2.4 Rollback Strategy

#### Scenario: Migration Fails Halfway

```
Migration Process:
  1. ✓ Backup legacy files
  2. ✓ Transform MCP servers → .mcp.json
  3. ✗ Transform memory files (ERROR: Permission denied)
  4. [ROLLBACK TRIGGERED]

Rollback Actions:
  1. Delete partial .mcp.json
  2. Restore from backup: .claude/blocked.md
  3. Revert any renamed memory files
  4. Log error details
  5. Notify user:
     "❌ Migration failed: Permission denied
      ✓ Configuration restored from backup
      📝 Details in .claude/mcp-toggle-errors.log
      💡 Fix permissions and retry /migrate"
```

---

## 3. Compatibility Matrix

### 3.1 Version Compatibility

| Component | v1.x CLI | v2.0 Plugin | Compatible? |
|-----------|----------|-------------|-------------|
| Configuration Format | `.claude/blocked.md` | `.mcp.json` | Yes (via migration) |
| CLI Tool | Standalone | Shared core | Yes (both work) |
| Blocking Mechanism | File-based | Override-based | No (different approach) |
| Profile System | No | Yes | N/A |
| Hook Integration | No | Yes | N/A |
| Token Reduction | ~50% | 78-95% | Better in v2 |

### 3.2 Interoperability

**Can CLI and Plugin coexist?**
- ✅ Yes, they share the same core library
- ✅ Both read/write same configuration formats
- ✅ CLI can be used outside Claude Code
- ✅ Plugin integrates with Claude Code

**Which should users use?**
- **Plugin**: Primary recommendation (integrated, hooks, lazy loading)
- **CLI**: For non-Claude Code environments, CI/CD, scripts

---

## 4. Migration Risks & Mitigation

### 4.1 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Atomic backups, rollback on error |
| Performance degradation | Medium | High | Benchmark hooks, optimize registry |
| Breaking changes for CLI users | Low | Medium | Maintain v1.x branch, clear migration guide |
| Plugin installation failures | Medium | High | Comprehensive testing, fallback instructions |
| Configuration conflicts | Medium | Medium | Conflict detection, user resolution prompts |
| Hook execution failures | Low | High | Error handling, graceful degradation |

### 4.2 Mitigation Strategies

**Data Loss Prevention:**
- Atomic operations with rollback
- Timestamped backups before all operations
- Verification after every write
- Manual backup instructions in docs

**Performance Optimization:**
- Hook execution <50ms (timeout enforcement)
- Registry server <5k tokens (schema optimization)
- Lazy initialization of components
- Caching for repeated operations

**Breaking Changes:**
- Maintain v1.x CLI as separate tool
- Provide migration guide
- Support both formats during transition
- Clear deprecation timeline (v1 supported for 6 months)

**Installation Failures:**
- Pre-installation checks (Node.js version, permissions)
- Clear error messages with remediation
- Fallback to manual installation
- Community support channels

---

## 5. Testing Strategy

### 5.1 Test Pyramid

```
                    ▲
                   / \
                  /   \
                 / E2E \           5% (Full Claude Code integration)
                /       \
               /---------\
              /           \
             / Integration \      15% (Component interaction)
            /               \
           /-----------------\
          /                   \
         /      Unit Tests     \   80% (Core logic, utilities)
        /                       \
       /-------------------------\
```

### 5.2 Test Coverage Requirements

**Unit Tests (80% coverage):**
- Core logic: config-manager, profile-manager, migration-engine
- Utilities: file operations, JSON parsing, validation
- Models: type guards, validators

**Integration Tests (15% coverage):**
- Plugin installation flow
- Hook execution chain
- Configuration loading hierarchy
- Profile application

**E2E Tests (5% coverage):**
- Full toggle workflow in Claude Code
- Profile switching end-to-end
- Migration from v1 to v2
- Error recovery scenarios

### 5.3 Test Environments

**Development:**
- Local Claude Code instance
- Test projects with mock configurations
- Unit test runner (Jest)

**CI/CD:**
- GitHub Actions
- Matrix testing (Node 18, 20, 22)
- Coverage reporting (Codecov)

**Staging:**
- Pre-release testing
- Beta user feedback
- Performance benchmarks

---

## 6. Timeline & Milestones

### 6.1 Detailed Schedule

**Week 1: Foundation**
- Days 1-2: Monorepo setup, extract shared logic
- Days 3-4: Plugin manifest, command structure
- Days 5-7: Basic toggle functionality, testing

**Week 2: Hooks**
- Days 1-3: PreToolUse implementation
- Days 4-5: Session hooks, error handling
- Days 6-7: Integration testing, refinement

**Week 3: Registry (Part 1)**
- Days 1-3: Registry MCP server development
- Days 4-5: Metadata database creation
- Days 6-7: Testing and optimization

**Week 4: Registry (Part 2) + Profiles**
- Days 1-3: Keyword matcher, suggestion engine
- Days 4-5: Profile system implementation
- Days 6-7: Profile commands, team features

**Week 5: Migration**
- Days 1-3: Migration engine development
- Days 4-5: CLI compatibility verification
- Days 6-7: Migration testing, documentation

**Week 6: Polish**
- Days 1-3: Comprehensive testing
- Days 4-5: Documentation completion
- Days 6-7: Marketplace submission, launch

### 6.2 Go/No-Go Criteria

**Phase 1 (Foundation):**
- ✓ Plugin installs successfully
- ✓ Toggle command functional
- ✓ CLI still works
- ✓ No breaking changes

**Phase 2 (Hooks):**
- ✓ PreToolUse blocks disabled servers
- ✓ Hook execution <50ms
- ✓ Error messages helpful
- ✓ Graceful degradation works

**Phase 3 (Registry):**
- ✓ Registry loads successfully
- ✓ Token usage <5k
- ✓ Suggestions relevant (>80%)
- ✓ Query latency <10ms

**Phase 4 (Profiles):**
- ✓ Profile application atomic
- ✓ Built-in profiles work
- ✓ Custom profiles supported
- ✓ Team sharing functional

**Phase 5 (Migration):**
- ✓ 100% successful migrations
- ✓ No data loss
- ✓ CLI compatible
- ✓ Rollback tested

**Phase 6 (Launch):**
- ✓ Test coverage >80%
- ✓ Documentation complete
- ✓ No critical bugs
- ✓ Marketplace approved

---

## 7. Post-Migration Support

### 7.1 Deprecation Timeline

**v1.x CLI Support:**
- **Months 1-3**: Full support, bug fixes
- **Months 4-6**: Security fixes only
- **Month 7+**: End of life, community support

### 7.2 User Communication

**Migration Announcement:**
- Blog post explaining benefits
- Email to existing users
- In-app notification in CLI
- Migration guide with video

**Support Channels:**
- GitHub Discussions for questions
- Migration troubleshooting guide
- FAQ document
- Community Discord/Slack

### 7.3 Monitoring & Metrics

**Success Metrics:**
- Migration completion rate: >90%
- Plugin installation success: >95%
- User satisfaction: >4/5 stars
- Token reduction: 78-95% achieved
- Hook performance: <50ms average

**Monitoring:**
- Error logging (anonymous)
- Performance metrics
- Usage analytics (opt-in)
- User feedback surveys

---

## Summary

The migration from CLI tool to Claude Code plugin follows a structured 6-phase approach over 6 weeks, with clear milestones, testing requirements, and success criteria at each stage. The architecture maintains compatibility with the existing CLI tool through a shared core library, enabling users to choose their preferred interface while ensuring consistent behavior across both implementations. The migration prioritizes data safety through atomic operations, comprehensive backups, and rollback capabilities, while delivering significant improvements in token reduction (78-95%), user experience (integrated commands and hooks), and team collaboration (shared profiles and repository-level configuration).

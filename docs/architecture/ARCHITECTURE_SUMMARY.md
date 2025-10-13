# Architecture Summary
*Quick Reference for Requirements Analyst*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## Executive Summary

The mcp-toggle plugin architecture addresses the constraint that **runtime MCP server loading is not available** in Claude Code while achieving 78-95% token reduction through a hybrid approach combining:

1. **PreToolUse Hooks** - Block disabled tools and provide feedback
2. **Registry MCP Server** - Lightweight discovery (~5k tokens)
3. **Profile System** - Workflow-based configuration

## Key Architecture Decisions

### Core Approach: Hybrid (TDR-001)

**Problem**: Claude Code doesn't support runtime server loading/unloading

**Solution**: Three-layer approach
- **Hooks**: Enforce blocking, provide user feedback (works now)
- **Registry**: Minimize token usage through lightweight discovery (95% reduction proven)
- **Profiles**: Make configuration changes user-friendly (one restart per workflow)

**Impact**: 78-95% token reduction achievable without runtime loading

### Blocking Mechanism: Dummy Override (TDR-002)

**Problem**: Need reversible blocking that preserves original config

**Solution**: Create dummy override in project `.mcp.json`
```json
{
  "server-name": {
    "command": "echo",
    "args": ["Blocked by mcp-toggle"],
    "_mcpToggleBlocked": true,
    "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
    "_mcpToggleOriginal": { original config here }
  }
}
```

**Impact**: Fully reversible, no data loss, leverages native Claude Code precedence

### Code Organization: Monorepo (TDR-003)

**Problem**: Maintain both CLI tool and plugin with shared logic

**Solution**: Monorepo with shared core
```
packages/
├── core/     # Shared business logic
├── cli/      # CLI tool (existing)
└── plugin/   # Plugin (new)
```

**Impact**: Both interfaces use identical logic, guaranteed compatibility

## Component Overview

### 1. Commands (Slash Commands)

| Command | Purpose | Primary Use |
|---------|---------|-------------|
| `/toggle` | Interactive server/memory/agent blocking | Daily workflow management |
| `/profile` | Workflow-based configuration | Context switching |
| `/migrate` | Legacy format migration | One-time upgrade |
| `/context-stats` | Token usage monitoring | Optimization insights |

### 2. Hooks (Event Handlers)

| Hook | Timing | Purpose | Performance |
|------|--------|---------|-------------|
| PreToolUse | Before tool call | Enforce blocking, provide feedback | <50ms |
| sessionStart | Session init | Load profile, detect migration | <100ms |
| sessionEnd | Session end | Save analytics, suggest optimizations | <100ms |

### 3. Registry MCP Server

**Purpose**: Lightweight server discovery and suggestion

**Token Budget**: ~5k tokens (vs. 38k+ for eager loading)

**Tools**:
- `registry/list` - List all available servers
- `registry/info` - Get server details
- `registry/suggest` - Keyword-based suggestions
- `registry/load` - Mark server for activation (requires restart)

**Performance**: <10ms query latency

### 4. Profile System

**Purpose**: Workflow-based configuration management

**Profile Format**: JSON files in `.claude/profiles/`

**Built-in Profiles**:
- `minimal` - Registry only (~5k tokens, 95% reduction)
- `react-dev` - React development (~34k tokens, 69% reduction)
- `wordpress` - WordPress development
- `full-stack` - Comprehensive development
- `documentation` - Writing and documentation

**Custom Profiles**: Users can create/share custom profiles

## Data Flow Highlights

### Toggle Server Flow
```
User: /toggle server context7 off
  ↓
1. Command handler parses input
2. Configuration manager loads current state
3. Block state tracker validates operation
4. Configuration writer creates dummy override (atomic with backup)
5. User notified: "⚠️ Restart Claude Code to apply"
```

### PreToolUse Hook Flow
```
Claude attempts: mcp__context7__search_docs
  ↓
1. Hook intercepts tool call
2. Reads .mcp.json for blocking metadata
3. Finds _mcpToggleBlocked: true
4. Returns: continue=false, systemMessage="⚠️ Server disabled..."
5. Claude displays message to user
```

### Profile Switch Flow
```
User: /profile switch react-dev
  ↓
1. Load profile configuration
2. Load current state
3. Calculate diff (what to enable/disable)
4. Create comprehensive backup
5. Apply all changes atomically
6. Verify changes
7. Update active profile marker
8. Notify user with token reduction estimate
```

## Token Reduction Impact

### Before Plugin (Typical Setup)
```
MCP Servers:  19 × ~2k = 38,000 tokens
Agents:       4 × ~5k  = 20,000 tokens
Memory Files: 10 files = 50,000 tokens
─────────────────────────────────────────
Total:                   108,000 tokens (54% of 200k)
```

### After Plugin - Minimal Profile
```
Registry Only:            5,000 tokens
─────────────────────────────────────────
Total:                    5,000 tokens (2.5% of 200k)
Reduction:              103,000 tokens (95%)
```

### After Plugin - React Dev Profile
```
Registry:                 5,000 tokens
context7:                 2,800 tokens
magic:                    5,200 tokens
playwright:               5,800 tokens
Memory (2 files):        10,000 tokens
Agent (1):                5,000 tokens
─────────────────────────────────────────
Total:                   33,800 tokens (17% of 200k)
Reduction:               74,200 tokens (69%)
```

## Migration Strategy

### 6-Phase Approach (6 Weeks)

| Phase | Duration | Goal | Deliverables |
|-------|----------|------|--------------|
| 1. Foundation | Week 1 | Working plugin with basic toggle | Plugin structure, manifest, commands |
| 2. Hooks | Week 2 | PreToolUse enforcement | Hook implementation, error handling |
| 3. Registry | Week 3-4 | Lazy loading pattern | Registry server, keyword matching |
| 4. Profiles | Week 3-4 | Workflow management | Profile system, built-in profiles |
| 5. Migration | Week 5 | Legacy support | Migration engine, CLI compatibility |
| 6. Polish | Week 6 | Production ready | Testing, docs, marketplace |

### Success Criteria by Phase

**Phase 1**: Plugin installs, toggle works, CLI still functional
**Phase 2**: Hooks block disabled servers in <50ms
**Phase 3**: Registry reduces tokens by 78-95%
**Phase 4**: Profile switch works atomically
**Phase 5**: 100% successful migrations, no data loss
**Phase 6**: >80% test coverage, documentation complete

## API Highlights for Requirements

### Configuration Manager API
```typescript
// Load all servers with hierarchy
loadMCPServers(projectDir: string): Promise<MCPServer[]>

// Block inherited server (dummy override)
blockInheritedServer(projectDir: string, server: MCPServer): Promise<void>

// Block local server (remove from config)
blockLocalServer(projectDir: string, serverName: string): Promise<void>

// Unblock server (remove override)
unblockInheritedServer(projectDir: string, serverName: string): Promise<void>

// Unblock local (requires manual re-add)
unblockLocalServer(projectDir: string, serverName: string): Promise<UnblockResult>
```

### Profile Manager API
```typescript
// List available profiles
listProfiles(projectDir: string): Promise<ProfileMetadata[]>

// Load profile configuration
loadProfile(projectDir: string, profileName: string): Promise<Profile>

// Apply profile to project
applyProfile(projectDir: string, profile: Profile): Promise<ProfileApplicationResult>

// Create custom profile
createProfile(projectDir: string, name: string, config: Partial<Profile>): Promise<void>
```

### Migration Engine API
```typescript
// Detect legacy configuration
detectLegacyConfiguration(projectDir: string): Promise<LegacyDetectionResult>

// Migrate from v1.x format
migrateLegacyConfiguration(projectDir: string, options?: MigrationOptions): Promise<MigrationResult>
```

## Performance Targets

| Metric | Target | Critical? |
|--------|--------|-----------|
| Plugin load time | <100ms | Yes |
| Command response | <200ms | Yes |
| Hook execution | <50ms | Critical |
| Registry query | <10ms | Yes |
| Profile switch | <500ms | No |
| Token reduction | 78-95% | Critical |

## Risk Mitigation

### Critical Risks

**Risk**: Data loss during configuration operations
**Mitigation**: Atomic operations with timestamped backups, rollback on error

**Risk**: Hook performance degradation
**Mitigation**: 10-second timeout, <50ms target, performance benchmarks

**Risk**: Breaking changes for CLI users
**Mitigation**: Shared core library, maintain v1.x branch, clear migration guide

### High Risks

**Risk**: Plugin installation failures
**Mitigation**: Pre-installation checks, clear error messages, fallback instructions

**Risk**: Configuration conflicts during migration
**Mitigation**: Conflict detection, user resolution prompts, dry-run mode

## User Stories Implications

### US1: Toggle MCP Servers
**Architecture Support**:
- Command handler: `/toggle server <name> [on|off]`
- Config manager: Block/unblock operations
- PreToolUse hook: Enforce blocking
- Atomic backup/rollback: Data safety

**Key Flows**: See `03-DATA_FLOW_DIAGRAMS.md` Section 1

### US2: Profile Management
**Architecture Support**:
- Command handler: `/profile switch <name>`
- Profile manager: CRUD operations, apply profile
- Config manager: Batch blocking operations
- Analytics: Track profile usage, suggest optimizations

**Key Flows**: See `03-DATA_FLOW_DIAGRAMS.md` Section 2

### US3: Registry Discovery
**Architecture Support**:
- Registry MCP server: Lightweight discovery
- Keyword matcher: Intelligent suggestions
- Metadata database: Fast queries (<10ms)
- Static data: Offline-friendly, predictable

**Key Flows**: See `03-DATA_FLOW_DIAGRAMS.md` Section 4

### US4: Migration Support
**Architecture Support**:
- Migration engine: Legacy format detection and transformation
- Command handler: `/migrate` with dry-run
- Conflict resolution: User prompts for conflicts
- Backup/rollback: Safe migration with recovery

**Key Flows**: See `03-DATA_FLOW_DIAGRAMS.md` Section 5

## Integration Patterns

### With Claude Code
- **Plugin Lifecycle**: Install → Enable → Use → Disable → Uninstall
- **Configuration Hierarchy**: Local (private) > Project (shared) > User (global)
- **Hooks**: PreToolUse, sessionStart, sessionEnd
- **Commands**: Slash commands with markdown guidance

### With Existing CLI
- **Shared Core**: Both use same business logic library
- **Configuration Compatibility**: Both read/write same formats
- **Coexistence**: Can use both together (CLI for scripts, plugin for interactive)

### With Team Workflows
- **Repository Settings**: Team marketplace configuration
- **Shared Profiles**: Version-controlled team profiles
- **Personal Overrides**: User-level customization

## Documentation Structure

All architecture documents are in `/docs/architecture/`:

1. **README.md** - This summary and index
2. **01-SYSTEM_ARCHITECTURE.md** - High-level overview
3. **02-COMPONENT_SPECIFICATIONS.md** - Component details
4. **03-DATA_FLOW_DIAGRAMS.md** - Operational flows
5. **04-API_SPECIFICATIONS.md** - API contracts
6. **05-INTEGRATION_PATTERNS.md** - Integration details
7. **06-MIGRATION_ARCHITECTURE.md** - Migration strategy
8. **07-TECHNICAL_DECISIONS.md** - Decision rationale

## Next Steps for Requirements Analyst

### Immediate Actions
1. **Review architecture documents** for completeness and clarity
2. **Create detailed user stories** based on:
   - Command specifications (Section 2.1 in Component Specs)
   - Data flows (entire Data Flow document)
   - API contracts (entire API Specs document)
3. **Define acceptance criteria** for each phase:
   - Use success criteria from Migration Architecture
   - Add edge cases and error scenarios
   - Include performance benchmarks

### User Story Template
```
As a [persona]
I want to [action]
So that [benefit]

Acceptance Criteria:
- [ ] Functional: [behavior]
- [ ] Performance: [target from specs]
- [ ] Error Handling: [recovery scenario]
- [ ] Documentation: [help text]

Technical Notes:
- Architecture: [reference to component]
- Data Flow: [reference to diagram]
- API: [reference to API spec]
```

### Key Questions to Address
1. What are the critical error scenarios for each user flow?
2. What feedback does the user need at each step?
3. How do we handle edge cases (e.g., very slow file systems)?
4. What analytics do we track (opt-in, anonymous)?
5. What are the onboarding requirements for new users?

## Resources

### Research Documents
- Plugin System Research: `/docs/PLUGIN_SYSTEM_RESEARCH.md` (comprehensive)
- Research Summary: `/docs/RESEARCH_EXECUTIVE_SUMMARY.md` (quick reference)

### Specification Documents
- v2.0.0 Specification: `/docs/specs/002-redesign-mcp-toggle/SPEC.md`
- Migration Specification: `/docs/specs/003-add-migrate-to/SPEC.md`

### Implementation Code
- Current CLI: `/src/` (to be refactored)
- Target Structure: `/packages/core/`, `/packages/cli/`, `/packages/plugin/`

### External References
- Claude Code Plugin Docs: https://docs.claude.com/en/docs/claude-code/plugins
- Claude Code Hooks: https://docs.claude.com/en/docs/claude-code/hooks
- GitHub Issue #7336: Lazy loading proof of concept

---

**Status**: ✅ Architecture Complete
**Total Documents**: 8 documents, ~170KB of documentation
**Next Phase**: Requirements analysis and user story creation

**Questions?** Contact the system architect or review detailed documents in `/docs/architecture/`

# mcp-toggle Plugin Architecture Documentation
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## Overview

This directory contains comprehensive architecture documentation for converting mcp-toggle from a CLI tool to a Claude Code plugin with lazy loading capabilities. The architecture addresses the fundamental constraint that **runtime MCP server loading is not yet available** while achieving 78-95% token reduction through a hybrid approach.

## Document Structure

### 1. System Architecture (`01-SYSTEM_ARCHITECTURE.md`)

**Purpose**: High-level system overview and component interactions

**Contents:**
- Executive summary of the plugin system
- System overview diagram
- Component architecture
- User interaction flows
- Token reduction impact

**Read this first** to understand the overall architecture and how components fit together.

### 2. Component Specifications (`02-COMPONENT_SPECIFICATIONS.md`)

**Purpose**: Detailed specifications for each component

**Contents:**
- Plugin directory structure and manifest
- Command handler implementations (`/toggle`, `/profile`, `/migrate`, `/context-stats`)
- Hook implementations (PreToolUse, sessionStart, sessionEnd)
- Registry MCP server design and implementation
- Core plugin engine specifications
- Performance targets and security considerations

**Read this** for implementation-level details of each component.

### 3. Data Flow Diagrams (`03-DATA_FLOW_DIAGRAMS.md`)

**Purpose**: Visualize how data moves through the system

**Contents:**
- Toggle server flow (enable/disable)
- Profile switch flow
- PreToolUse hook execution
- Registry query flow
- Migration flow
- Session lifecycle flow
- Error handling flow
- Token reduction impact flow

**Read this** to understand operational workflows and data movement.

### 4. API Specifications (`04-API_SPECIFICATIONS.md`)

**Purpose**: Internal and external API contracts

**Contents:**
- **Internal APIs**:
  - Configuration Manager API (loadMCPServers, blockServer, unblockServer)
  - Profile Manager API (listProfiles, loadProfile, applyProfile, createProfile)
  - Block State Tracker API (getBlockedServers, getBlockedMemory, getBlockedAgents)
  - Migration Engine API (detectLegacy, migrateLegacy)
  - Token Estimator API (estimateTokens, calculateReduction)
- **Registry MCP Server API**:
  - Tool schemas (registry/list, registry/info, registry/suggest, registry/load)
  - Input/output specifications
- **Hook APIs**:
  - PreToolUse, sessionStart, sessionEnd specifications
- **Error Handling**:
  - Standard error response format
  - Error codes and retry logic

**Read this** for API contracts and integration details.

### 5. Integration Patterns (`05-INTEGRATION_PATTERNS.md`)

**Purpose**: How components integrate with each other and Claude Code

**Contents:**
- Plugin lifecycle integration (installation, enable/disable)
- Configuration hierarchy integration (3-scope precedence)
- Hook integration (registration and execution chain)
- Registry MCP server integration
- Profile system integration
- Migration integration (legacy detection and transformation)
- CLI tool compatibility
- Team collaboration patterns
- Analytics integration
- Error recovery patterns

**Read this** to understand how the plugin integrates with Claude Code and other systems.

### 6. Migration Architecture (`06-MIGRATION_ARCHITECTURE.md`)

**Purpose**: Strategy for converting CLI tool to plugin

**Contents:**
- Current state (v1.x CLI) vs target state (v2.0 plugin)
- Phase-based migration approach (6 phases over 6 weeks)
- Code migration patterns
- Data migration (legacy format → v2.0 format)
- Rollback strategy
- Compatibility matrix
- Risk assessment and mitigation
- Testing strategy
- Timeline and milestones
- Post-migration support plan

**Read this** for the complete migration roadmap from CLI to plugin.

### 7. Technical Decisions (`07-TECHNICAL_DECISIONS.md`)

**Purpose**: Record of key architectural decisions and rationale

**Contents:**
- **TDR-001**: Hybrid Approach (Hooks + Registry + Profiles) - Core architecture
- **TDR-002**: Dummy Override Mechanism - Blocking implementation
- **TDR-003**: Monorepo Structure - Code organization
- **TDR-004**: Markdown-Based Commands - Command system
- **TDR-005**: JSON Schema Validation - Configuration safety
- **TDR-006**: Atomic Operations with Backup/Rollback - Data safety
- **TDR-007**: Static Registry Metadata - Registry design
- **TDR-008**: JSON Profile Format - Profile design
- **TDR-009**: .md.blocked Extension - Memory blocking
- **TDR-010**: Hook Timeout - Performance target

**Read this** to understand why key decisions were made and alternatives considered.

---

## Quick Reference

### For Implementation

**Starting development?**
1. Read `01-SYSTEM_ARCHITECTURE.md` (overview)
2. Read `02-COMPONENT_SPECIFICATIONS.md` (implementation details)
3. Reference `04-API_SPECIFICATIONS.md` (API contracts)
4. Check `07-TECHNICAL_DECISIONS.md` (understand why)

### For Integration

**Integrating with existing systems?**
1. Read `05-INTEGRATION_PATTERNS.md` (integration patterns)
2. Read `04-API_SPECIFICATIONS.md` (API contracts)
3. Reference `03-DATA_FLOW_DIAGRAMS.md` (operational flows)

### For Migration

**Migrating from v1.x CLI?**
1. Read `06-MIGRATION_ARCHITECTURE.md` (migration strategy)
2. Read `03-DATA_FLOW_DIAGRAMS.md` (migration flow)
3. Reference `05-INTEGRATION_PATTERNS.md` (CLI compatibility)

### For Architecture Review

**Reviewing architecture?**
1. Read `01-SYSTEM_ARCHITECTURE.md` (system overview)
2. Read `07-TECHNICAL_DECISIONS.md` (key decisions)
3. Review all other documents for completeness

---

## Key Architectural Decisions

### Core Constraint

**Runtime MCP server loading is not available** in Claude Code 2.0.12. All servers must be configured at session start and require a restart to change configuration.

### Solution: Hybrid Approach

Achieve 78-95% token reduction through:
1. **PreToolUse Hooks** - Block disabled server tools and provide user feedback
2. **Registry MCP Server** - Lightweight keyword-based server discovery (~5k tokens)
3. **Profile System** - Workflow-based configuration management (one restart per workflow)

### Token Reduction Impact

**Before Plugin (Eager Loading):**
- 19 MCP servers × ~2k = 38,000 tokens
- 4 agents × ~5k = 20,000 tokens
- 10 memory files = 50,000 tokens
- **Total: 108,000 tokens (54% of 200k limit)**

**After Plugin (Minimal Profile):**
- Registry server only = 5,000 tokens
- **Total: 5,000 tokens (2.5% of 200k limit)**
- **Token Reduction: 103,000 tokens (95%)**

**After Plugin (Selective Profile - react-dev):**
- Registry + 3 servers + 2 memory + 1 agent = 33,800 tokens
- **Total: 33,800 tokens (17% of 200k limit)**
- **Token Reduction: 74,200 tokens (69%)**

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Plugin load time | < 100ms | Session start |
| Command response | < 200ms | User input → feedback |
| Hook execution | < 50ms | Tool call interception |
| Registry query | < 10ms | Keyword matching |
| Token reduction | 78-95% | Context usage |

---

## Success Criteria

### Phase Completion Criteria

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

## Timeline

**Total Duration**: 6 weeks (6 phases)

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1 | Foundation (plugin structure, basic commands) |
| Phase 2 | Week 2 | Hooks (PreToolUse enforcement, session lifecycle) |
| Phase 3 | Week 3-4 | Registry (keyword matching, token optimization) |
| Phase 4 | Week 3-4 | Profiles (workflow management, team collaboration) |
| Phase 5 | Week 5 | Migration (legacy support, CLI compatibility) |
| Phase 6 | Week 6 | Polish (testing, documentation, distribution) |

---

## Related Documentation

### Research Documents
- **Plugin System Research**: `/docs/PLUGIN_SYSTEM_RESEARCH.md` (100+ sections, comprehensive)
- **Research Executive Summary**: `/docs/RESEARCH_EXECUTIVE_SUMMARY.md` (quick reference)

### Specification Documents
- **Core Specification**: `/docs/specs/002-redesign-mcp-toggle/SPEC.md` (v2.0.0 design)
- **Migration Specification**: `/docs/specs/003-add-migrate-to/SPEC.md` (migration feature)

### User Documentation
- **User Guide**: `/docs/user-guide/` (to be created in Phase 6)
- **Developer Guide**: `/docs/developer/` (to be created in Phase 6)

### Implementation Code
- **Plugin Source**: `/packages/plugin/` (to be created)
- **Core Library**: `/packages/core/` (to be created)
- **CLI Tool**: `/packages/cli/` (existing, to be refactored)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-12 | Initial architecture documentation for plugin conversion |

---

## Feedback and Contributions

This architecture is a living document and will evolve based on:
- Implementation discoveries
- User feedback
- Claude Code plugin system updates
- Performance benchmarks
- Community contributions

**Questions or suggestions?**
- Open an issue on GitHub
- Discuss in GitHub Discussions
- Contact the maintainers

---

## Next Steps

### For Requirements Analyst
- Review architecture documents for completeness
- Create detailed user stories based on specifications
- Define acceptance criteria for each phase
- Document edge cases and error scenarios

### For Development Team
- Review technical decisions and provide feedback
- Assess feasibility of performance targets
- Identify implementation risks
- Propose refinements or alternatives

### For Product Owner
- Review user-facing features (commands, profiles)
- Assess market fit and user value
- Prioritize features for MVP
- Define go/no-go criteria for launch

---

**Status**: ✅ Architecture Complete - Ready for Requirements Analysis

**Last Updated**: 2025-10-12 by System Architect

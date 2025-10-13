# mcp-toggle Plugin Conversion: Complete Planning Summary
*Version: 2.0.0*
*Last Updated: 2025-10-12*
*Status: Planning Complete → Ready for Implementation*

## 🎯 Executive Summary

mcp-toggle is evolving from a standalone CLI tool to a Claude Code plugin with integrated lazy loading. This transformation leverages voicetreelab/lazy-mcp for MCP server lazy loading while focusing mcp-toggle on unique value: memory file management, agent management, and workflow profiles.

**Key Decision**: Don't compete with Anthropic or duplicate lazy-mcp's work. Instead, integrate best-in-class solutions and focus on what makes mcp-toggle unique.

## 📊 Quick Stats

| Metric | Current (v0.5.2 CLI) | Target (v2.0.0 Plugin) |
|--------|----------------------|------------------------|
| Context Usage | ~108k tokens (54%) | 5-33k tokens (2.5-16.5%) |
| Restart Required | Yes | No (runtime hooks) |
| Setup Time | Manual config | <5 minutes automated |
| MCP Server Lazy Loading | No | Yes (via lazy-mcp) |
| Memory Management | Yes | Enhanced |
| Agent Management | Yes | Enhanced |
| Profile System | No | Yes |
| Integration | Standalone | Native Claude Code |

**Expected Outcome**: 50-95% context reduction, better UX, maintained backward compatibility

## 🔍 What We Discovered

### Claude Code Evolution
- **v2.0.10**: Native `/mcp` command for basic server toggling
- **v2.0.12**: Plugin System with hooks (PreToolUse, SessionStart, SessionEnd)
- **Key Insight**: Plugin hooks enable runtime blocking without restarts

### voicetreelab/lazy-mcp Discovery
- **What**: Production-ready Go-based MCP proxy server
- **How**: Exposes 2 meta-tools, lazy loads actual servers on demand
- **Impact**: 95% context reduction (2 tools vs 100+ tools)
- **Status**: Works TODAY, no Claude Code changes needed

### Overlap Analysis
**Significant Overlap**: Both planned to build registry/proxy for lazy loading
**Solution**: Use lazy-mcp as the registry component, don't rebuild it
**Focus**: Memory files, agents, profiles, user-friendly interface

## 🏗️ Architecture Overview

```
User
  ↓
mcp-toggle plugin (Claude Code)
  ├── Commands (/toggle:*, /profile:*, /context:*)
  ├── Hooks (PreToolUse, SessionStart, SessionEnd)
  ├── Memory Management (unique to mcp-toggle)
  ├── Agent Management (unique to mcp-toggle)
  └── Profile System (unique to mcp-toggle)
       ↓
  Configure lazy-mcp as registry
       ↓
voicetreelab/lazy-mcp (MCP proxy)
  ├── Meta-tools (get_tools_in_category, execute_tool)
  └── Lazy loading of actual MCP servers
       ↓
Actual MCP Servers (context7, serena, magic, playwright, etc.)
```

## 📚 Documentation Completed

### Research Phase
1. **PLUGIN_SYSTEM_RESEARCH.md** (24,000 words)
   - Comprehensive plugin system analysis
   - Hook capabilities and limitations
   - MCP server lifecycle management
   - Lazy loading feasibility assessment
   - 8 detailed code examples

2. **RESEARCH_EXECUTIVE_SUMMARY.md** (5 pages)
   - Bottom line feasibility assessment
   - Critical technical capabilities
   - 4-phase implementation strategy
   - Token impact analysis

3. **lazy-mcp-comparison.md** (2,500 words)
   - Overlap analysis with voicetreelab/lazy-mcp
   - Strategic options (Collaborate, Fork, Separate)
   - Recommendation: Option 1 - Integrate

### Architecture Phase
**docs/architecture/** (10 documents, 200+ pages)

1. **01-SYSTEM_ARCHITECTURE.md** - High-level overview with diagrams
2. **02-COMPONENT_SPECIFICATIONS.md** - Detailed component specs (18KB)
3. **03-DATA_FLOW_DIAGRAMS.md** - 8 operational workflows (38KB)
4. **04-API_SPECIFICATIONS.md** - 33 API contracts (16KB)
5. **05-INTEGRATION_PATTERNS.md** - 10 integration patterns (43KB)
6. **06-MIGRATION_ARCHITECTURE.md** - 6-phase migration strategy (20KB)
7. **07-TECHNICAL_DECISIONS.md** - 10 Technical Decision Records (22KB)
8. **ARCHITECTURE_SUMMARY.md** - Executive summary (10KB)
9. **DELIVERABLES.md** - Deliverables manifest
10. **README.md** - Navigation and index

**Key Architectural Decisions**:
- **TDR-001**: Hybrid approach (hooks + registry + profiles)
- **TDR-002**: Dummy override blocking mechanism
- **TDR-003**: Monorepo code organization
- Expected: 78-95% token reduction

### Requirements Phase
**docs/requirements/** (5 documents, 80+ pages)

1. **PLUGIN_REQUIREMENTS.md** (25KB, ~6,500 words)
   - Complete functional and non-functional requirements
   - Plugin infrastructure specifications
   - Integration requirements with lazy-mcp
   - Migration requirements from CLI
   - Testing, documentation, success metrics

2. **INTEGRATION_STRATEGY.md** (18KB, ~4,800 words)
   - Strategic rationale for lazy-mcp integration
   - Detailed system architecture diagrams
   - Configuration file relationships
   - User journey flows
   - Documentation and collaboration plan

3. **MIGRATION_PLAN.md** (21KB, ~5,500 words)
   - Complete technical migration strategy
   - Data migration logic (servers, memory, agents)
   - Code restructuring and dual distribution
   - Comprehensive testing strategy
   - 7-week phased rollout timeline

4. **USER_STORIES.md** (18KB, ~4,700 words)
   - 27 detailed user stories across 7 epics
   - 5 personas (Sarah, Tom, Maria, Alex, Lisa)
   - Given/When/Then scenario format
   - MoSCoW prioritization
   - Acceptance criteria and story points

5. **README.md** (5KB, ~1,300 words)
   - Navigation guide for all requirements docs
   - Quick reference for critical requirements
   - Key decisions and rationale

### Migration Roadmap
**MIGRATION_ROADMAP.md** (7,000 words)
- 6-phase implementation plan (7 weeks)
- Success metrics and KPIs
- Risk mitigation strategies
- Communication plan
- Timeline and milestones

## 🎯 What We're Building

### Core Features (v2.0.0)

#### 1. PreToolUse Hooks for Runtime Blocking
- Block MCP servers, memory files without restart
- <100ms performance target
- User-friendly feedback messages
- Graceful degradation on errors

#### 2. lazy-mcp Integration
- Configuration generator for lazy-mcp
- Hierarchical tool organization (JSON)
- Setup automation (<5 minutes)
- Integration documentation

#### 3. Enhanced Management
- **MCP Servers**: Block/unblock with dummy overrides
- **Memory Files**: Runtime access control
- **Agents**: Discovery and management
- **Context Stats**: Real-time usage dashboard

#### 4. Profile System
- **Create**: Workflow-based profiles
- **Load**: Quick profile switching
- **Diff**: Compare profiles before loading
- **Share**: Export/import for team collaboration

#### 5. Migration Support
- Automated CLI to plugin migration
- Configuration conversion (settings.json → plugin state)
- Data migration (blocked.md → .mcp.json)
- Verification and rollback

### User Experience

#### Slash Commands (13 total)
```bash
/toggle:help              # Show help
/toggle:version          # Show version
/toggle:stats            # Context statistics
/toggle:server block     # Block MCP server
/toggle:server unblock   # Unblock MCP server
/toggle:memory block     # Block memory file
/toggle:memory unblock   # Unblock memory file
/toggle:agent discover   # Discover agents
/toggle:agent block      # Block agent
/toggle:profile create   # Create profile
/toggle:profile load     # Load profile
/toggle:profile diff     # Compare profiles
/toggle:migrate          # Migrate from CLI
```

#### Hooks (3 types)
- **PreToolUse**: Block tools at runtime
- **SessionStart**: Enumerate context items
- **SessionEnd**: Save state

## 📅 Implementation Timeline

### Phase 1: Foundation (Week 1)
- Plugin manifest and infrastructure
- Basic slash commands
- SessionStart hook
- Unit test framework

### Phase 2: Hooks (Week 2)
- PreToolUse hook implementation
- Blocking decision logic
- User feedback messages
- Integration tests

### Phase 3: lazy-mcp Integration (Week 3-4)
- Configuration generator
- Hierarchical tool organization
- Setup documentation
- Integration test suite

### Phase 4: Profile System (Week 3-4, Parallel)
- Profile CRUD operations
- Profile diff and sharing
- Validation and documentation

### Phase 5: Migration (Week 5)
- CLI to plugin migration script
- Configuration conversion
- Dual distribution setup
- Migration documentation

### Phase 6: Polish & Launch (Week 6)
- Performance optimization
- Error handling improvements
- Comprehensive documentation
- Marketplace submission

## 🎯 Success Criteria

### Technical Metrics
- ✅ Hook performance: <100ms execution (95th percentile)
- ✅ Command performance: <2s response time
- ✅ Context reduction: 50-95% with lazy-mcp
- ✅ Migration success rate: >90%
- ✅ Test coverage: >80%

### User Experience Metrics
- ✅ Setup time: <5 minutes
- ✅ Migration time: <10 minutes
- ✅ Documentation clarity: >4.5/5 rating
- ✅ User satisfaction: >4.0/5 rating

### Adoption Metrics
- ✅ 1000+ downloads in first 3 months
- ✅ 80% CLI user migration within 3 months
- ✅ <5% installation failure rate
- ✅ >4.0/5 marketplace rating

## 🚀 Next Steps

### Immediate Actions
1. ✅ **Planning Complete**: All research, architecture, requirements documented
2. ⏳ **Stakeholder Review**: Product, dev, QA team approval
3. ⏳ **Dev Environment Setup**: Monorepo structure, testing framework
4. ⏳ **Begin Phase 1**: Plugin manifest and basic commands

### Key Decisions Needed
- [ ] Approve integration strategy with lazy-mcp
- [ ] Confirm 7-week timeline and resource allocation
- [ ] Validate success metrics and KPIs
- [ ] Approve dual distribution approach (CLI + plugin)

### Risk Management
- Monitor Claude Code plugin API for changes
- Test lazy-mcp integration thoroughly
- Provide comprehensive migration documentation
- Maintain performance budgets (<100ms hooks, <2s commands)

## 📁 File Locations

All documentation is in `/home/dtaylor/motodev/projects/mcp_toggle/docs/`:

### Research
- `PLUGIN_SYSTEM_RESEARCH.md` - Comprehensive plugin system analysis
- `RESEARCH_EXECUTIVE_SUMMARY.md` - Executive summary
- `/tmp/lazy-mcp-comparison.md` - Overlap analysis

### Architecture
- `architecture/01-SYSTEM_ARCHITECTURE.md` - System overview
- `architecture/02-COMPONENT_SPECIFICATIONS.md` - Component details
- `architecture/03-DATA_FLOW_DIAGRAMS.md` - Workflows
- `architecture/04-API_SPECIFICATIONS.md` - API contracts
- `architecture/05-INTEGRATION_PATTERNS.md` - Integration patterns
- `architecture/06-MIGRATION_ARCHITECTURE.md` - Migration strategy
- `architecture/07-TECHNICAL_DECISIONS.md` - Technical decisions
- `architecture/ARCHITECTURE_SUMMARY.md` - Executive summary

### Requirements
- `requirements/PLUGIN_REQUIREMENTS.md` - Main requirements
- `requirements/INTEGRATION_STRATEGY.md` - lazy-mcp integration
- `requirements/MIGRATION_PLAN.md` - CLI to plugin migration
- `requirements/USER_STORIES.md` - User stories and scenarios
- `requirements/README.md` - Navigation guide

### Planning
- `MIGRATION_ROADMAP.md` - 6-phase implementation plan
- `PLUGIN_CONVERSION_SUMMARY.md` - This document

## 💡 Key Insights

### Strategic Insights
1. **Don't Compete**: Use existing solutions (lazy-mcp) rather than rebuilding
2. **Focus on Unique Value**: Memory, agents, profiles that others don't provide
3. **Better Together**: Integration creates more value than standalone solutions
4. **User-Centric**: Smooth migration path and backward compatibility essential

### Technical Insights
1. **Runtime Hooks**: PreToolUse enables blocking without restarts
2. **Dummy Overrides**: Non-destructive blocking preserves original configs
3. **Monorepo**: Shared code between CLI and plugin reduces duplication
4. **Dual Distribution**: Transition period reduces migration risk

### UX Insights
1. **Profile-First**: Encourage workflow-based profiles over manual blocking
2. **Slash Commands**: Better discoverability than TUI in Claude Code
3. **Context Stats**: Real-time visibility improves user decision-making
4. **Migration Automation**: <10 minute migration with verification/rollback

## ✅ Planning Checklist

### Research Phase
- [x] Claude Code plugin system analysis
- [x] voicetreelab/lazy-mcp overlap assessment
- [x] Feasibility determination
- [x] Executive summary creation

### Architecture Phase
- [x] System architecture design
- [x] Component specifications
- [x] Data flow diagrams
- [x] API specifications
- [x] Integration patterns
- [x] Migration architecture
- [x] Technical decision records

### Requirements Phase
- [x] Functional requirements
- [x] Non-functional requirements
- [x] Integration strategy
- [x] Migration plan
- [x] User stories (27 across 7 epics)

### Planning Phase
- [x] 6-phase implementation roadmap
- [x] Success metrics definition
- [x] Risk mitigation strategies
- [x] Communication plan
- [x] Timeline and milestones

### Next: Implementation Phase
- [ ] Stakeholder approval
- [ ] Development environment setup
- [ ] Phase 1 kickoff (plugin foundation)

## 🎉 Conclusion

The comprehensive planning phase for mcp-toggle v2.0.0 is complete. We have:

✅ **Researched** the plugin system and competitive landscape
✅ **Architected** a hybrid solution leveraging best-in-class components
✅ **Specified** detailed requirements with acceptance criteria
✅ **Planned** a 6-phase implementation with clear milestones
✅ **Documented** everything for developers, stakeholders, and users

**Key Takeaway**: Don't reinvent the wheel. Integrate lazy-mcp's proven lazy loading, focus mcp-toggle on unique value (memory, agents, profiles), and deliver a superior user experience through native Claude Code integration.

**Status**: 🟢 Planning Complete → 🚀 Ready for Implementation

---

*For questions or clarifications, see the detailed documentation in docs/architecture/ and docs/requirements/*

*To begin implementation, start with Phase 1 (Foundation) in MIGRATION_ROADMAP.md*

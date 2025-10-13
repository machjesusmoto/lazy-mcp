# mcp-toggle: Migration Roadmap from CLI to Plugin
*Version: 2.0.0*
*Last Updated: 2025-10-12*
*Status: Planning*

## Executive Summary

This roadmap outlines the strategic transformation of mcp-toggle from a standalone CLI tool (v0.5.2) to a Claude Code plugin (v2.0.0) with integrated lazy loading via voicetreelab/lazy-mcp.

**Timeline**: 7 weeks (Phases 1-6)
**Expected Outcome**: 50-95% context reduction, enhanced UX, maintained backward compatibility
**Integration Strategy**: Leverage lazy-mcp for server lazy loading, focus mcp-toggle on unique value (memory, agents, profiles)

## Strategic Context

### Why Plugin Conversion?

1. **Claude Code Evolution**: Native `/mcp` command (v2.0.10) and Plugin System (v2.0.12) provide superior integration
2. **voicetreelab/lazy-mcp**: Production-ready lazy loading solution eliminates need to build registry
3. **User Value**: Focus on unique features (memory, agents, profiles) that lazy-mcp doesn't provide
4. **Better UX**: Hooks enable runtime blocking without restarts, slash commands provide better discoverability

### What We're NOT Doing

❌ **NOT** competing with Anthropic's native features
❌ **NOT** rebuilding lazy-mcp's registry/proxy functionality
❌ **NOT** abandoning CLI users (6-month transition period)
❌ **NOT** breaking backward compatibility

### What We ARE Doing

✅ **ARE** leveraging lazy-mcp's proven lazy loading
✅ **ARE** adding memory/agent management (lazy-mcp doesn't have)
✅ **ARE** building profile system for workflow optimization
✅ **ARE** creating user-friendly Claude Code integration
✅ **ARE** maintaining smooth migration path for existing users

## Key Documentation

All planning documents are complete and available:

### Research Phase (Completed)
- **PLUGIN_SYSTEM_RESEARCH.md** (24K words) - Comprehensive plugin system analysis
- **RESEARCH_EXECUTIVE_SUMMARY.md** (5 pages) - Executive summary for architects
- **lazy-mcp-comparison.md** (2.5K words) - Overlap analysis with voicetreelab/lazy-mcp

### Architecture Phase (Completed)
- **docs/architecture/** (10 documents, 200+ pages total)
  - System architecture, component specs, data flows
  - API specifications, integration patterns
  - Migration architecture, technical decisions
  - Complete design ready for implementation

### Requirements Phase (Completed)
- **docs/requirements/** (5 documents, 80+ pages total)
  - PLUGIN_REQUIREMENTS.md - Functional/non-functional requirements
  - INTEGRATION_STRATEGY.md - lazy-mcp integration strategy
  - MIGRATION_PLAN.md - CLI to plugin migration plan
  - USER_STORIES.md - 27 user stories across 7 epics
  - README.md - Navigation and summary

## Migration Phases

### Phase 1: Foundation (Week 1)
**Goal**: Plugin infrastructure and basic commands

#### Deliverables
- [ ] Plugin manifest (`package.json` with Claude Code plugin fields)
- [ ] Monorepo structure (`plugin/`, `cli/`, `shared/`)
- [ ] Basic slash commands (`/toggle:help`, `/toggle:version`)
- [ ] SessionStart hook (enumerate context items)
- [ ] Unit test framework

#### Success Criteria
- Plugin loads in Claude Code 2.0.12+
- Basic commands execute successfully
- SessionStart hook discovers servers/memory/agents
- Test coverage >80%

#### Effort Estimate
- Development: 3 days
- Testing: 1 day
- Documentation: 1 day

### Phase 2: Hook Implementation (Week 2)
**Goal**: PreToolUse hooks for runtime blocking

#### Deliverables
- [ ] PreToolUse hook for MCP server blocking
- [ ] PreToolUse hook for memory file access
- [ ] Blocking decision logic (<100ms performance)
- [ ] User feedback messages
- [ ] Integration tests for hook workflows

#### Success Criteria
- Hooks execute in <100ms (95th percentile)
- Blocked tools show user-friendly messages
- No false positives/negatives in blocking
- Graceful degradation on errors

#### Effort Estimate
- Development: 4 days
- Testing: 2 days
- Performance optimization: 1 day

### Phase 3: lazy-mcp Integration (Week 3-4)
**Goal**: Configure and integrate voicetreelab/lazy-mcp

#### Deliverables
- [ ] lazy-mcp configuration generator
- [ ] Hierarchical tool organization (JSON)
- [ ] `/toggle:configure-lazy-mcp` command
- [ ] lazy-mcp setup documentation
- [ ] Integration test suite

#### Success Criteria
- Generates valid lazy-mcp config from mcp-toggle state
- Users can setup lazy-mcp in <5 minutes
- Documentation covers common scenarios
- Integration tests verify config correctness

#### Effort Estimate
- lazy-mcp setup: 2 days
- Configuration generator: 3 days
- Documentation: 2 days
- Testing: 2 days

### Phase 4: Profile System (Week 3-4, Parallel with Phase 3)
**Goal**: Workflow-based profile management

#### Deliverables
- [ ] Profile CRUD operations (`/toggle:profile create/load/list/delete`)
- [ ] Profile diff command (`/toggle:profile diff`)
- [ ] Profile sharing (`/toggle:profile export/import`)
- [ ] Profile validation
- [ ] Profile documentation and examples

#### Success Criteria
- Profiles load in <2 seconds
- Profile diff shows clear comparison
- Export/import preserves all settings
- Validation catches common errors

#### Effort Estimate
- Core profile system: 3 days
- Diff/export/import: 2 days
- Documentation: 1 day
- Testing: 1 day

### Phase 5: Migration Support (Week 5)
**Goal**: Smooth transition from CLI to plugin

#### Deliverables
- [ ] CLI to plugin migration script (`/toggle:migrate`)
- [ ] Configuration conversion (settings.json → plugin state)
- [ ] Data migration (blocked.md → .mcp.json overrides)
- [ ] Migration verification and rollback
- [ ] Dual distribution setup (npm + marketplace)

#### Success Criteria
- >90% migration success rate
- Migration completes in <10 minutes
- Rollback available if issues occur
- Clear migration documentation

#### Effort Estimate
- Migration script: 3 days
- Testing and validation: 2 days
- Documentation: 1 day
- Dual distribution setup: 1 day

### Phase 6: Polish and Launch (Week 6)
**Goal**: Production-ready plugin

#### Deliverables
- [ ] Performance optimization (cache, lazy loading)
- [ ] Error handling improvements
- [ ] Comprehensive documentation
- [ ] Tutorial videos/GIFs
- [ ] Marketplace submission
- [ ] Launch announcement

#### Success Criteria
- All commands <2s response time
- Error messages are clear and actionable
- Documentation complete and tested
- Marketplace approval received

#### Effort Estimate
- Performance optimization: 2 days
- Documentation: 2 days
- Marketplace submission: 1 day
- Launch prep: 2 days

## Implementation Priorities

### Must Have (v2.0.0)
1. Plugin infrastructure and manifest
2. PreToolUse hooks for blocking
3. MCP server management
4. Memory file management
5. Agent discovery and management
6. Migration from CLI (v0.5.2)
7. lazy-mcp configuration helper
8. Basic documentation

### Should Have (v2.1.0)
9. Profile system (create, load, diff, share)
10. Context statistics dashboard
11. Advanced blocking features
12. Team collaboration (profile sharing)
13. Performance optimizations
14. Enhanced documentation

### Could Have (v2.2.0+)
15. Bulk operations
16. Configuration export/import
17. Automatic optimization suggestions
18. AI-powered profile recommendations
19. Visual workflow designer
20. Integration with other tools

## Technical Decisions

### TDR-001: Hybrid Architecture
**Decision**: Use PreToolUse hooks + lazy-mcp registry + profiles
**Rationale**: Combines runtime blocking with proven lazy loading and workflow optimization
**Impact**: 78-95% token reduction, better UX, faster development

### TDR-002: Leverage lazy-mcp
**Decision**: Use voicetreelab/lazy-mcp for MCP server lazy loading
**Rationale**: Production-ready, community-maintained, allows focus on unique value
**Impact**: Don't reinvent the wheel, faster time to market, collaborative ecosystem

### TDR-003: Dual Distribution
**Decision**: Maintain both CLI and plugin for 6-month transition
**Rationale**: Smooth migration path, fallback option, gradual adoption
**Impact**: More maintenance short-term, better user experience long-term

### TDR-004: Monorepo Structure
**Decision**: Use plugin/, cli/, shared/ directory structure
**Rationale**: Share code between CLI and plugin, maintain consistency
**Impact**: Cleaner codebase, easier testing, gradual migration

### TDR-005: Dummy Override Blocking
**Decision**: Use .mcp.json empty config objects to override servers
**Rationale**: Non-destructive, preserves original config, easy unblocking
**Impact**: No data loss, reversible operations, better UX

## Success Metrics

### Technical Metrics
- **Hook Performance**: <100ms execution (95th percentile)
- **Command Performance**: <2s response time
- **Context Reduction**: 50-95% with lazy-mcp
- **Migration Success**: >90% successful migrations
- **Test Coverage**: >80%
- **Installation Success**: >95%

### User Experience Metrics
- **Setup Time**: <5 minutes
- **Migration Time**: <10 minutes
- **Documentation Clarity**: >4.5/5 rating
- **User Satisfaction**: >4.0/5 rating
- **Support Tickets**: <10% of users

### Adoption Metrics
- **Downloads**: 1000+ in first 3 months
- **CLI Migration**: 80% of users within 3 months
- **Active Users**: 70% monthly active (of installed)
- **Marketplace Rating**: >4.0/5 stars
- **Community Contributions**: >5 PRs in first 6 months

## Risk Mitigation

### Risk 1: Plugin API Changes
**Probability**: Medium | **Impact**: High
**Mitigation**:
- Monitor Claude Code changelog closely
- Abstract plugin API interactions
- Maintain backward compatibility layer
- Quick patch releases for breaking changes

### Risk 2: lazy-mcp Integration Issues
**Probability**: Low | **Impact**: Medium
**Mitigation**:
- Test lazy-mcp integration thoroughly
- Document common configuration errors
- Provide fallback to direct MCP server blocking
- Contribute fixes upstream if needed

### Risk 3: User Migration Complexity
**Probability**: Medium | **Impact**: Medium
**Mitigation**:
- Comprehensive migration documentation
- Automated migration script with validation
- Rollback capability if issues occur
- Extended CLI support (6 months)

### Risk 4: Performance Degradation
**Probability**: Low | **Impact**: High
**Mitigation**:
- Performance budgets for all operations
- Continuous performance monitoring
- Lazy loading for non-critical features
- Caching for frequently accessed data

## Timeline and Milestones

### Week 1: Foundation
- **Milestone**: Plugin loads in Claude Code
- **Deliverables**: Manifest, basic commands, SessionStart hook
- **Review**: Architecture alignment, code quality

### Week 2: Hooks
- **Milestone**: Runtime blocking works
- **Deliverables**: PreToolUse hooks, blocking logic, tests
- **Review**: Performance benchmarks, UX feedback

### Week 3-4: Integration & Profiles
- **Milestone**: lazy-mcp configured, profiles work
- **Deliverables**: lazy-mcp config, profile system
- **Review**: Integration correctness, profile UX

### Week 5: Migration
- **Milestone**: CLI users can migrate
- **Deliverables**: Migration script, dual distribution
- **Review**: Migration success rate, rollback testing

### Week 6: Launch
- **Milestone**: v2.0.0 published
- **Deliverables**: Polished plugin, marketplace listing
- **Review**: Final QA, documentation completeness

### Week 7+: Post-Launch
- **Activities**: User feedback, bug fixes, v2.1.0 planning
- **Support**: Monitor issues, update docs, community engagement

## Communication Plan

### Developer Communication
- **Weekly standups**: Progress updates, blocker discussion
- **GitHub issues**: Feature tracking, bug reports
- **Code reviews**: PR reviews within 24 hours
- **Documentation**: Inline comments, API docs, architecture docs

### User Communication
- **Release notes**: Detailed changelog with migration guides
- **Migration guide**: Step-by-step CLI to plugin migration
- **Video tutorials**: Setup, migration, features
- **Support channels**: GitHub discussions, Discord (if needed)

### Stakeholder Communication
- **Phase reviews**: End of each phase, demo + metrics
- **Risk reports**: Weekly risk assessment and mitigation updates
- **Success metrics**: Monthly dashboard with adoption/satisfaction metrics
- **Launch announcement**: Blog post, Twitter, Reddit, Claude Code community

## Next Steps

### Immediate (This Week)
1. ✅ Requirements documentation complete
2. ✅ Architecture design complete
3. ⏳ Stakeholder review and approval
4. ⏳ Development environment setup
5. ⏳ Begin Phase 1 implementation

### Short-Term (Weeks 1-2)
1. Implement plugin infrastructure
2. Build PreToolUse hooks
3. Set up testing framework
4. Create basic documentation

### Mid-Term (Weeks 3-5)
1. Integrate lazy-mcp
2. Build profile system
3. Create migration script
4. Conduct user testing

### Long-Term (Week 6+)
1. Polish and optimize
2. Marketplace submission
3. Launch v2.0.0
4. Plan v2.1.0 features

## Conclusion

This migration represents a strategic pivot that:
- **Leverages existing solutions** (lazy-mcp) rather than duplicating effort
- **Focuses on unique value** (memory, agents, profiles) that others don't provide
- **Improves user experience** with runtime blocking and better integration
- **Maintains backward compatibility** during transition period
- **Sets foundation** for future innovation in context management

The comprehensive planning phase is complete. All research, architecture, and requirements are documented. We're ready to move into implementation with confidence that we're building the right thing, the right way.

**Status**: ✅ Planning Complete → 🚀 Ready for Implementation

---

*For detailed technical specifications, see:*
- *Research: docs/PLUGIN_SYSTEM_RESEARCH.md, docs/RESEARCH_EXECUTIVE_SUMMARY.md*
- *Architecture: docs/architecture/*
- *Requirements: docs/requirements/*
- *Overlap Analysis: /tmp/lazy-mcp-comparison.md*

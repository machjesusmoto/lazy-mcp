# Requirements Documentation
*mcp-toggle v2.0.0 - Claude Code Plugin Edition*

This directory contains comprehensive requirements documentation for converting mcp-toggle from a standalone CLI tool to a Claude Code plugin with voicetreelab/lazy-mcp integration.

## Document Index

### 1. [PLUGIN_REQUIREMENTS.md](./PLUGIN_REQUIREMENTS.md)
**Main requirements document** - Comprehensive functional and non-functional requirements

**Sections**:
- Functional Requirements (Commands, Hooks, Integration)
- Non-Functional Requirements (Performance, Usability, Security)
- Integration Requirements (lazy-mcp, Claude Code)
- Migration Requirements (CLI to Plugin)
- Testing Requirements
- Documentation Requirements
- Success Metrics

**Use When**: Designing features, making technical decisions, defining acceptance criteria

### 2. [INTEGRATION_STRATEGY.md](./INTEGRATION_STRATEGY.md)
**lazy-mcp integration plan** - How mcp-toggle collaborates with voicetreelab/lazy-mcp

**Sections**:
- Strategic Rationale (Why integrate vs build)
- Integration Architecture (System diagrams)
- Configuration Management (File relationships)
- User Workflows (Setup, migration, usage)
- Documentation Strategy
- Collaboration Plan

**Use When**: Implementing lazy-mcp features, designing configuration flow, writing integration docs

### 3. [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
**CLI to plugin migration** - Complete plan for transitioning from v0.5.2 to v2.0.0

**Sections**:
- Technical Migration (Data, code, testing)
- User Communication (Guides, announcements)
- Rollback Strategy
- Timeline and Milestones
- Risk Mitigation

**Use When**: Planning releases, supporting users, communicating changes

### 4. [USER_STORIES.md](./USER_STORIES.md)
**User stories and scenarios** - Detailed user stories with acceptance criteria

**Sections**:
- Personas (Sarah, Tom, Maria, Alex, Lisa)
- Epics (Installation, Server Management, Memory, Agents, Profiles, Migration, Context Optimization)
- Scenarios (Given/When/Then format)
- Priority Summary (MoSCoW)

**Use When**: Sprint planning, feature prioritization, acceptance testing

## Quick Reference

### Critical Requirements for v2.0.0

**Plugin Infrastructure**:
- ✅ Valid plugin.json manifest
- ✅ Standard directory structure
- ✅ Slash commands (/toggle, /profile, /migrate)
- ✅ PreToolUse hook for MCP server blocking

**lazy-mcp Integration**:
- ✅ Automated setup command
- ✅ Configuration generation
- ✅ Integration validation
- ✅ Documentation and guides

**Migration**:
- ✅ Legacy configuration detection
- ✅ Automated migration with backup
- ✅ Rollback capability
- ✅ Migration guide

**Core Features**:
- ✅ MCP server blocking (via .mcp.json overrides)
- ✅ Memory file blocking (via settings.json)
- ✅ Agent blocking (via settings.json)
- ✅ Profile system (basic load/list)

### Key Decisions

1. **Integration over Duplication**: Use voicetreelab/lazy-mcp for MCP server lazy loading instead of building our own registry
   - **Rationale**: Proven solution, community maintained, focus on unique value
   - **Impact**: Faster development, better lazy loading, collaborative ecosystem

2. **Dual Distribution**: Maintain both CLI and plugin initially
   - **Rationale**: Smooth transition, user choice, fallback option
   - **Timeline**: 6 months overlap, then deprecate CLI

3. **.mcp.json for Server Blocking**: Use dummy overrides instead of permissions.deny
   - **Rationale**: Preserves original config, better UX for unblocking
   - **Trade-off**: More complex than simple deny patterns

4. **Profile-First UX**: Encourage profiles over manual blocking
   - **Rationale**: Better UX, team collaboration, workflow optimization
   - **Impact**: Additional development effort, but significant UX benefit

### Success Criteria

**Technical**:
- Hook performance: <100ms execution
- Context reduction: 50-95% with lazy-mcp
- Migration success: >90% without data loss
- Test coverage: >80% for core logic

**User Experience**:
- Setup time: <5 minutes for new users
- Migration time: <10 minutes for CLI users
- Documentation clarity: >4.5/5 rating
- User satisfaction: >4.0/5 rating

**Adoption**:
- 80% of CLI users migrate within 3 months
- 1000+ plugin downloads in first 3 months
- <5% installation failure rate

## Development Workflow

### For Product Managers
1. Start with [USER_STORIES.md](./USER_STORIES.md) for feature prioritization
2. Reference [PLUGIN_REQUIREMENTS.md](./PLUGIN_REQUIREMENTS.md) for acceptance criteria
3. Use [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for release planning

### For Developers
1. Start with [PLUGIN_REQUIREMENTS.md](./PLUGIN_REQUIREMENTS.md) for implementation specs
2. Reference [INTEGRATION_STRATEGY.md](./INTEGRATION_STRATEGY.md) for lazy-mcp integration
3. Use [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for data migration logic

### For QA
1. Start with [USER_STORIES.md](./USER_STORIES.md) for test scenarios
2. Reference [PLUGIN_REQUIREMENTS.md](./PLUGIN_REQUIREMENTS.md) for acceptance criteria
3. Use [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for migration testing

### For Technical Writers
1. Start with [INTEGRATION_STRATEGY.md](./INTEGRATION_STRATEGY.md) for integration docs
2. Reference [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for migration guide
3. Use [USER_STORIES.md](./USER_STORIES.md) for user scenarios and examples

## Open Questions

**Technical**:
1. Can memory files be blocked at load time via hooks, or only via settings.json permissions.deny?
2. Should we version-pin lazy-mcp dependency or track latest?
3. What's the actual context token budget for plugin commands?

**User Experience**:
1. Should CLI tool be deprecated immediately or maintained long-term?
2. How aggressive should automatic optimization suggestions be?
3. Should profiles be per-user or team-shareable by default?

**Process**:
1. Beta testing program structure and size?
2. Support resources and team training needs?
3. Community feedback collection mechanisms?

## Next Steps

### Phase 1: Review and Refinement (Week 1)
- [ ] Stakeholder review of all requirements docs
- [ ] Product team prioritization of user stories
- [ ] Technical team feasibility validation
- [ ] Update based on feedback

### Phase 2: Development Planning (Week 1)
- [ ] Create detailed task breakdown from requirements
- [ ] Assign story points and priorities
- [ ] Define sprint goals
- [ ] Set up project tracking

### Phase 3: Implementation (Weeks 2-6)
- [ ] Follow [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) phases
- [ ] Track against requirements
- [ ] Update docs based on implementation learnings
- [ ] Conduct regular reviews

### Phase 4: Testing and Release (Week 7)
- [ ] Validate all acceptance criteria
- [ ] Execute migration test scenarios
- [ ] Prepare user documentation
- [ ] Launch v2.0.0

## Contributing

When contributing to requirements:

1. **Propose Changes**: Open an issue or PR with proposed changes
2. **Provide Rationale**: Explain why the change is needed
3. **Update All Affected Docs**: Ensure consistency across all requirements docs
4. **Version History**: Update "Last Updated" date in each modified document

## Change Log

- **2025-10-12**: Initial requirements documentation created
  - PLUGIN_REQUIREMENTS.md (comprehensive functional/non-functional requirements)
  - INTEGRATION_STRATEGY.md (lazy-mcp integration plan)
  - MIGRATION_PLAN.md (CLI to plugin migration)
  - USER_STORIES.md (user stories and scenarios)

## References

**Research**:
- [Plugin System Research](../PLUGIN_SYSTEM_RESEARCH.md)
- [Research Executive Summary](../RESEARCH_EXECUTIVE_SUMMARY.md)
- [lazy-mcp Comparison](/tmp/lazy-mcp-comparison.md)

**Architecture**:
- [System Architecture](../architecture/01-SYSTEM_ARCHITECTURE.md)
- [Component Specifications](../architecture/02-COMPONENT_SPECIFICATIONS.md)
- [Data Flow Diagrams](../architecture/03-DATA_FLOW_DIAGRAMS.md)

**External**:
- [Claude Code Plugin Documentation](https://docs.claude.com/en/docs/claude-code/plugins)
- [voicetreelab/lazy-mcp Repository](https://github.com/voicetreelab/lazy-mcp)
- [mcp-toggle v0.5.2 Codebase](../../)

---

**Status**: Complete and Ready for Review
**Maintainers**: Development Team
**Last Updated**: October 12, 2025

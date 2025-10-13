# AI-First Execution Plan: mcp-toggle Plugin Conversion
*Version: 2.0.0*
*Last Updated: 2025-10-12*
*Status: Ready for Execution*

## Executive Summary

This document outlines an **AI-first implementation approach** for converting mcp-toggle from CLI to Claude Code plugin. All development will be performed by AI agents with clearly defined **human pause points** for tasks requiring human intervention (testing in Claude Code, marketplace submission, etc.).

**Key Decision**: License analysis confirms MIT license allows configuration integration with lazy-mcp → **Approved to proceed**

## AI Execution Strategy

### Core Principle
**AI agents write ALL code**, with humans:
- ✅ Testing in actual Claude Code environment
- ✅ Making approval decisions at phase gates
- ✅ Handling external dependencies (npm publish, marketplace)
- ✅ Providing feedback for iteration

### Success Criteria
- AI-generated code must be **production-ready** (not scaffolding)
- Comprehensive tests included with all code
- Documentation generated alongside code
- Human can test/deploy without additional coding

## Phase Breakdown with AI Agents

### Phase 1: Foundation (Week 1)
**Goal**: Plugin infrastructure and basic commands

#### AI Tasks

**Task 1.1: Create Monorepo Structure**
- **Agent**: backend-architect
- **Input**: `docs/architecture/01-SYSTEM_ARCHITECTURE.md` Section 3
- **Output**:
  - `plugin/` directory with package.json
  - `cli/` directory with package.json (existing code moved)
  - `shared/` directory with package.json
  - Root package.json with workspaces
- **Validation**: `npm install` succeeds, workspaces recognized
- **Human Pause**: None

**Task 1.2: Create Plugin Manifest**
- **Agent**: backend-developer
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 2.1
- **Output**: `plugin/package.json` with Claude Code plugin fields
- **Validation**: JSON schema valid, all required fields present
- **Human Pause**: None

**Task 1.3: Implement SessionStart Hook**
- **Agent**: backend-developer
- **Input**: `docs/architecture/04-API_SPECIFICATIONS.md` Hook-002
- **Output**:
  - `plugin/src/hooks/session-start.ts`
  - Unit tests in `plugin/tests/hooks/session-start.test.ts`
  - Type definitions
- **Validation**: Tests pass with >80% coverage
- **Human Pause**: None

**Task 1.4: Implement Basic Commands**
- **Agent**: backend-developer
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 3.1-3.2
- **Output**:
  - `plugin/src/commands/help.ts` (`/toggle:help`)
  - `plugin/src/commands/version.ts` (`/toggle:version`)
  - Unit tests for each command
  - Command registration in plugin manifest
- **Validation**: Commands registered, tests pass
- **Human Pause**: **🚦 PHASE 1 GATE**

#### Human Pause Point 1.1: Phase 1 Testing
**When**: After all Phase 1 tasks complete
**What you do**:
1. Install plugin in Claude Code: `cd plugin && npm link`
2. Restart Claude Code
3. Test commands: `/toggle:help`, `/toggle:version`
4. Verify SessionStart hook runs (check console/logs)
5. Report: ✅ Works / ❌ Bugs found

**If bugs found**:
- Document issues in `PHASE1_BUGS.md`
- AI agents will fix based on your bug reports
- Retest after fixes

**Approval needed to proceed to Phase 2**: YES

---

### Phase 2: PreToolUse Hooks (Week 2)
**Goal**: Runtime blocking without restarts

#### AI Tasks

**Task 2.1: Implement PreToolUse Hook Core**
- **Agent**: backend-developer
- **Input**: `docs/architecture/04-API_SPECIFICATIONS.md` Hook-001
- **Output**:
  - `plugin/src/hooks/pre-tool-use.ts`
  - Hook registration in plugin manifest
  - Type definitions for hook responses
- **Validation**: Compiles, types correct
- **Human Pause**: None

**Task 2.2: Implement Blocking Decision Logic**
- **Agent**: backend-architect
- **Input**: `docs/architecture/02-COMPONENT_SPECIFICATIONS.md` Section 3.1
- **Output**:
  - `plugin/src/core/blocking-engine.ts`
  - MCP server blocking logic
  - Memory file blocking logic
  - Performance optimizations (<100ms target)
  - Unit tests with >80% coverage
- **Validation**: Tests pass, performance benchmarks meet target
- **Human Pause**: None

**Task 2.3: Implement User Feedback Messages**
- **Agent**: frontend-developer
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 3.3
- **Output**:
  - `plugin/src/ui/feedback.ts`
  - User-friendly blocked tool messages
  - Suggestion messages
  - Error formatting
  - Unit tests
- **Validation**: Tests pass, messages clear
- **Human Pause**: None

**Task 2.4: Integration Tests for Hooks**
- **Agent**: qa
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 8.2
- **Output**:
  - `plugin/tests/integration/hooks.test.ts`
  - Mock MCP server tools
  - Mock memory file access
  - Test all blocking scenarios
- **Validation**: Integration tests pass
- **Human Pause**: **🚦 PHASE 2 GATE**

#### Human Pause Point 2.1: Phase 2 Testing
**When**: After all Phase 2 tasks complete
**What you do**:
1. Reload plugin in Claude Code
2. Configure blocking: Add servers/memory to block list
3. Test PreToolUse hook: Try using blocked tools
4. Verify <100ms performance (check timing logs)
5. Verify feedback messages are clear
6. Report: ✅ Works / ❌ Bugs found

**If bugs found**: Document in `PHASE2_BUGS.md`, AI agents fix

**Approval needed to proceed to Phase 3**: YES

---

### Phase 3: lazy-mcp Integration (Week 3)
**Goal**: Configure lazy-mcp for users

#### AI Tasks

**Task 3.1: lazy-mcp Configuration Generator**
- **Agent**: backend-developer
- **Input**: `docs/requirements/INTEGRATION_STRATEGY.md` Section 4
- **Output**:
  - `plugin/src/integrations/lazy-mcp-config.ts`
  - Hierarchical tool organization (JSON)
  - Category mapping logic
  - Configuration validator
  - Unit tests
- **Validation**: Generated configs are valid JSON, tools organized correctly
- **Human Pause**: None

**Task 3.2: Implement /toggle:configure-lazy-mcp Command**
- **Agent**: backend-developer
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 3.8
- **Output**:
  - `plugin/src/commands/configure-lazy-mcp.ts`
  - Interactive configuration wizard
  - Write lazy-mcp config file
  - Validation and error handling
  - Unit tests
- **Validation**: Tests pass, command generates valid config
- **Human Pause**: None

**Task 3.3: lazy-mcp Setup Documentation**
- **Agent**: documentation-architect
- **Input**: `docs/requirements/INTEGRATION_STRATEGY.md` Section 6
- **Output**:
  - `plugin/docs/LAZY_MCP_SETUP.md`
  - Step-by-step setup guide
  - Configuration examples
  - Troubleshooting section
  - FAQ
- **Validation**: Documentation complete, examples correct
- **Human Pause**: None

**Task 3.4: Integration Tests**
- **Agent**: qa
- **Input**: `docs/requirements/INTEGRATION_STRATEGY.md` Section 7.3
- **Output**:
  - `plugin/tests/integration/lazy-mcp.test.ts`
  - Config generation tests
  - Validation tests
  - Error handling tests
- **Validation**: Integration tests pass
- **Human Pause**: **🚦 PHASE 3 GATE**

#### Human Pause Point 3.1: lazy-mcp Integration Testing
**When**: After all Phase 3 tasks complete
**What you do**:
1. Run `/toggle:configure-lazy-mcp` in Claude Code
2. Verify lazy-mcp config file created correctly
3. **Install actual lazy-mcp** (if not already)
4. Test lazy-mcp with generated config
5. Verify tools load correctly through lazy-mcp
6. Report: ✅ Works / ❌ Bugs found

**Special requirement**: You'll need to install voicetreelab/lazy-mcp for testing

**If bugs found**: Document in `PHASE3_BUGS.md`, AI agents fix

**Approval needed to proceed to Phase 4**: YES

---

### Phase 4: Profile System (Week 4)
**Goal**: Workflow-based profile management

#### AI Tasks

**Task 4.1: Profile Data Model**
- **Agent**: backend-architect
- **Input**: `docs/architecture/02-COMPONENT_SPECIFICATIONS.md` Section 2.2
- **Output**:
  - `plugin/src/models/profile.ts`
  - TypeScript interfaces for profiles
  - Profile validation logic
  - Serialization/deserialization
  - Unit tests
- **Validation**: Types compile, validation works
- **Human Pause**: None

**Task 4.2: Profile Storage Manager**
- **Agent**: backend-developer
- **Input**: `docs/architecture/04-API_SPECIFICATIONS.md` API-005-007
- **Output**:
  - `plugin/src/storage/profile-manager.ts`
  - CRUD operations (create, read, update, delete)
  - Atomic file writes
  - Error handling
  - Unit tests >80% coverage
- **Validation**: Tests pass, file operations safe
- **Human Pause**: None

**Task 4.3: Profile Commands**
- **Agent**: backend-developer
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 3.9-3.13
- **Output**:
  - `plugin/src/commands/profile-create.ts`
  - `plugin/src/commands/profile-load.ts`
  - `plugin/src/commands/profile-list.ts`
  - `plugin/src/commands/profile-diff.ts`
  - `plugin/src/commands/profile-export.ts`
  - Unit tests for each command
- **Validation**: All commands work, tests pass
- **Human Pause**: None

**Task 4.4: Profile Integration Tests**
- **Agent**: qa
- **Input**: `docs/requirements/USER_STORIES.md` Epic 2
- **Output**:
  - `plugin/tests/integration/profiles.test.ts`
  - End-to-end profile workflows
  - Profile load/switch scenarios
  - Diff comparison tests
  - Export/import tests
- **Validation**: Integration tests pass
- **Human Pause**: **🚦 PHASE 4 GATE**

#### Human Pause Point 4.1: Profile System Testing
**When**: After all Phase 4 tasks complete
**What you do**:
1. Create test profile: `/toggle:profile create dev-profile`
2. Configure blocking in profile
3. Load profile: `/toggle:profile load dev-profile`
4. Verify blocking applies
5. Create second profile: `/toggle:profile create prod-profile`
6. Test diff: `/toggle:profile diff dev-profile prod-profile`
7. Test export: `/toggle:profile export dev-profile`
8. Report: ✅ Works / ❌ Bugs found

**If bugs found**: Document in `PHASE4_BUGS.md`, AI agents fix

**Approval needed to proceed to Phase 5**: YES

---

### Phase 5: Migration Support (Week 5)
**Goal**: Smooth CLI to plugin transition

#### AI Tasks

**Task 5.1: CLI Detection and Analysis**
- **Agent**: backend-developer
- **Input**: Current `src/core/*` files (v0.5.2)
- **Output**:
  - `plugin/src/migration/cli-detector.ts`
  - Detect installed CLI version
  - Parse `.claude/blocked.md`
  - Parse `.claude/settings.json` permissions.deny
  - Unit tests
- **Validation**: Correctly reads CLI state
- **Human Pause**: None

**Task 5.2: Configuration Converter**
- **Agent**: backend-developer
- **Input**: `docs/requirements/MIGRATION_PLAN.md` Section 3.2
- **Output**:
  - `plugin/src/migration/config-converter.ts`
  - Convert settings.json → plugin state
  - Convert blocked.md → .mcp.json overrides
  - Preserve blocked servers, memory, agents
  - Unit tests
- **Validation**: Tests pass with various CLI configs
- **Human Pause**: None

**Task 5.3: Migration Command**
- **Agent**: backend-developer
- **Input**: `docs/requirements/PLUGIN_REQUIREMENTS.md` Section 3.14
- **Output**:
  - `plugin/src/commands/migrate.ts`
  - Interactive migration wizard
  - Configuration conversion
  - Backup original config
  - Verification step
  - Rollback capability
  - Unit tests
- **Validation**: Tests pass, migration safe
- **Human Pause**: None

**Task 5.4: Migration Documentation**
- **Agent**: documentation-architect
- **Input**: `docs/requirements/MIGRATION_PLAN.md` Section 5
- **Output**:
  - `plugin/docs/MIGRATION_GUIDE.md`
  - Step-by-step migration instructions
  - Before/after comparisons
  - Troubleshooting section
  - Rollback instructions
- **Validation**: Documentation complete, clear
- **Human Pause**: None

**Task 5.5: Migration Integration Tests**
- **Agent**: qa
- **Input**: `docs/requirements/MIGRATION_PLAN.md` Section 4.3
- **Output**:
  - `plugin/tests/integration/migration.test.ts`
  - Mock various CLI configurations
  - Test migration success rate (>90% target)
  - Test rollback functionality
- **Validation**: Integration tests pass
- **Human Pause**: **🚦 PHASE 5 GATE**

#### Human Pause Point 5.1: Migration Testing
**When**: After all Phase 5 tasks complete
**What you do**:
1. **Backup your current config**: Copy `.claude/` directory
2. Run migration: `/toggle:migrate`
3. Verify all blocked items migrated correctly
4. Test plugin functionality with migrated config
5. Test rollback: `/toggle:migrate --rollback`
6. Verify rollback restores original state
7. Report: ✅ Works / ❌ Bugs found

**Critical**: Test with your actual CLI configuration!

**If bugs found**: Document in `PHASE5_BUGS.md`, AI agents fix

**Approval needed to proceed to Phase 6**: YES

---

### Phase 6: Polish & Launch (Week 6)
**Goal**: Production-ready plugin

#### AI Tasks

**Task 6.1: Performance Optimization**
- **Agent**: performance
- **Input**: All plugin code, performance requirements
- **Output**:
  - Caching for frequent operations
  - Lazy loading for non-critical features
  - Bundle size optimization
  - Performance benchmark suite
  - `plugin/docs/PERFORMANCE.md`
- **Validation**: All performance targets met (<100ms hooks, <2s commands)
- **Human Pause**: None

**Task 6.2: Error Handling Improvements**
- **Agent**: refactorer
- **Input**: All plugin code, error scenarios
- **Output**:
  - Comprehensive error types
  - User-friendly error messages
  - Graceful degradation
  - Error recovery mechanisms
  - Error handling tests
- **Validation**: All errors handled gracefully
- **Human Pause**: None

**Task 6.3: Comprehensive Documentation**
- **Agent**: documentation-architect
- **Input**: All plugin code, user stories
- **Output**:
  - `plugin/README.md` - User-facing documentation
  - `plugin/docs/API.md` - API documentation
  - `plugin/docs/ARCHITECTURE.md` - Architecture overview
  - `plugin/docs/CONTRIBUTING.md` - Contribution guide
  - `plugin/docs/CHANGELOG.md` - Version history
- **Validation**: Documentation complete, accurate
- **Human Pause**: None

**Task 6.4: Tutorial Assets**
- **Agent**: visual-storyteller
- **Input**: User stories, common workflows
- **Output**:
  - `plugin/docs/TUTORIAL.md` - Step-by-step tutorial
  - GIF placeholders for key workflows
  - Example configurations
  - Quick start guide
- **Validation**: Tutorial clear, examples correct
- **Human Pause**: **🚦 PHASE 6 GATE**

#### Human Pause Point 6.1: Final Testing & Polish
**When**: After all Phase 6 tasks complete
**What you do**:
1. Full regression testing:
   - All commands work
   - All hooks work
   - Performance meets targets
   - No critical bugs
2. Documentation review:
   - README clear and accurate
   - Tutorial easy to follow
   - API docs complete
3. UX evaluation:
   - Error messages helpful
   - Command discoverability good
   - Overall experience smooth
4. Report: ✅ Ready for launch / ❌ Issues found

**If issues found**: Document in `PHASE6_ISSUES.md`, AI agents fix

**Approval needed to proceed to launch**: YES

---

## Launch Phase (Week 7)

### Human-Only Tasks

These tasks **cannot be automated** and require your direct action:

#### Launch Task 1: npm Publishing
**What you do**:
1. Update `plugin/package.json` version to 2.0.0
2. Build plugin: `cd plugin && npm run build`
3. Test built plugin locally
4. Publish to npm: `npm publish`
5. Verify package on npmjs.com

**AI Support**: None (requires npm credentials)

**Estimated time**: 30 minutes

#### Launch Task 2: Marketplace Submission
**What you do**:
1. Read Claude Code marketplace submission guidelines
2. Prepare submission materials:
   - Plugin package
   - Screenshots/GIFs (you'll need to create these)
   - Description and metadata
3. Submit to Claude Code marketplace
4. Respond to review feedback

**AI Support**: AI can generate description text, but you handle submission

**Estimated time**: 2-4 hours (plus review wait time)

#### Launch Task 3: Documentation Site (Optional)
**What you do**:
1. Deploy docs to GitHub Pages or similar
2. Set up domain (if desired)
3. Configure analytics (if desired)

**AI Support**: AI can generate static site, you deploy

**Estimated time**: 1-2 hours

#### Launch Task 4: Announcement
**What you do**:
1. Write launch announcement (AI can draft)
2. Post to:
   - GitHub repository
   - Twitter/X
   - Reddit (r/ClaudeAI)
   - Claude Code community forums
3. Respond to comments and questions

**AI Support**: AI can draft announcement text

**Estimated time**: 2-3 hours

---

## Human Pause Points Summary

| Phase | Pause Point | What You Test | Time Required |
|-------|-------------|---------------|---------------|
| 1 | Foundation | Plugin loads, basic commands work | 15-30 min |
| 2 | Hooks | Blocking works, performance <100ms | 30-45 min |
| 3 | Integration | lazy-mcp config generates correctly | 45-60 min |
| 4 | Profiles | Profile system works end-to-end | 30-45 min |
| 5 | Migration | CLI to plugin migration succeeds | 45-60 min |
| 6 | Polish | Final testing, UX evaluation | 2-3 hours |
| 7 | Launch | npm publish, marketplace submission | 4-6 hours |

**Total human time required**: ~10-14 hours across 7 weeks

---

## AI Agent Assignments

### Primary Agents

| Agent | Primary Responsibility | Phases |
|-------|------------------------|--------|
| **backend-architect** | System design, data models | 1, 2, 4 |
| **backend-developer** | Core implementation, hooks, commands | 1-5 |
| **frontend-developer** | UI/UX, feedback messages | 2, 6 |
| **qa** | Testing, validation, integration tests | 1-6 |
| **documentation-architect** | Documentation, guides, tutorials | 3, 5, 6 |
| **performance** | Optimization, benchmarking | 6 |
| **refactorer** | Error handling, code quality | 6 |
| **visual-storyteller** | Tutorial assets, examples | 6 |

### Agent Coordination

- **Sequential dependencies**: Agents wait for previous tasks to complete
- **Parallel opportunities**: Multiple agents work simultaneously when no dependencies
- **Code reviews**: Each agent reviews related code changes
- **Quality gates**: QA agent validates all phases before human pause points

---

## Success Criteria

### Technical Metrics
- ✅ All tests passing (>80% coverage)
- ✅ Hook performance <100ms (95th percentile)
- ✅ Command performance <2s
- ✅ No critical bugs
- ✅ Zero TypeScript errors

### Functionality Metrics
- ✅ All 13 commands working
- ✅ All 3 hooks working (PreToolUse, SessionStart, SessionEnd)
- ✅ Migration success rate >90%
- ✅ lazy-mcp integration functional
- ✅ Profile system complete

### Quality Metrics
- ✅ Documentation complete
- ✅ Error messages user-friendly
- ✅ Performance targets met
- ✅ Code passes lint/format checks
- ✅ Architecture matches design docs

### User Experience Metrics
- ✅ Setup time <5 minutes
- ✅ Migration time <10 minutes
- ✅ Commands discoverable
- ✅ Error recovery clear
- ✅ Overall experience smooth

---

## Risk Mitigation

### Risk 1: AI-Generated Code Quality
**Mitigation**:
- Comprehensive test requirements for all tasks
- Multiple validation points
- Human review at phase gates
- QA agent validates all code

### Risk 2: Claude Code Plugin API Incompatibility
**Mitigation**:
- Early testing at Phase 1 gate
- Abstraction layer for plugin API
- Fallback implementations
- Quick pivot if needed

### Risk 3: lazy-mcp Integration Issues
**Mitigation**:
- Phase 3 dedicated to integration
- Comprehensive integration tests
- Fallback: Build own registry (Option 3)
- Early validation with actual lazy-mcp

### Risk 4: Performance Issues
**Mitigation**:
- Performance requirements in all tasks
- Dedicated Phase 6 optimization
- Continuous benchmarking
- Performance regression tests

---

## Next Steps

### Immediate (Now)
1. ✅ **Approve AI execution plan**: Confirm approach
2. ✅ **License confirmed**: MIT allows integration
3. ⏳ **Begin Phase 1**: Launch backend-architect for Task 1.1

### This Week (Phase 1)
1. AI agents complete Tasks 1.1-1.4
2. Human testing at Pause Point 1.1
3. Bug fixes if needed
4. Approval to proceed to Phase 2

### Weeks 2-6 (Phases 2-6)
1. AI agents execute all tasks
2. Human testing at each phase gate
3. Iterative bug fixes
4. Final polish and optimization

### Week 7 (Launch)
1. Final human testing
2. npm publish
3. Marketplace submission
4. Launch announcement

---

## Status

**Current Phase**: Pre-Phase 1 (Planning Complete)
**Next Action**: Begin Phase 1, Task 1.1 (Monorepo Structure)
**Estimated Completion**: 7 weeks from start
**License Status**: ✅ Approved (MIT allows integration)
**Ready to Execute**: ✅ YES

---

*For detailed requirements, see docs/requirements/*
*For architecture details, see docs/architecture/*
*For migration plan, see docs/MIGRATION_ROADMAP.md*

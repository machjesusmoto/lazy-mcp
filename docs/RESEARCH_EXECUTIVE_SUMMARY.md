# Plugin System Research - Executive Summary
*Quick Reference for System Architect & Requirements Analyst*

## 🎯 Bottom Line

**Lazy Loading Feasibility**: ⚠️ **Partially Feasible with Workarounds**

True runtime dynamic loading of MCP servers is **not yet available**, but we can achieve significant improvements using:
1. **PreToolUse Hooks**: Block/modify tool calls before execution
2. **Registry MCP Server Pattern**: Lightweight registry (~5k tokens) + on-demand loading
3. **Plugin Commands**: User-friendly toggle interface
4. **Profile System**: Pre-configured server combinations

**Expected Impact**:
- Context reduction: 50-95% (depending on implementation)
- User experience: One restart required per configuration change
- Maintenance: Integrated into Claude Code ecosystem

---

## 🏗️ Plugin Architecture Summary

### Required Components
1. **`.claude-plugin/plugin.json`** - Manifest with name, version
2. **`commands/*.md`** - Slash commands (`/toggle`, `/profile`, `/migrate`)
3. **`hooks/`** - Event handlers (PreToolUse for blocking)
4. **`.mcp.json`** or inline - MCP server configurations

### Key Capabilities
| Feature | Status | Notes |
|---------|--------|-------|
| Custom slash commands | ✅ Full support | Markdown-based guidance |
| PreToolUse hooks | ✅ Full support | Can block/modify tool calls |
| MCP server bundling | ✅ Full support | Restart required for changes |
| Runtime server loading | ❌ Not available | GitHub issues tracking |
| Profile management | ✅ Can implement | Via blocked.md manipulation |
| Marketplace distribution | ✅ Full support | GitHub-based repositories |

---

## 🔧 Critical Technical Details

### PreToolUse Hook Capabilities
```json
{
  "continue": true,                    // Proceed with tool call?
  "decision": "approve" | "block",     // Bypass permission system
  "systemMessage": "...",              // User notification
  "updatedInput": { ... }              // Modify tool parameters (v2.0.10+)
}
```

**Blocking Pattern**:
- Hooks execute **before** tool call
- Can read project `.claude/blocked.md`
- Block MCP server tools if server is disabled
- Notify user to run `/toggle` command

### MCP Server Lifecycle
- ⚠️ **Restart required** to enable/disable servers
- Servers loaded at session start (eager, not lazy)
- Tool schemas consume context tokens immediately
- @mentioning servers (v2.0.10) doesn't reduce context

---

## 💡 Recommended Implementation Strategy

### Phase 1: Basic Plugin (Week 1)
**Goal**: Working plugin with toggle functionality

**Deliverables**:
- Plugin manifest and structure
- `/toggle` command for blocked.md management
- Basic PreToolUse hook for enforcing blocks
- Installation documentation

**Outcome**: Users can manage server blocking via plugin commands

### Phase 2: Hook Integration (Week 2)
**Goal**: Seamless blocking with user feedback

**Deliverables**:
- PreToolUse hook reads blocked.md
- System messages notify about disabled servers
- Profile switching via `/profile` command
- Error handling and logging

**Outcome**: Transparent blocking with helpful error messages

### Phase 3: Registry Server (Week 3-4)
**Goal**: Context token reduction via lazy loading pattern

**Deliverables**:
- Lightweight registry MCP server (~5k tokens)
- Keyword-based server activation
- Registry tools: `list`, `load`, `info`
- Context reduction metrics (target: 50-95%)

**Outcome**: Significant context savings, closer to true lazy loading

### Phase 4: Polish & Distribution (Week 5)
**Goal**: Community-ready plugin

**Deliverables**:
- Comprehensive documentation
- Marketplace listing
- Migration guide from v1 CLI tool
- Demo videos and examples

**Outcome**: Public plugin available for installation

---

## 🚨 Critical Constraints

### What We **CAN** Do
✅ Enforce server blocking via PreToolUse hooks
✅ Provide user-friendly toggle commands
✅ Manage profiles and configurations
✅ Reduce context via registry pattern
✅ Integrate seamlessly with Claude Code

### What We **CANNOT** Do
❌ Load/unload servers without restart
❌ Dynamically reduce context mid-session
❌ Automatically activate servers on-demand
❌ Completely eliminate manual restarts

### Workaround Strategy
1. **Accept restart requirement** as current limitation
2. **Focus on user experience** around restarts
3. **Build registry pattern** for future compatibility
4. **Track upstream issues** for true lazy loading

---

## 📊 Token Impact Analysis

### Current State (mcp-toggle CLI)
- MCP servers: 19 × ~2k tokens = **~38k tokens**
- Agents: 4 × ~5k tokens = **~20k tokens**
- Memory files: varies = **~10-50k tokens**
- **Total: ~68-108k tokens** (34-54% of 200k limit)

### With Plugin Approach
- Registry server: **~5k tokens** (lightweight schema)
- Active servers: **0 tokens** (until activated)
- Hooks: **0 tokens** (not in context)
- **Total: ~5k tokens** (2.5% of limit)
- **Reduction: 93-95%**

### With Registry + Selective Loading
- Registry: **~5k tokens**
- Loaded servers: 3-5 × ~2k = **~6-10k tokens**
- **Total: ~11-15k tokens** (5.5-7.5% of limit)
- **Reduction: 78-86%**

---

## 🔗 Key Resources

### Official Documentation
- **Plugins**: https://docs.claude.com/en/docs/claude-code/plugins
- **Hooks**: https://docs.claude.com/en/docs/claude-code/hooks
- **Marketplace**: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces

### GitHub Issues (Tracking Upstream)
- **#7336**: Lazy loading feature request (our POC referenced)
- **#6638**: Dynamic loading/unloading
- **#7172**: Token management improvements

### Community Examples
- **Lazy Loading POC**: https://github.com/machjesusmoto/claude-lazy-loading
- **Hooks Mastery**: https://github.com/disler/claude-code-hooks-mastery

---

## 🎬 Next Steps for System Architect

### Immediate Tasks
1. **Review full research document** (`PLUGIN_SYSTEM_RESEARCH.md`)
2. **Design plugin architecture** based on Phase 1-4 plan
3. **Define component interfaces** (commands, hooks, registry)
4. **Create technical specifications** for implementation

### Key Design Decisions
- [ ] Registry server schema design
- [ ] Keyword detection algorithm
- [ ] Profile JSON format
- [ ] Migration strategy from v1
- [ ] Error handling and UX flows

### Architecture Deliverables
- Component diagram (plugin structure)
- Sequence diagrams (toggle flow, hook execution)
- Data models (blocked.md, profiles, registry)
- API specifications (registry tools)

---

## 📋 Next Steps for Requirements Analyst

### User Story Refinement
Based on research, prioritize:
1. **High Value**: PreToolUse hook blocking (immediate user benefit)
2. **Medium Value**: Profile management (DX improvement)
3. **High Impact**: Registry pattern (context reduction)
4. **Low Priority**: Advanced features (server recommendation, analytics)

### Acceptance Criteria Updates
- Add "restart required" notifications
- Define error messages for blocked tools
- Specify profile switching behavior
- Document registry tool responses

### Risk Assessment
- **High**: Runtime loading not available (workaround required)
- **Medium**: Hook performance impact (need benchmarks)
- **Low**: Plugin installation complexity (well-documented)

---

**Status**: ✅ **Research Complete** - Ready for architecture and requirements phases

**Full Details**: See `PLUGIN_SYSTEM_RESEARCH.md` for comprehensive technical documentation (100+ sections, code examples, migration paths)

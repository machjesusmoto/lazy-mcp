# Technical Decision Records
*mcp-toggle Claude Code Plugin*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## Decision Record Format

Each decision record follows this structure:
- **Decision ID**: Unique identifier
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: Problem being addressed
- **Decision**: What we decided
- **Rationale**: Why this decision was made
- **Consequences**: Positive and negative impacts
- **Alternatives**: Options considered and rejected
- **References**: Related documents and discussions

---

## TDR-001: Hybrid Approach (Hooks + Registry + Profiles)

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Claude Code does not support runtime dynamic loading/unloading of MCP servers. All servers must be configured at session start and require a restart to change configuration. We need to achieve 78-95% token reduction while working within this constraint.

### Decision

Implement a hybrid approach combining three mechanisms:
1. **PreToolUse Hooks** - Block disabled server tools before execution
2. **Registry MCP Server** - Lightweight keyword-based server discovery (~5k tokens)
3. **Profile System** - Workflow-based configuration management

### Rationale

**Why Not Pure Lazy Loading?**
- Runtime MCP server loading not available in Claude Code 2.0.12
- No API to dynamically add/remove servers mid-session
- Restart required for configuration changes

**Why Hybrid Approach?**
- **Hooks**: Provide enforcement and user feedback (works now)
- **Registry**: Achieves token reduction through lightweight discovery (proven 95% reduction)
- **Profiles**: Makes configuration changes user-friendly (one restart per workflow)
- Combined: Delivers practical benefits while waiting for upstream lazy loading support

### Consequences

**Positive:**
- ✅ 78-95% token reduction achieved
- ✅ Works within current Claude Code constraints
- ✅ User-friendly workflow management
- ✅ Graceful degradation if registry fails
- ✅ Future-proof for true lazy loading when available

**Negative:**
- ❌ Restart still required for configuration changes
- ❌ Registry server always loaded (5k tokens)
- ❌ More complex architecture than pure lazy loading
- ❌ User must understand restart requirement

### Alternatives Considered

**Alternative 1: PreToolUse Hooks Only**
- Pros: Simple, no additional servers
- Cons: No token reduction, just blocking
- Rejected: Doesn't solve core problem

**Alternative 2: Pure Registry Pattern**
- Pros: Maximum token reduction
- Cons: User must manually activate servers every time
- Rejected: Poor user experience

**Alternative 3: Wait for Upstream Support**
- Pros: Simplest long-term solution
- Cons: No timeline, users need solution now
- Rejected: Not viable for current needs

### References
- Research: `/docs/PLUGIN_SYSTEM_RESEARCH.md`
- GitHub Issue: anthropics/claude-code#7336

---

## TDR-002: Dummy Override Mechanism for Blocking

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

To block an inherited MCP server, we need a mechanism that:
1. Prevents the inherited server from loading
2. Preserves the original configuration for restoration
3. Works with Claude Code's configuration hierarchy
4. Is reversible without data loss

### Decision

Use dummy override mechanism in `.mcp.json`:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "echo",
      "args": ["Blocked by mcp-toggle"],
      "_mcpToggleBlocked": true,
      "_mcpToggleBlockedAt": "2025-10-12T10:30:00Z",
      "_mcpToggleOriginal": {
        "command": "original-command",
        "args": ["original", "args"]
      }
    }
  }
}
```

### Rationale

**Why Dummy Override?**
- Leverages Claude Code's native configuration precedence
- Project `.mcp.json` overrides user `~/.claude.json`
- `echo` command is safe, fast, and universally available
- Preserves original config in metadata for restoration

**Why Not Other Approaches?**
- File deletion: Loses configuration, not reversible
- Comment out: Not supported in JSON format
- Separate blocklist: Requires Claude Code changes

### Consequences

**Positive:**
- ✅ Works with existing Claude Code configuration system
- ✅ No data loss (original config preserved)
- ✅ Fully reversible
- ✅ No Claude Code modifications required
- ✅ Clear audit trail (metadata shows when/why blocked)

**Negative:**
- ❌ Adds entries to `.mcp.json` (file grows)
- ❌ Requires metadata parsing to detect blocks
- ❌ `echo` command still executes (negligible overhead)

### Alternatives Considered

**Alternative 1: Delete Server Configuration**
- Pros: Clean, minimal file size
- Cons: Loses original config, not reversible without backup
- Rejected: Data loss risk too high

**Alternative 2: Invalid Command**
- Pros: Server fails to start (true blocking)
- Cons: Error messages in logs, unclear intent
- Rejected: Poor user experience, confusing errors

**Alternative 3: Separate Blocklist File**
- Pros: Clean separation of concerns
- Cons: Requires Claude Code support, not available
- Rejected: Not implementable currently

### References
- Specification: `/docs/specs/002-redesign-mcp-toggle/SPEC.md`
- Implementation: `/src/core/blocked-manager.ts`

---

## TDR-003: Monorepo Structure with Shared Core

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

We have an existing v1.x CLI tool and need to add a v2.0 Claude Code plugin. We want to:
1. Maintain compatibility with CLI tool
2. Share business logic between CLI and plugin
3. Enable independent releases
4. Support both interfaces long-term

### Decision

Adopt monorepo structure with shared core library:
```
mcp-toggle/
├── packages/
│   ├── core/          # Shared business logic
│   ├── cli/           # CLI tool (existing)
│   └── plugin/        # Claude Code plugin (new)
└── package.json       # Monorepo root
```

### Rationale

**Why Monorepo?**
- Single source of truth for business logic
- Both CLI and plugin use identical configuration formats
- Easier testing across implementations
- Consistent behavior guaranteed

**Why Shared Core?**
- Eliminates code duplication
- Ensures configuration compatibility
- Simplifies maintenance
- Enables feature parity

### Consequences

**Positive:**
- ✅ CLI and plugin share same logic (no divergence)
- ✅ Bug fixes benefit both implementations
- ✅ Configuration formats guaranteed compatible
- ✅ Users can switch between CLI and plugin seamlessly

**Negative:**
- ❌ More complex build process
- ❌ Requires monorepo tooling (Lerna/npm workspaces)
- ❌ Larger repository size
- ❌ Cross-package dependency management

### Alternatives Considered

**Alternative 1: Separate Repositories**
- Pros: Simple, independent releases
- Cons: Code duplication, divergence risk
- Rejected: Too high maintenance burden

**Alternative 2: Plugin Only (Deprecate CLI)**
- Pros: Single codebase, simpler
- Cons: Removes standalone tool, CI/CD use case lost
- Rejected: CLI has value outside Claude Code

**Alternative 3: CLI as Thin Wrapper**
- Pros: Plugin becomes primary
- Cons: CLI dependent on plugin installation
- Rejected: Architectural inversion, fragile

### References
- Migration: `/docs/architecture/06-MIGRATION_ARCHITECTURE.md`
- Package management: npm workspaces

---

## TDR-004: Markdown-Based Commands (Not Executable)

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Claude Code plugins support custom commands, but commands are defined as markdown files that provide guidance to Claude, not executable scripts. We need to decide how to implement command handlers given this constraint.

### Decision

Use markdown command definitions with business logic in core library:
- Commands are markdown files (`commands/*.md`)
- Claude interprets markdown as guidance
- Business logic implemented in shared core library
- Commands describe behavior, core executes it

### Rationale

**Why Markdown?**
- Native Claude Code plugin system design
- Claude excels at interpreting natural language
- Flexible, can describe complex workflows
- No security concerns (not executable)

**Why Not Executable Scripts?**
- Claude Code doesn't support direct command execution from plugins
- Would require workarounds or shell scripts
- Security implications of arbitrary code execution
- Not aligned with plugin system design

### Consequences

**Positive:**
- ✅ Follows Claude Code plugin design patterns
- ✅ Clear separation: guidance (markdown) vs logic (TypeScript)
- ✅ Easy to document and understand
- ✅ Claude can adapt behavior based on context

**Negative:**
- ❌ Not traditional CLI-style command execution
- ❌ Relies on Claude's interpretation (less deterministic)
- ❌ Cannot directly call shell scripts or binaries
- ❌ More verbose than executable handlers

### Alternatives Considered

**Alternative 1: Shell Script Handlers**
- Pros: Direct execution, deterministic
- Cons: Not supported by plugin system
- Rejected: Would require hooks as workaround

**Alternative 2: Node.js Scripts**
- Pros: Full JavaScript environment
- Cons: Not how plugin commands work
- Rejected: Misaligned with system design

**Alternative 3: Hybrid (Markdown + Hooks)**
- Pros: Combines guidance with execution
- Cons: Complex, confusing architecture
- Rejected: Overcomplicates simple commands

### References
- Plugin docs: https://docs.claude.com/en/docs/claude-code/plugins-reference
- Example: `/commands/toggle.md`

---

## TDR-005: JSON Schema Validation for Configurations

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Configuration files (`.mcp.json`, profiles, registry metadata) are critical to plugin functionality. Invalid configurations can cause:
- Plugin failures
- Data corruption
- Poor user experience
- Security vulnerabilities

### Decision

Implement comprehensive JSON schema validation:
- Define JSON schemas for all configuration formats
- Validate on read (detect corruption early)
- Validate on write (prevent invalid writes)
- Provide clear error messages with recovery suggestions

### Rationale

**Why JSON Schema?**
- Industry standard for JSON validation
- Excellent tooling and library support
- Self-documenting (schemas serve as specs)
- Enables IDE autocomplete and validation

**Why Validate on Read AND Write?**
- Read: Detect user edits or corruption
- Write: Prevent plugin from creating invalid configs
- Defense in depth approach

### Consequences

**Positive:**
- ✅ Early error detection (fail fast)
- ✅ Clear error messages guide users
- ✅ Prevents data corruption
- ✅ Self-documenting configuration formats
- ✅ IDE support (autocomplete, validation)

**Negative:**
- ❌ Additional validation overhead (~1-5ms)
- ❌ Schema maintenance burden
- ❌ More complex error handling
- ❌ Larger bundle size (schema files)

### Alternatives Considered

**Alternative 1: Runtime Type Checking (Zod/TypeScript)**
- Pros: Type-safe, integrated with TypeScript
- Cons: No JSON schema output, less tooling
- Rejected: JSON schema provides more value

**Alternative 2: No Validation (Trust Input)**
- Pros: Simple, fast
- Cons: Fragile, poor error messages
- Rejected: Too risky for critical configs

**Alternative 3: Validate on Write Only**
- Pros: Simpler, fewer checks
- Cons: Doesn't catch user edits or corruption
- Rejected: Incomplete protection

### References
- Schema directory: `/schemas/`
- Validator: `/lib/validation.ts`

---

## TDR-006: Atomic Operations with Backup/Rollback

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Configuration operations can fail partway through (permission errors, disk full, crashes). Without proper handling, this can leave configuration in inconsistent state, requiring manual recovery.

### Decision

Implement atomic operations with backup/rollback:
1. **Backup**: Create timestamped backups before modifications
2. **Execute**: Perform all file operations
3. **Verify**: Validate all changes
4. **Commit or Rollback**: Delete backups on success, restore on failure

### Rationale

**Why Atomic Operations?**
- Guarantees consistency (all-or-nothing)
- Prevents partial state corruption
- Enables safe error recovery
- Builds user trust

**Why Timestamped Backups?**
- Allows multiple backup versions
- Supports manual recovery if needed
- Provides audit trail
- Can be retained for debugging

### Consequences

**Positive:**
- ✅ Configuration always consistent
- ✅ Automatic error recovery
- ✅ Manual recovery possible (backups retained)
- ✅ User confidence (no data loss)
- ✅ Audit trail for debugging

**Negative:**
- ❌ Additional I/O overhead (backup creation)
- ❌ Disk space usage (backups)
- ❌ More complex error handling
- ❌ Longer operation times (~50-100ms)

### Alternatives Considered

**Alternative 1: No Backups (Direct Writes)**
- Pros: Simple, fast
- Cons: No recovery on failure
- Rejected: Too risky, poor UX

**Alternative 2: In-Memory Staging**
- Pros: Fast, no disk I/O
- Cons: Lost on crash, harder to debug
- Rejected: Not safe enough

**Alternative 3: Database Transactions**
- Pros: True ACID guarantees
- Cons: Requires database, overkill for file configs
- Rejected: Too complex for use case

### References
- Implementation: `/lib/file-utils.ts`
- Pattern: Transaction pattern with rollback

---

## TDR-007: Registry Metadata Database (Not Live Queries)

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Registry MCP server needs server metadata (keywords, token costs, descriptions) to provide suggestions. We need to decide between:
1. Static database (pre-built metadata file)
2. Live queries (inspect actual MCP servers)

### Decision

Use static metadata database (`registry/metadata.json`):
- Pre-built during plugin build
- Contains all known MCP servers
- Updated manually or via automation
- Fast queries (<10ms)

### Rationale

**Why Static Database?**
- **Performance**: No I/O, instant queries
- **Reliability**: Works even if servers not installed
- **Token Budget**: Metadata separate from server loading
- **Predictability**: Known set of servers

**Why Not Live Queries?**
- Requires loading actual servers (defeats lazy loading)
- Network I/O for remote servers (slow, unreliable)
- Permissions issues (may not have access)
- Unpredictable results (servers may not be installed)

### Consequences

**Positive:**
- ✅ Fast queries (<10ms)
- ✅ Works without servers installed
- ✅ Maintains token budget (~5k)
- ✅ Predictable results
- ✅ Offline-friendly

**Negative:**
- ❌ Requires manual updates (stale data risk)
- ❌ Doesn't know about custom servers
- ❌ May suggest unavailable servers
- ❌ Maintenance burden

### Alternatives Considered

**Alternative 1: Live Server Inspection**
- Pros: Always accurate, knows custom servers
- Cons: Slow, defeats lazy loading, unreliable
- Rejected: Violates core constraint

**Alternative 2: Hybrid (Static + Discovery)**
- Pros: Best of both worlds
- Cons: Complex, still has live query issues
- Rejected: Too complex for v2.0

**Alternative 3: User-Provided Metadata**
- Pros: Knows custom servers
- Cons: User burden, likely incomplete
- Rejected: Poor UX, fragile

### References
- Database: `/registry/metadata.json`
- Schema: `/schemas/registry-metadata.schema.json`

---

## TDR-008: Profile Format (JSON Not YAML)

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Profiles define workflow-based server/memory/agent configurations. Format options:
- JSON (JavaScript Object Notation)
- YAML (YAML Ain't Markup Language)
- TOML (Tom's Obvious Minimal Language)

### Decision

Use JSON for profile format:
```json
{
  "name": "profile-name",
  "description": "...",
  "servers": {
    "enabled": [...],
    "disabled": [...]
  }
}
```

### Rationale

**Why JSON?**
- **Native JavaScript Support**: No parser needed
- **Validation**: JSON Schema widely supported
- **Tooling**: Excellent IDE support
- **Consistency**: Matches `.mcp.json`, `~/.claude.json`
- **Speed**: Fast parsing

**Why Not YAML?**
- Requires parser library (~50KB)
- More complex parsing (slower)
- Whitespace-sensitive (error-prone)
- Less tooling support

### Consequences

**Positive:**
- ✅ No additional dependencies
- ✅ Fast parsing (<1ms)
- ✅ Consistent with other configs
- ✅ JSON Schema validation
- ✅ IDE autocomplete works

**Negative:**
- ❌ Less human-friendly (no comments)
- ❌ Stricter syntax (commas, quotes)
- ❌ Larger file size than YAML
- ❌ Can't embed documentation

### Alternatives Considered

**Alternative 1: YAML**
- Pros: Human-friendly, comments supported
- Cons: Requires parser, slower, more errors
- Rejected: Unnecessary complexity

**Alternative 2: TOML**
- Pros: Clear, configuration-focused
- Cons: Less common, worse tooling
- Rejected: Unfamiliar to most developers

**Alternative 3: JavaScript/TypeScript**
- Pros: Executable, full language features
- Cons: Security risk, more complex
- Rejected: Overkill, security concerns

### References
- Profile schema: `/schemas/profile.schema.json`
- Examples: `/.claude/profiles/*.json`

---

## TDR-009: Memory File Blocking (.md.blocked Extension)

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

Memory files (`.claude/memories/*.md`) consume context tokens. We need a mechanism to temporarily disable them without deleting content.

### Decision

Rename memory files with `.blocked` extension:
- Active: `.claude/memories/coding-standards.md`
- Blocked: `.claude/memories/coding-standards.md.blocked`
- Claude Code ignores `.blocked` files

### Rationale

**Why Rename?**
- Simple, no configuration changes needed
- Reversible (just rename back)
- Preserves file content
- Works with Claude Code's file scanning

**Why `.blocked` Extension?**
- Clear intent (file is blocked)
- Searchable (`*.md.blocked`)
- Compatible with gitignore patterns
- Matches plugin naming

### Consequences

**Positive:**
- ✅ Simple mechanism
- ✅ Fully reversible
- ✅ No data loss
- ✅ Works immediately (no restart)
- ✅ Easy to audit (ls *.blocked)

**Negative:**
- ❌ File system operations required
- ❌ Potential race conditions (concurrent access)
- ❌ Non-standard extension
- ❌ Manual edits need re-blocking

### Alternatives Considered

**Alternative 1: Separate Blocked Directory**
- Pros: Cleaner, isolated
- Cons: More complex, breaks relative paths
- Rejected: Unnecessary complexity

**Alternative 2: Settings.json Deny Patterns**
- Pros: Centralized control
- Cons: Not supported for memory files
- Rejected: Not available in Claude Code

**Alternative 3: Delete Files**
- Pros: Simplest
- Cons: Data loss risk
- Rejected: Too destructive

### References
- Implementation: `/src/core/memory-blocker.ts`
- Pattern: Similar to `.gitignore`, `.bak` files

---

## TDR-010: Hook Timeout (60 Seconds Max)

**Status**: Accepted
**Date**: 2025-10-12
**Decision Maker**: System Architect

### Context

PreToolUse hooks must execute quickly to avoid blocking user workflow. Claude Code has default 60-second timeout, but we can set custom timeout.

### Decision

Set PreToolUse hook timeout to 10 seconds:
```json
{
  "PreToolUse": [{
    "hooks": [{
      "timeout": 10000
    }]
  }]
}
```

Target hook execution: <50ms

### Rationale

**Why 10 Seconds?**
- Plenty of time for file operations (~1-5ms)
- Prevents hung hooks from blocking forever
- User experiences minimal delay
- Allows for retry logic if needed

**Why Not 60 Seconds (Default)?**
- Too long, blocks user workflow
- Suggests inefficient hook implementation
- Poor user experience

**Why Not 1 Second?**
- May not be enough for slow file systems
- Network-mounted directories can be slow
- Edge cases (high system load) need buffer

### Consequences

**Positive:**
- ✅ Fast user experience (<50ms typical)
- ✅ Prevents infinite hangs
- ✅ Forces efficient implementation
- ✅ Reasonable buffer for edge cases

**Negative:**
- ❌ May fail on very slow systems
- ❌ Requires careful optimization
- ❌ Less forgiving of inefficient code

### Alternatives Considered

**Alternative 1: No Timeout**
- Pros: No false positives
- Cons: Can hang indefinitely
- Rejected: Poor UX, system instability

**Alternative 2: 1 Second**
- Pros: Forces maximum efficiency
- Cons: Too tight, may fail on slow systems
- Rejected: Too aggressive

**Alternative 3: 60 Seconds (Default)**
- Pros: Generous, unlikely to timeout
- Cons: Allows inefficient implementation
- Rejected: Too permissive

### References
- Hook config: `/hooks/hooks.json`
- Target: <50ms average execution

---

## Summary of Key Decisions

| ID | Decision | Status | Impact |
|----|----------|--------|--------|
| TDR-001 | Hybrid Approach (Hooks + Registry + Profiles) | Accepted | High |
| TDR-002 | Dummy Override Mechanism | Accepted | High |
| TDR-003 | Monorepo Structure | Accepted | Medium |
| TDR-004 | Markdown-Based Commands | Accepted | Medium |
| TDR-005 | JSON Schema Validation | Accepted | Medium |
| TDR-006 | Atomic Operations with Backup/Rollback | Accepted | High |
| TDR-007 | Static Registry Metadata | Accepted | Medium |
| TDR-008 | JSON Profile Format | Accepted | Low |
| TDR-009 | .md.blocked Extension | Accepted | Low |
| TDR-010 | 10 Second Hook Timeout | Accepted | Low |

**Critical Decisions (High Impact):**
- TDR-001: Defines overall architecture
- TDR-002: Enables core blocking mechanism
- TDR-006: Ensures data safety and consistency

**Foundation Decisions (Medium Impact):**
- TDR-003: Enables CLI and plugin coexistence
- TDR-004: Aligns with Claude Code plugin system
- TDR-005: Prevents configuration errors
- TDR-007: Enables fast registry queries

**Implementation Decisions (Low Impact):**
- TDR-008: Profile format choice
- TDR-009: Memory blocking mechanism
- TDR-010: Hook performance target

These decisions form the technical foundation for the mcp-toggle plugin architecture and are referenced throughout the implementation documentation.

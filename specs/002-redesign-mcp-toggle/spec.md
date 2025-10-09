# Feature Specification: Actual MCP Server Blocking via .claude.json Modification

**Feature Branch**: `002-redesign-mcp-toggle`
**Created**: 2025-10-08
**Status**: Draft
**Input**: User description: "Redesign mcp-toggle to actually block MCP servers by modifying .claude.json files instead of using documentation-based blocking that Claude Code doesn't enforce"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Block Local MCP Server (Priority: P1)

A developer working on a project wants to temporarily disable a locally-configured MCP server that's causing issues or slowing down their development workflow. They run mcp-toggle, select the server, and immediately see the server stop loading on next Claude Code launch.

**Why this priority**: This is the core functionality and most common use case. Without this working, the tool has no value. Blocking local servers is simpler than inherited servers (no override complexity) and delivers immediate value.

**Independent Test**: Can be fully tested by: (1) creating a .claude.json with one MCP server, (2) running mcp-toggle to block it, (3) verifying the server is removed from .claude.json, (4) confirming Claude Code doesn't load the server.

**Acceptance Scenarios**:

1. **Given** a project with .claude.json containing a local MCP server, **When** user blocks the server via mcp-toggle, **Then** the server configuration is removed from the project's .claude.json
2. **Given** a blocked local server, **When** Claude Code starts in that project, **Then** the MCP server does not load
3. **Given** multiple local servers in .claude.json, **When** user blocks one server, **Then** only that server is removed and others remain unchanged
4. **Given** a blocked local server, **When** user views the TUI, **Then** the server shows as blocked with visual indicator

---

### User Story 2 - Unblock Local MCP Server (Priority: P1)

A developer who previously blocked a local MCP server now wants to re-enable it. They run mcp-toggle, select the blocked server to unblock, but discover they need to manually re-add the configuration because the tool cannot restore it (acceptable limitation documented to user).

**Why this priority**: Unblocking is essential paired functionality with blocking. Users need the ability to reverse their decisions. This is P1 because without unblocking, the tool is one-way and frustrating.

**Independent Test**: Can be fully tested by: (1) having a previously blocked local server, (2) running mcp-toggle to unblock, (3) seeing clear message that manual re-add is required, (4) user manually adds config, (5) verifying server loads on next Claude Code launch.

**Acceptance Scenarios**:

1. **Given** a previously blocked local server, **When** user attempts to unblock it, **Then** system displays message explaining manual re-add is required with instructions
2. **Given** instructions to manually re-add server, **When** user adds the configuration to .claude.json, **Then** server loads on next Claude Code launch
3. **Given** a blocked local server, **When** user views TUI, **Then** unblock option is available and clearly indicates manual re-add will be needed

---

### User Story 3 - Block Inherited MCP Server (Priority: P2)

A developer working on a specific project wants to disable an MCP server that's defined in their home directory .claude.json but is problematic for this particular project. They block it via mcp-toggle, and the tool creates an override in the project's .claude.json that prevents the inherited server from loading while preserving the original configuration.

**Why this priority**: Critical for multi-project environments where global MCP servers exist but aren't needed everywhere. This is P2 because it's more complex (requires override mechanism) but still essential for the tool's utility across diverse project structures.

**Independent Test**: Can be fully tested by: (1) having a parent/home .claude.json with MCP server, (2) running mcp-toggle in project directory to block inherited server, (3) verifying project .claude.json now has override with dummy command, (4) confirming server doesn't load for this project, (5) verifying server still loads in other projects.

**Acceptance Scenarios**:

1. **Given** an inherited MCP server from parent directory, **When** user blocks it in project, **Then** project .claude.json contains override with dummy echo command
2. **Given** a blocked inherited server, **When** Claude Code starts in project, **Then** the inherited server does not load
3. **Given** a blocked inherited server in one project, **When** Claude Code starts in a different project, **Then** the inherited server still loads normally (override is project-specific)
4. **Given** a blocked inherited server, **When** user views the override in .claude.json, **Then** original configuration is preserved in _mcpToggleOriginal field with blocking metadata

---

### User Story 4 - Unblock Inherited MCP Server (Priority: P2)

A developer who previously blocked an inherited MCP server for a specific project now wants to re-enable it. They unblock it via mcp-toggle, the override is removed from the project's .claude.json, and the server loads again from the parent configuration on next Claude Code launch.

**Why this priority**: Paired with P2 blocking of inherited servers. Essential for flexible project-specific configuration. Simpler than unblocking local servers because original config is preserved in override.

**Independent Test**: Can be fully tested by: (1) having a blocked inherited server with override in project .claude.json, (2) running mcp-toggle to unblock, (3) verifying override is removed from project config, (4) confirming server loads from parent config on next Claude Code launch.

**Acceptance Scenarios**:

1. **Given** a blocked inherited server with override in project .claude.json, **When** user unblocks it, **Then** the override is removed from project configuration
2. **Given** unblocked inherited server, **When** Claude Code starts, **Then** server loads from parent/home .claude.json normally
3. **Given** a blocked inherited server, **When** user views TUI, **Then** unblock option clearly indicates it will restore inheritance from parent config

---

### User Story 5 - Block Memory Files (Priority: P3)

A developer wants to temporarily disable specific Claude Code memory files that contain outdated or problematic context. They block the memory files via mcp-toggle, and the files are renamed with .blocked extension so Claude Code doesn't load them.

**Why this priority**: Useful feature but less critical than MCP server blocking. Memory files are secondary to the core MCP server management. P3 because it's an enhancement that improves the tool but isn't required for primary value.

**Independent Test**: Can be fully tested by: (1) having .claude/memories/file.md, (2) running mcp-toggle to block it, (3) verifying file is renamed to file.md.blocked, (4) confirming Claude Code doesn't load the memory on next launch.

**Acceptance Scenarios**:

1. **Given** a memory file in .claude/memories/, **When** user blocks it, **Then** file is renamed from file.md to file.md.blocked
2. **Given** a blocked memory file (file.md.blocked), **When** Claude Code starts, **Then** the memory file is not loaded
3. **Given** multiple memory files, **When** user blocks one, **Then** only that file is renamed and others remain accessible

---

### User Story 6 - Unblock Memory Files (Priority: P3)

A developer who previously blocked memory files now wants to re-enable them. They unblock via mcp-toggle, and the files are renamed to remove .blocked extension so Claude Code loads them again.

**Why this priority**: Paired with P3 memory file blocking. Simple reversal operation that completes the memory management functionality.

**Independent Test**: Can be fully tested by: (1) having file.md.blocked, (2) running mcp-toggle to unblock, (3) verifying file is renamed to file.md, (4) confirming Claude Code loads the memory on next launch.

**Acceptance Scenarios**:

1. **Given** a blocked memory file (file.md.blocked), **When** user unblocks it, **Then** file is renamed from file.md.blocked to file.md
2. **Given** an unblocked memory file, **When** Claude Code starts, **Then** the memory file is loaded normally
3. **Given** a blocked memory file with nested .blocked extensions (file.md.blocked.blocked), **When** user unblocks, **Then** system handles gracefully by removing one .blocked extension level

---

### User Story 7 - Migrate from Legacy Blocked.md (Priority: P3)

A developer who previously used the v0.1.x version of mcp-toggle has a .claude/blocked.md file with documented blocks that weren't actually enforced. On first run of v2.0.0, the tool reads the legacy file, applies actual blocks using the new mechanism, and marks the old file as deprecated.

**Why this priority**: Important for existing users but not critical for new users. P3 because it's backward compatibility - nice to have but the tool functions fully without it. New users start fresh with correct implementation.

**Independent Test**: Can be fully tested by: (1) creating .claude/blocked.md with server names, (2) running new mcp-toggle version, (3) verifying servers are actually blocked via .claude.json modifications, (4) confirming legacy file is marked deprecated but preserved.

**Acceptance Scenarios**:

1. **Given** existing .claude/blocked.md file from v0.1.x, **When** user runs v2.0.0 for first time, **Then** tool reads legacy file and applies blocks using new .claude.json mechanism
2. **Given** successful migration, **When** migration completes, **Then** .claude/blocked.md is preserved with deprecation notice prepended
3. **Given** no legacy .claude/blocked.md file, **When** user runs v2.0.0, **Then** tool operates normally without migration step

---

### Edge Cases

- What happens when project has no .claude.json file?
  - Tool creates minimal .claude.json with empty mcpServers object before applying blocks

- What happens when user tries to block a server that doesn't exist in hierarchy?
  - Tool shows error message indicating server not found in any configuration level

- What happens when .claude.json is malformed or has syntax errors?
  - Tool backs up malformed file to .claude.json.backup and attempts to fix or creates new valid file

- What happens when user blocks the same inherited server in multiple nested project directories?
  - Each project gets its own independent override - blocks are project-specific and don't interfere

- What happens when user manually edits .claude.json while mcp-toggle is running?
  - Tool re-reads configuration before saving to detect conflicts and warns user of external modifications

- What happens when blocking a local server that has the same name as an inherited server?
  - Local server is removed from project config, inherited server is left unchanged (local removal takes precedence over inheritance)

- What happens when memory file is already blocked (file.md.blocked) and user tries to block again?
  - Tool detects already-blocked state and skips operation with informational message

- What happens when parent .claude.json has locked file permissions (read-only)?
  - Tool cannot and should not modify parent configs - inherited server blocking only creates overrides in project config

- What happens when disk is full during .claude.json write?
  - Atomic write process fails, backup is restored, user sees clear error with disk space issue

- What happens when two instances of mcp-toggle run simultaneously in same project?
  - Last write wins (standard file system behavior), but tool uses atomic writes to prevent corruption

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST modify .claude.json files directly to prevent MCP servers from loading, not rely on documentation
- **FR-002**: System MUST remove local MCP server configurations from project .claude.json when blocking local servers
- **FR-003**: System MUST create dummy override configurations in project .claude.json when blocking inherited servers
- **FR-004**: System MUST preserve original server configuration in _mcpToggleOriginal field when creating overrides
- **FR-005**: System MUST include blocking metadata (_mcpToggleBlocked, _mcpToggleBlockedAt) in override configurations
- **FR-006**: System MUST use "echo" command with descriptive message as dummy override to prevent server loading
- **FR-007**: System MUST remove override configurations from project .claude.json when unblocking inherited servers
- **FR-008**: System MUST notify users that manual re-add is required when unblocking local servers (configuration was removed)
- **FR-009**: System MUST rename memory files with .blocked extension (file.md → file.md.blocked) when blocking
- **FR-010**: System MUST remove .blocked extension (file.md.blocked → file.md) when unblocking memory files
- **FR-011**: System MUST create project .claude.json if it doesn't exist before applying blocks
- **FR-012**: System MUST use atomic write operations with backup/restore to prevent .claude.json corruption
- **FR-013**: System MUST set .claude.json file permissions to 644 after modifications
- **FR-014**: System MUST detect and read legacy .claude/blocked.md file on first run for migration
- **FR-015**: System MUST apply legacy blocks using new .claude.json mechanism during migration
- **FR-016**: System MUST preserve legacy .claude/blocked.md file with deprecation notice after migration
- **FR-017**: System MUST maintain backward compatibility with existing TUI interface and commands
- **FR-018**: System MUST validate JSON syntax after modifications to ensure well-formed .claude.json
- **FR-019**: System MUST distinguish between local servers (defined in project) and inherited servers (from parent/home)
- **FR-020**: System MUST never modify parent or home .claude.json files (only create overrides in project config)
- **FR-021**: System MUST display clear visual indicators in TUI showing whether servers are local or inherited
- **FR-022**: System MUST display clear visual indicators in TUI showing whether servers are blocked or unblocked
- **FR-023**: System MUST handle missing .claude directory by creating it with 755 permissions
- **FR-024**: System MUST handle malformed .claude.json by backing up to .claude.json.backup and creating valid replacement
- **FR-025**: System MUST support blocking/unblocking multiple items in single TUI session before saving
- **FR-026**: System MUST show confirmation prompt with list of changes before saving modifications
- **FR-027**: System MUST deprecate CLAUDE.md integration (no longer needed since blocks are enforced at load time)
- **FR-028**: System MUST maintain existing enumeration logic for discovering MCP servers and memory files
- **FR-029**: System MUST handle concurrent modifications gracefully with last-write-wins semantics
- **FR-030**: System MUST provide clear error messages with recovery instructions for all failure scenarios

### Key Entities

- **MCP Server Configuration**: Represents an MCP server as defined in .claude.json with command, args, env, and optional blocking metadata. Can be local (defined in project) or inherited (from parent/home directories).

- **Blocked Server Override**: Represents a dummy configuration in project .claude.json that overrides an inherited server with echo command, preventing it from loading while preserving original config in _mcpToggleOriginal field.

- **Memory File**: Represents a .md file in .claude/memories/ directory. Can be active (file.md) or blocked (file.md.blocked) based on file extension.

- **Claude JSON Config**: Represents the complete .claude.json file structure with mcpServers object and potential additional properties. Subject to atomic write operations with backup/restore.

- **Blocking Metadata**: Represents metadata fields (_mcpToggleBlocked, _mcpToggleBlockedAt, _mcpToggleOriginal) added to server configurations to track blocking state and preserve original settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can block an MCP server and verify it doesn't load on next Claude Code launch (100% enforcement)
- **SC-002**: Blocking operations complete in under 2 seconds for projects with up to 20 servers
- **SC-003**: All .claude.json modifications are atomic with zero corruption incidents during write failures
- **SC-004**: 90% of users successfully block their first server without reading documentation (intuitive TUI)
- **SC-005**: Migration from v0.1.x to v2.0.0 completes automatically on first run without user intervention
- **SC-006**: Inherited server blocks are project-specific with no impact on other projects (100% isolation)
- **SC-007**: Users can unblock inherited servers and verify they load from parent config on next Claude Code launch
- **SC-008**: System handles malformed .claude.json files with 100% backup and recovery success rate
- **SC-009**: TUI clearly distinguishes local vs inherited servers with visual indicators visible within 1 second
- **SC-010**: Support tickets related to "blocks not working" reduce to zero (current state: fundamental architecture flaw)
- **SC-011**: Memory file blocking/unblocking operations complete instantly (under 500ms)
- **SC-012**: 95% of existing v0.1.x users successfully migrate to v2.0.0 without data loss

## Assumptions

- Users have read/write permissions to project directories where they run mcp-toggle
- Users do not have read/write permissions to parent/home .claude.json files (requiring override mechanism)
- Claude Code loads MCP servers from .claude.json before any AI processing begins
- .claude.json follows standard JSON syntax without comments
- Standard Node.js fs-extra operations are sufficient for atomic writes
- Users understand they cannot recover local server configs after removal (acceptable data loss documented in UI)
- Memory files use .md extension as standard convention
- Blocking state does not need to be synced across multiple machines (local-only)
- Users run mcp-toggle from the project root directory where .claude.json should be created/modified

## Out of Scope

- Server configuration backup/restore system for local servers (too complex for v2.0.0)
- GUI application outside terminal (TUI remains the interface)
- Remote MCP server management across network
- Configuration sync between multiple machines or team members
- Undo/redo system for blocking operations
- Server health monitoring or diagnostics
- Automatic detection of problematic servers
- Integration with other Claude Code configuration systems beyond .claude.json
- Support for JSON-with-comments or non-standard .claude.json formats
- Modification of parent/home .claude.json files (override mechanism only)
- Version control integration or git hooks
- Permission management or access control for .claude.json files

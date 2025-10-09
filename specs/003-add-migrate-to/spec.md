# Feature Specification: Migrate to Global

**Feature Branch**: `003-add-migrate-to`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "Add 'Migrate to Global' feature to move project-local MCP servers to global configuration for unified blocking mechanism"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Migrate Project Server to Global (Priority: P1)

A developer has MCP servers defined in their project's `.mcp.json` file that they want to make available across all projects. They want to migrate these servers to their global configuration so they can use a unified blocking mechanism instead of deleting servers from the project file.

**Why this priority**: This is the core functionality that solves the fundamental UX issue where blocking project-local servers deletes them permanently. This enables the unified blocking mechanism that was the original intent of v2.0.0.

**Independent Test**: Can be fully tested by running the migrate command on a project with local MCP servers and verifying they appear in `~/.claude.json` while being removed from `.mcp.json`. Delivers immediate value by enabling users to preserve server configurations when blocking.

**Acceptance Scenarios**:

1. **Given** a project with 2 MCP servers defined in `.mcp.json`, **When** user selects "Migrate to Global" and confirms, **Then** both servers are added to `~/.claude.json` mcpServers section and removed from `.mcp.json`
2. **Given** a project with servers in `.mcp.json` that share names with servers already in `~/.claude.json`, **When** user attempts migration, **Then** system detects conflicts and prompts user to resolve (skip, overwrite, or rename)
3. **Given** a project with no local MCP servers, **When** user selects "Migrate to Global", **Then** system displays message "No project-local servers to migrate" and returns to main menu
4. **Given** successful migration of servers, **When** user returns to main TUI view, **Then** previously local servers now show `[global]` label and can be blocked/unblocked without deletion

---

### User Story 2 - Selective Migration (Priority: P2)

A developer has multiple MCP servers in `.mcp.json` but only wants to migrate specific ones to global configuration, keeping others project-specific for team collaboration purposes.

**Why this priority**: Provides flexibility for mixed use cases where some servers should remain project-specific (shared with team via version control) while others become global (personal preference). Enhances the core migration feature without being essential for the primary UX fix.

**Independent Test**: Can be tested by presenting a selection interface for servers during migration and verifying only selected servers are migrated. Delivers value by allowing users to maintain project-specific servers while globalizing personal preferences.

**Acceptance Scenarios**:

1. **Given** a project with 5 MCP servers in `.mcp.json`, **When** user selects "Migrate to Global" and chooses 3 servers from the list, **Then** only the 3 selected servers are moved to `~/.claude.json` while 2 remain in `.mcp.json`
2. **Given** selective migration in progress, **When** user deselects all servers, **Then** system displays "No servers selected for migration" and cancels operation
3. **Given** user is reviewing servers for selective migration, **When** they view each server, **Then** system displays server name, command, and current configuration to aid decision-making

---

### User Story 3 - Migration Validation and Rollback (Priority: P3)

A developer wants confidence that migration won't break their Claude Code setup. They want to preview changes before committing and have the ability to undo if something goes wrong.

**Why this priority**: Provides safety net for users concerned about configuration corruption. While important for user confidence, the atomic write patterns already in use (write-to-temp + atomic-move) provide inherent safety. This adds explicit validation and rollback UI.

**Independent Test**: Can be tested by running migration with preview mode, verifying accuracy of preview, and testing rollback functionality. Delivers value by giving users confidence but isn't required for basic feature operation.

**Acceptance Scenarios**:

1. **Given** user initiates migration, **When** they choose "Preview Changes" option, **Then** system displays before/after state of both `.mcp.json` and `~/.claude.json` without making changes
2. **Given** migration completed successfully, **When** user selects "Undo Last Migration" within same session, **Then** system restores previous state of both configuration files from backup
3. **Given** migration validation detects `.mcp.json` syntax errors, **When** user attempts migration, **Then** system displays error with specific issue location and prevents migration until resolved

---

### Edge Cases

- What happens when user's `~/.claude.json` doesn't exist (fresh installation)? System should create it with proper structure including mcpServers section.
- What happens when `.mcp.json` is malformed or has syntax errors? System should detect before migration and display specific error message pointing to issue location.
- What happens when a server name in `.mcp.json` matches an existing server in `~/.claude.json` but with different configuration? System should detect conflict and offer options: skip, overwrite global with project config, or rename project server before migrating.
- What happens when user lacks write permissions to `~/.claude.json`? System should detect permission issue and display clear error message with remediation steps.
- What happens when migration is interrupted mid-operation (process killed, system crash)? Atomic write pattern ensures no corruption - either migration completes fully or original state is preserved.
- What happens when a project has both servers from `.mcp.json` and inherited servers from `~/.claude.json`? System should only offer to migrate servers originating from `.mcp.json` (hierarchyLevel === 1), not inherited ones.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide "Migrate to Global" option in TUI main menu when project contains servers in `.mcp.json` (hierarchyLevel === 1)
- **FR-002**: System MUST display list of all project-local MCP servers available for migration with server name, command, and current configuration
- **FR-003**: System MUST allow user to select which servers to migrate (all or selective subset)
- **FR-004**: System MUST detect name conflicts between servers being migrated and existing servers in `~/.claude.json`
- **FR-005**: System MUST prompt user to resolve conflicts with options: skip conflicting server, overwrite global with project configuration, or rename project server before migration
- **FR-006**: System MUST validate both source (`.mcp.json`) and destination (`~/.claude.json`) files for syntax errors before migration
- **FR-007**: System MUST use atomic write pattern for all configuration file updates (write-to-temp + atomic-move + backup)
- **FR-008**: System MUST create `~/.claude.json` with proper structure if it doesn't exist
- **FR-009**: System MUST create mcpServers section in `~/.claude.json` if it doesn't exist
- **FR-010**: System MUST preserve all other configuration in both `.mcp.json` and `~/.claude.json` during migration (only modify mcpServers sections)
- **FR-011**: System MUST remove migrated servers from `.mcp.json` after successful addition to `~/.claude.json`
- **FR-012**: System MUST preserve server metadata including `_mcpToggleBlocked` markers during migration
- **FR-013**: System MUST reload project context after migration to reflect updated hierarchyLevel values (servers now at level 2 instead of 1)
- **FR-014**: System MUST display confirmation message showing number of servers successfully migrated
- **FR-015**: System MUST handle permission errors gracefully with clear error messages
- **FR-016**: System MUST validate file operations succeeded before removing servers from source file
- **FR-017**: Users MUST be able to cancel migration operation at any point before changes are committed
- **FR-018**: System MUST display "No project-local servers to migrate" message when `.mcp.json` has no servers or only has inherited servers

### Key Entities

- **MCP Server Configuration**: Represents an MCP server definition with name (unique identifier), command (executable path), optional args (command arguments), optional env (environment variables), and v2.0.0 blocking metadata (_mcpToggleBlocked, _mcpToggleBlockedAt, _mcpToggleOriginal)
- **Project Context**: Represents current project state including projectDir (absolute path), mcpServers (all loaded servers with hierarchyLevel), and configuration file paths
- **Migration Operation**: Represents a migration transaction including selected servers for migration, conflict resolutions, source file (`.mcp.json`), destination file (`~/.claude.json`), and backup file paths

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can migrate all project-local MCP servers to global configuration in under 30 seconds
- **SC-002**: After migration, users can block/unblock previously project-local servers without data loss (servers remain in configuration)
- **SC-003**: Migration operation completes successfully without configuration corruption in 100% of cases (atomic operations ensure consistency)
- **SC-004**: Users can complete selective migration of specific servers in under 45 seconds
- **SC-005**: System detects and prevents all name conflicts before committing changes (zero migrations result in duplicate server names)
- **SC-006**: Users attempting migration with permission errors receive clear error message identifying the specific permission issue within 2 seconds
- **SC-007**: Migrated servers are immediately available in Claude Code without restart (users can verify by running `/mcp` command)
- **SC-008**: 90% of users successfully migrate servers on first attempt without consulting documentation (intuitive UX)

## Assumptions

- Users understand the distinction between project-local (`.mcp.json`) and global (`~/.claude.json`) configuration scopes
- Users have write permissions to their home directory (`~/.claude.json`)
- Projects using version control will exclude `.mcp.json` after migration or add migrated server names to project documentation
- Migration is a one-time operation per project (users won't need to frequently migrate/demigrate servers)
- Users prefer unified blocking mechanism over maintaining separate project-local server definitions
- Standard file system operations (read, write, move, backup) are sufficient for configuration management
- JSON parsing and validation are handled by existing dependencies (fs-extra)

## Out of Scope

- Automatic migration detection/suggestion on first run
- Bulk migration across multiple projects simultaneously
- Migration from global back to project-local (demigration)
- Sync mechanism to keep project and global servers in sync
- Migration history or audit log
- Dry-run mode with detailed change preview (covered by preview in P3 user story, but full diff view is out of scope)
- Integration with git operations (commit messages, automatic .gitignore updates)
- Migration of memory files (only MCP servers are in scope)
- Cross-user or cross-machine migration support

# Feature Specification: MCP Toggle

**Feature Branch**: `001-mcp-toggle-a`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "MCP Toggle - A tool to enumerate and selectively disable MCP servers and memory files for Claude Code sessions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Available MCP Servers and Memory (Priority: P1)

A developer working in a project directory wants to see what MCP servers and Claude Code memory files will be loaded when they launch Claude Code, including both local (project-specific) and inherited (from parent directories) resources.

**Why this priority**: This is the core value proposition - visibility into the Claude Code environment. Without this, users cannot make informed decisions about what to disable. This story alone delivers value as a diagnostic/inspection tool.

**Independent Test**: Can be fully tested by running the executable in any project directory and verifying it displays all MCP servers and memory files that Claude Code would load, clearly distinguishing between direct and inherited resources.

**Acceptance Scenarios**:

1. **Given** a project with local .claude.json configuration, **When** user runs mcp-toggle, **Then** all locally configured MCP servers are displayed
2. **Given** a project nested under parent directories with .claude.json files, **When** user runs mcp-toggle, **Then** both direct and inherited MCP servers are displayed with source path annotations
3. **Given** a project with memory files in .claude/memories/, **When** user runs mcp-toggle, **Then** all memory files are enumerated and displayed
4. **Given** a project with no local configuration, **When** user runs mcp-toggle, **Then** only inherited configurations from parent directories are displayed
5. **Given** a project with existing blocked.md file, **When** user runs mcp-toggle, **Then** currently blocked items are clearly marked in the display

---

### User Story 2 - Toggle MCP Servers and Memory On/Off (Priority: P2)

A developer wants to selectively disable specific MCP servers or memory files that are not needed for their current work session to reduce context usage or avoid conflicts.

**Why this priority**: This provides the core manipulation capability. It depends on Story 1 for enumeration but adds the critical ability to actually control what gets loaded. Together with Story 1, this forms a complete MVP.

**Independent Test**: Can be tested by selecting items to toggle off, verifying they are written to blocked.md, and confirming that subsequent enumeration shows them as blocked.

**Acceptance Scenarios**:

1. **Given** the enumeration view is displayed, **When** user selects an MCP server to toggle off, **Then** the selection is marked visually as "to be blocked"
2. **Given** user has marked items to block, **When** user confirms the changes, **Then** blocked.md is created/updated with the blocked items
3. **Given** items are blocked in blocked.md, **When** user toggles them back on, **Then** they are removed from blocked.md
4. **Given** user toggles items and saves, **When** mcp-toggle is run again, **Then** the display accurately reflects current blocked state
5. **Given** user cancels without saving, **When** exiting the interface, **Then** no changes are written to blocked.md

---

### User Story 3 - Automatic Claude.md Integration (Priority: P3)

When MCP servers or memory files are blocked, the tool automatically updates or creates the project's claude.md file with instructions for Claude Code to process blocked.md at runtime.

**Why this priority**: This automates the integration with Claude Code, removing manual configuration steps. However, the tool is still valuable without this - users could manually add the instruction to claude.md.

**Independent Test**: Can be tested by blocking items, verifying claude.md is created/updated with correct instructions, and confirming that subsequent Claude Code sessions respect the blocks.

**Acceptance Scenarios**:

1. **Given** a project without claude.md, **When** user blocks items, **Then** claude.md is created with blocked.md processing instructions
2. **Given** a project with existing claude.md, **When** user blocks items, **Then** blocked.md processing instructions are appended without overwriting existing content
3. **Given** claude.md already contains blocked.md instructions, **When** user blocks items, **Then** duplicate instructions are not added
4. **Given** all blocked items are unblocked, **When** blocked.md is empty or deleted, **Then** claude.md instructions remain (as they don't hurt if blocked.md is absent)

---

### Edge Cases

- What happens when the executable is run from a directory without write permissions? Display enumeration works but blocking operations show appropriate error message
- How does the system handle invalid or corrupted .claude.json files? Display error with file path and continue with valid configurations
- What happens when blocked.md exists but is not readable? Display warning and treat as if no items are blocked
- How does the tool handle MCP servers defined in .claude.json vs system-wide configuration? Enumerate both, clearly indicating source
- What happens when an MCP server appears in multiple .claude.json files in the directory hierarchy? Display all occurrences with source paths, blocking applies to all
- How does the system handle memory files that are symlinks or in nested directories? Follow symlinks and enumerate recursively
- What happens when user tries to block an inherited (parent directory) MCP? Block is applied at project level, affecting only current and child directories
- How does the tool behave when .claude/ directory doesn't exist? Create it when saving blocked.md if needed

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enumerate all MCP servers that would be loaded by Claude Code from the current directory
- **FR-002**: System MUST enumerate all Claude Code memory files that would be loaded from the current directory
- **FR-003**: System MUST distinguish between directly configured (local) and inherited (parent directory) MCP servers and memory
- **FR-004**: System MUST display source path annotations for each enumerated item (which .claude.json or memory directory)
- **FR-005**: System MUST read and parse existing blocked.md file to determine currently blocked state
- **FR-006**: System MUST provide a visual interface (GUI or TUI) for displaying enumerated items
- **FR-007**: System MUST allow users to toggle any enumerated MCP server or memory file on/off via the interface
- **FR-008**: System MUST visually indicate current state (enabled/blocked) for each item
- **FR-009**: System MUST write blocked items to blocked.md in the project's .claude/ directory
- **FR-010**: System MUST maintain blocked.md in a format that can be easily parsed by Claude Code at runtime
- **FR-011**: System MUST create or update claude.md with instructions for Claude Code to process blocked.md
- **FR-012**: System MUST preserve existing content in claude.md when adding blocked.md processing instructions
- **FR-013**: System MUST prevent duplicate blocked.md processing instructions in claude.md
- **FR-014**: System MUST handle missing .claude/ directory by creating it when needed for blocked.md
- **FR-015**: System MUST be executable from any project directory without prior setup
- **FR-016**: System MUST provide clear error messages when configuration files are invalid or inaccessible
- **FR-017**: System MUST allow users to cancel operations without making changes

### Key Entities

- **MCP Server**: Represents a Model Context Protocol server configuration that can be loaded by Claude Code, including server name, configuration source path (which .claude.json), and current enabled/blocked state
- **Memory File**: Represents a Claude Code memory file (.md files in .claude/memories/), including file name, file path, content preview, and current enabled/blocked state
- **Configuration Source**: Represents a source of MCP/memory configuration (local .claude.json, parent directory .claude.json, memory directory), including source path, type (direct/inherited), and hierarchy level
- **Blocked Item**: Represents an MCP server or memory file that has been toggled off, including item identifier, item type (MCP/memory), and block timestamp
- **Project Context**: Represents the current project directory state, including project path, available MCP servers, available memory files, blocked items, and configuration hierarchy

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view all MCP servers and memory files for their project within 2 seconds of launching the tool
- **SC-002**: Users can toggle any MCP server or memory file on/off with no more than 3 interactions (navigate, select, confirm)
- **SC-003**: Changes to blocked state persist correctly 100% of the time across tool restarts
- **SC-004**: The tool accurately reflects Claude Code's loading behavior (enumeration matches what Claude Code would actually load)
- **SC-005**: Users successfully complete their first block/unblock operation without consulting documentation 90% of the time (intuitive interface)
- **SC-006**: The tool handles projects with 20+ MCP servers and 50+ memory files without performance degradation
- **SC-007**: Integration with claude.md works correctly in 100% of test cases (no duplicate instructions, preserves existing content)

## Assumptions

1. **Claude Code Configuration Format**: Assumes .claude.json follows standard JSON format for MCP server configuration as used by Claude Code
2. **Memory File Location**: Assumes Claude Code memory files are located in .claude/memories/ directory and are markdown (.md) files
3. **Directory Hierarchy Loading**: Assumes Claude Code loads configurations from parent directories up to root or user home directory
4. **Blocked Format**: Assumes blocked.md will use a simple line-based format (one item per line) that can be easily parsed
5. **File System Access**: Assumes the tool has read access to parent directories and write access to the current project directory
6. **Interface Choice**: Will provide TUI (Terminal User Interface) as primary interface for MVP, with potential GUI in future versions
7. **Language/Platform**: Node.js/TypeScript for JavaScript ecosystem, npm distribution, and alignment with MCP ecosystem (MCP servers often in Node)
8. **Installation Method**: Package manager distribution (npm) for easy updates, dependency management, and ecosystem integration
9. **Claude.md Instruction Format**: The exact instruction text to add to claude.md will be determined during implementation to match Claude Code's expected format

## Dependencies

- Access to file system for reading .claude.json files and .claude/ directories
- Ability to parse JSON configuration files
- TUI library for terminal-based user interface (specific library depends on language choice)
- Git integration for branch/change awareness (optional enhancement, not required for MVP)

## Out of Scope

- Editing MCP server configurations directly (only enable/disable)
- Creating or managing memory files (only enable/disable existing ones)
- Backing up or versioning blocked.md changes
- Multi-user or concurrent editing scenarios
- Cloud sync or sharing of blocked configurations
- Performance profiling of MCP servers
- Automatic recommendations for what to block
- Integration with Claude Code's UI or plugin system

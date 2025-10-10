# Memory Systems: Claude Code vs Serena

## Overview

This document clarifies the distinction between Claude Code memory files and Serena memory files, which use different directory structures and serve different purposes.

## Claude Code Memory System

### Location
- **Project memories**: `<project>/.claude/memories/*.md`
- **User memories**: `~/.claude/memories/*.md`

### Purpose
- Context for Claude Code sessions
- Project-specific knowledge and documentation
- User-level preferences and patterns

### Management
- Managed through this `mcp-toggle` tool's TUI
- Can be blocked/unblocked using the v2.0.0 blocking mechanism (`.md.blocked` extension)
- Two-scope hierarchy (project and user)

### File Format
- Standard Markdown files (`.md`)
- Can contain any project documentation
- Estimated token counts displayed in TUI

## Serena Memory System

### Location
- **Project memories only**: `<project>/.serena/memories/*.md`

### Purpose
- Architectural knowledge for the Serena coding agent
- Language server integration details
- Tool usage patterns and best practices
- Project structure and conventions

### Management
- Managed through Serena MCP server tools:
  - `write_memory` - Create/update memories
  - `read_memory` - Retrieve specific memories
  - `list_memories` - List available memories
  - `delete_memory` - Remove memories
- **NOT** managed by mcp-toggle
- **NOT** displayed in mcp-toggle's TUI

### File Format
- Markdown files with structured content
- Often include architectural diagrams, code examples, and technical details
- Automatically created during Serena's onboarding process

## Key Differences

| Aspect | Claude Code (.claude) | Serena (.serena) |
|--------|----------------------|------------------|
| **Directory** | `.claude/memories/` | `.serena/memories/` |
| **Scope** | Project + User | Project only |
| **Management** | mcp-toggle TUI | Serena MCP tools |
| **Purpose** | General context | Technical architecture |
| **Created by** | User or Claude Code | Serena agent |
| **Blocking** | Supported (.md.blocked) | N/A |

## Why Two Systems?

1. **Separation of Concerns**
   - Claude Code memories: General project context
   - Serena memories: Technical code architecture

2. **Different Lifecycles**
   - Claude Code memories: Manually managed
   - Serena memories: Auto-generated during onboarding

3. **Different Access Patterns**
   - Claude Code: All contexts need access
   - Serena: Only Serena MCP server needs access

## Usage Recommendations

### Use Claude Code Memories For:
- Project goals and requirements
- Development standards and conventions
- Team workflows and processes
- User preferences and patterns

### Use Serena Memories For:
- Codebase architecture
- Language server configuration
- Symbol navigation patterns
- Testing and build commands

## Example Directory Structure

```
my-project/
├── .claude/
│   └── memories/
│       ├── project-goals.md          # Claude Code memory
│       └── coding-standards.md       # Claude Code memory
└── .serena/
    └── memories/
        ├── architecture.md            # Serena memory
        ├── suggested_commands.md      # Serena memory
        └── testing_strategy.md        # Serena memory
```

## mcp-toggle Behavior

The `mcp-toggle` tool:
- ✅ **DOES** load and display `.claude/memories/*.md` files
- ✅ **DOES** allow blocking/unblocking Claude Code memories
- ✅ **DOES** calculate token estimates for Claude Code memories
- ❌ **DOES NOT** load or display `.serena/memories/*.md` files
- ❌ **DOES NOT** manage Serena memories in any way

## Additional Resources

- [Serena README](https://github.com/oraios/serena) - Official Serena documentation
- [Claude Code Docs](https://docs.claude.com/claude-code) - Official Claude Code documentation
- [MCP Specification](https://modelcontextprotocol.io/) - Model Context Protocol details

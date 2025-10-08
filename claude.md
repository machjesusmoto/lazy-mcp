<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
# MCP Server and Memory Control

This project uses `blocked.md` to control which MCP servers and memory files are loaded.

When Claude Code starts in this directory:
1. Read `.claude/blocked.md` if it exists
2. For each line prefixed with `mcp:`, skip loading that MCP server
3. For each line prefixed with `memory:`, skip loading that memory file

To manage blocked items, run: `npx mcp-toggle`

**Current blocked items**: Check `.claude/blocked.md` for the list.
<!-- End MCP Toggle Integration -->

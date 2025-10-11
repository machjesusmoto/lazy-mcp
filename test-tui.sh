#!/bin/bash
# Quick test script for v0.4.2 fixed layout TUI
# Run this directly in your terminal (not through Claude)

echo "Testing mcp-toggle v0.4.2..."
echo ""
echo "Expected behavior:"
echo "  - Left pane (66%): Unified scrollable list of servers, memory, agents"
echo "  - Right pane (33%): Fixed header + scrollable details"
echo "  - Tab: Switch between list and details panes"
echo "  - Arrow keys: Navigate list OR scroll details (based on focus)"
echo "  - Space: Toggle blocked state"
echo "  - Enter: Save changes"
echo "  - Q: Quit"
echo ""
echo "Bug fix verification:"
echo "  - All items should be visible (no missing MCP servers or subagents)"
echo "  - Scroll through entire list to verify: Playwright MCP, devops-architect,"
echo "    refactoring-expert, test-writer-fixer subagents all appear"
echo "  - Selection highlight should be readable (black text on cyan background)"
echo ""
echo "Press Enter to launch mcp-toggle..."
read

mcp-toggle

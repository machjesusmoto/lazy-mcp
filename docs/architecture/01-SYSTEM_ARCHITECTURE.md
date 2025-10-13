# System Architecture
*mcp-toggle Claude Code Plugin*
*Version: 2.0.0*
*Last Updated: 2025-10-12*

## Executive Summary

This document defines the high-level architecture for converting mcp-toggle from a CLI tool to a Claude Code plugin with lazy loading capabilities. The architecture addresses the fundamental constraint that **runtime MCP server loading is not available**, while achieving 78-95% token reduction through a hybrid approach combining:

1. **PreToolUse Hooks** - Block disabled server tools before execution
2. **Registry MCP Server Pattern** - Lightweight keyword-based server discovery (~5k tokens)
3. **Profile System** - Pre-configured workflow-based server combinations
4. **Plugin Commands** - User-friendly slash command interface

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Environment                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  mcp-toggle Plugin                        │   │
│  │                                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │   Commands   │  │    Hooks     │  │   Registry    │  │   │
│  │  │   /toggle    │  │ PreToolUse   │  │  MCP Server   │  │   │
│  │  │   /profile   │  │ sessionStart │  │  (5k tokens)  │  │   │
│  │  │   /migrate   │  │ sessionEnd   │  │               │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │   │
│  │         │                  │                   │          │   │
│  │         └──────────┬───────┴──────┬────────────┘          │   │
│  │                    ▼              ▼                       │   │
│  │         ┌──────────────────────────────────┐             │   │
│  │         │     Core Plugin Engine           │             │   │
│  │         │  - Configuration Manager         │             │   │
│  │         │  - Profile Manager              │             │   │
│  │         │  - Block State Tracker          │             │   │
│  │         │  - Migration Engine             │             │   │
│  │         └──────────────┬───────────────────┘             │   │
│  │                        ▼                                 │   │
│  │         ┌──────────────────────────────────┐             │   │
│  │         │    Configuration Storage         │             │   │
│  │         │  - .mcp.json (project)           │             │   │
│  │         │  - ~/.claude.json (user)         │             │   │
│  │         │  - .claude/profiles/ (team)      │             │   │
│  │         └──────────────────────────────────┘             │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

User Interaction Flow:
  1. User runs /toggle or /profile command
  2. Command handler updates configuration files
  3. User restarts Claude Code session
  4. PreToolUse hook enforces blocking rules
  5. Registry provides keyword-based server suggestions

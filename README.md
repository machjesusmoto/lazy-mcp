# Lazy MCP

[![npm version](https://img.shields.io/npm/v/lazy-mcp.svg)](https://www.npmjs.com/package/lazy-mcp)
[![CI](https://github.com/machjesusmoto/lazy-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/machjesusmoto/lazy-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Intelligent lazy-loading for Claude Code MCP tools. Let the agent decide what tools to load based on usage patterns and context needs.

## Overview

Lazy MCP is a Claude Code plugin that enables **agent-driven tool loading** with intelligent context optimization. Instead of loading all available MCP servers upfront (consuming precious context window space), Lazy MCP uses a registry-based approach to inform Claude about available tools and loads them on-demand based on your actual needs.

**What It Does**:
- **Agent-Driven Loading**: Claude intelligently requests tools based on conversation analysis
- **Registry-Informed**: Maintains a registry of tool capabilities, keywords, and usage patterns
- **Lazy Loading**: Tools are loaded only when needed, then purged when usage ceases
- **Context Optimization**: Automatically manages context window to prevent limitations
- **Profile Support**: Save and switch between different tool configurations

## The Problem

Traditional MCP integration loads all configured servers at session start, quickly consuming your context window with tools you may never use in a particular conversation. This leads to:
- Frequent context limit errors
- Wasted tokens on unused tool definitions
- Poor agent performance due to context clutter

## The Solution

Lazy MCP uses a **registry + lazy loading** approach:

1. **Registry**: Maintains metadata about all available tools (capabilities, keywords, usage patterns)
2. **Agent Analysis**: Claude analyzes your request and identifies potentially useful tools
3. **On-Demand Loading**: Only requested tools are loaded into context
4. **Intelligent Purging**: Tools are removed when usage patterns indicate they're no longer needed
5. **Persistent Learning**: Usage patterns improve tool selection over time

## Installation

### As Claude Code Plugin

```bash
# Install the plugin package
npm install -g lazy-mcp

# The plugin will be automatically detected by Claude Code
# Commands will be available as /lazy:* in your sessions
```

### As Standalone CLI

```bash
# Global installation
npm install -g @lazy-mcp/cli

# Or use with npx (no installation)
npx @lazy-mcp/cli
```

## Usage

### Plugin Commands

Once installed, use these commands in any Claude Code session:

```bash
/lazy:status          # Show current loaded tools and context usage
/lazy:help            # Show all available commands
/lazy:version         # Show version information
```

### Workflow

1. **Start Session**: Lazy MCP analyzes available tools and creates a registry
2. **Work Naturally**: Ask Claude to help with your tasks
3. **Automatic Loading**: Claude identifies needed tools from registry and loads them
4. **Context Monitoring**: Tools are automatically purged when no longer needed
5. **Save Profiles**: Capture successful configurations for reuse

## Features

### Core Capabilities

- 🧠 **Agent-Driven**: Claude decides what tools to load based on conversation analysis
- 📚 **Registry System**: Maintains comprehensive tool metadata and usage patterns
- ⚡ **Lazy Loading**: Load tools on-demand, purge when finished
- 🎯 **Context Optimization**: Intelligent management of context window space
- 💾 **Profile Support**: Save and switch between tool configurations
- 🔗 **Seamless Integration**: Works within Claude Code plugin system

### Runtime Blocking

When tools are disabled/blocked:
- PreToolUse hook prevents execution
- Clear user feedback with enable instructions
- No token waste on blocked tool calls

## Architecture

### Plugin System Integration

```
Claude Code Session
    ↓
SessionStart Hook → Load registry, analyze available tools
    ↓
User Request → Claude analyzes needs
    ↓
Agent Decision → Request specific tools
    ↓
Lazy Loading → Load only requested tools
    ↓
Tool Usage → Monitor usage patterns
    ↓
Intelligent Purge → Remove unused tools
```

### Registry Structure

```typescript
{
  "tool-name": {
    "capabilities": ["search", "documentation"],
    "keywords": ["docs", "api", "reference"],
    "usagePattern": "documentation-lookup",
    "avgTokens": 2500,
    "contextPriority": "medium"
  }
}
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/machjesusmoto/lazy-mcp.git
cd lazy-mcp

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Project Structure

```
lazy-mcp/
├── plugin/          # Claude Code plugin
├── cli/            # Standalone CLI tool
├── shared/         # Shared core library
└── docs/           # Documentation
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for [Claude Code](https://claude.ai/code) by Anthropic
- Inspired by the need for smarter context management
- Thanks to the Claude Code plugin system for making this possible

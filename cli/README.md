# @mcp-toggle/cli

CLI tool to manage Claude Code MCP servers and memory files.

## Status

**Version**: 0.5.2
**Phase**: Moved to monorepo structure (Task 1.1)

## Migration Note

This is the existing CLI tool moved into the monorepo structure. It now depends on `@mcp-toggle/shared` for common functionality.

## Structure

```
cli/
├── src/                   # CLI source code (existing)
├── tests/                 # CLI tests (existing)
└── bin/                   # CLI executable (existing)
```

## Usage

```bash
# Install globally
npm install -g @mcp-toggle/cli

# Or run locally
npx @mcp-toggle/cli

# Interactive TUI
mcp-toggle

# List servers
mcp-toggle list

# Block a server
mcp-toggle block <server-name>
```

## Development

```bash
# Build CLI
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Next Steps

1. Refactor to use shared core library
2. Update imports to reference @mcp-toggle/shared
3. Remove duplicated code
4. Update tests

# mcp-toggle Plugin

Claude Code plugin for context management with lazy loading capabilities.

## Status

**Version**: 2.0.0 (in development)
**Phase**: Task 1.1 - Monorepo Structure Creation

## Structure

```
plugin/
├── src/
│   ├── index.ts           # Plugin entry point
│   ├── hooks/             # PreToolUse, sessionStart, sessionEnd hooks
│   ├── commands/          # Plugin command handlers
│   ├── core/              # Core plugin logic
│   ├── models/            # Plugin-specific types
│   └── utils/             # Plugin utilities
└── tests/
    ├── unit/              # Unit tests
    └── integration/       # Integration tests
```

## Dependencies

- `@mcp-toggle/shared`: Shared core library with business logic

## Development

```bash
# Build plugin
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Next Steps

1. Implement hook handlers (PreToolUse, sessionStart, sessionEnd)
2. Create command definitions
3. Implement core plugin logic
4. Add comprehensive tests

# @mcp-toggle/shared

Shared core library for mcp-toggle plugin and CLI tool.

## Status

**Version**: 2.0.0 (in development)
**Phase**: Task 1.1 - Monorepo Structure Creation

## Purpose

Provides common business logic, types, and utilities shared between:
- Claude Code plugin (`plugin/`)
- CLI tool (`cli/`)

## Structure

```
shared/
├── src/
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utility functions
│   └── models/            # Shared data models
└── tests/                 # Shared code tests
```

## Development

```bash
# Build shared library
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Next Steps

1. Extract common types from CLI
2. Extract common utilities from CLI
3. Extract core business logic from CLI
4. Add comprehensive tests

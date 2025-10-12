# Developer Guide

**Version**: v0.4.0
**Last Updated**: 2025-10-09

This guide helps developers understand mcp-toggle's architecture, contribute features, and maintain code quality.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Architecture Overview](#architecture-overview)
3. [Development Setup](#development-setup)
4. [Testing Strategy](#testing-strategy)
5. [Working with Settings](#working-with-settings)
6. [TUI Development](#tui-development)
7. [Adding New Features](#adding-new-features)
8. [Contribution Guidelines](#contribution-guidelines)

---

## Project Structure

```
mcp-toggle/
├── src/
│   ├── core/                    # Core business logic
│   │   ├── settings-manager.ts  # Settings.json management
│   │   ├── agent-manager.ts     # Agent discovery & management
│   │   ├── memory-loader.ts     # Memory file discovery
│   │   ├── blocked-manager.ts   # MCP server blocking (legacy)
│   │   └── project-context-builder.ts  # Unified context
│   ├── models/                  # Type definitions
│   │   ├── types.ts             # Core types
│   │   ├── settings-types.ts    # Settings.json types
│   │   └── agent-types.ts       # Agent types
│   ├── tui/                     # Terminal UI components
│   │   ├── app.tsx              # Main TUI application
│   │   ├── components/
│   │   │   ├── server-list.tsx  # MCP server list
│   │   │   ├── memory-list.tsx  # Memory file list
│   │   │   └── agent-list.tsx   # Agent list
│   ├── utils/                   # Utility functions
│   │   ├── file-utils.ts        # Atomic write, safe read
│   │   ├── file-lock.ts         # File locking
│   │   └── frontmatter-parser.ts # YAML frontmatter parsing
│   └── cli.ts                   # CLI entry point
├── tests/
│   ├── unit/                    # Unit tests
│   │   ├── settings-manager.test.ts
│   │   ├── agent-manager.test.ts
│   │   └── memory-loader.test.ts
│   ├── integration/             # Integration tests
│   │   └── context-management.test.ts
│   └── helpers/                 # Test utilities
│       └── test-utils.ts
├── docs/                        # Documentation
│   ├── api.md                   # API reference
│   ├── migration-v0.4.0.md      # Migration guide
│   └── developer-guide.md       # This file
├── specs/                       # Feature specifications
│   └── 004-comprehensive-context-management/
├── package.json
├── tsconfig.json
└── jest.config.js
```

### Directory Responsibilities

**`src/core/`**: Pure business logic, no UI dependencies
- Functions should be testable without TUI
- Each file has single responsibility
- Export public API from index

**`src/models/`**: TypeScript type definitions only
- No implementation code
- Export interfaces and types
- Document with JSDoc comments

**`src/tui/`**: React components using Ink
- Components should be presentational
- Business logic stays in `core/`
- Props for all state and callbacks

**`src/utils/`**: Reusable utilities
- Generic functions used across modules
- Well-tested, documented
- No business logic

**`tests/`**: Comprehensive test coverage
- Unit tests for individual functions
- Integration tests for workflows
- Helpers for common test patterns

---

## Architecture Overview

### Core Principles

1. **Separation of Concerns**: Business logic (core) separate from UI (tui)
2. **Atomic Operations**: All file writes use atomic pattern with rollback
3. **Type Safety**: Comprehensive TypeScript types for all interfaces
4. **Testability**: Functions designed for easy unit testing

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                     CLI Entry Point                      │
│                      (cli.ts)                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Project Context Builder                    │
│          (buildProjectContext)                           │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   MCP       │  │   Memory     │  │    Agents     │  │
│  │  Servers    │  │   Files      │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    TUI Application                       │
│                     (app.tsx)                            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Servers  │  │ Memories │  │  Agents  │              │
│  │   List   │  │   List   │  │   List   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Settings Manager                           │
│          (addDenyPattern/removeDenyPattern)              │
│                                                          │
│           Atomic Write to settings.json                  │
└─────────────────────────────────────────────────────────┘
```

### Key Patterns

**Atomic Write Pattern**:
```typescript
async function atomicWrite(filePath: string, content: string) {
  // 1. Create backup
  const backup = await createBackup(filePath);

  try {
    // 2. Write to temp file
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content);

    // 3. Atomic rename
    await fs.rename(tempPath, filePath);

    // 4. Delete backup on success
    await fs.remove(backup);
  } catch (error) {
    // 5. Restore from backup on failure
    await fs.copyFile(backup, filePath);
    throw error;
  }
}
```

**File Locking Pattern**:
```typescript
async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>
): Promise<T> {
  const lockPath = `${filePath}.lock`;

  // Acquire lock
  await waitForLock(lockPath);

  try {
    // Perform operation
    return await operation();
  } finally {
    // Release lock
    await fs.remove(lockPath);
  }
}
```

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/machjesusmoto/mcp-toggle.git
cd mcp-toggle

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

### Development Workflow

```bash
# Watch mode for development
npm run build -- --watch

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Format code
npm run format

# Run specific test file
npm test -- settings-manager.test.ts
```

### Environment Setup

Create `.env` for local testing (optional):
```bash
# .env
DEBUG=mcp-toggle:*
TEST_PROJECT_DIR=/path/to/test/project
```

---

## Testing Strategy

### Test Organization

```
tests/
├── unit/              # Fast, isolated tests
├── integration/       # Multi-module tests
└── helpers/          # Shared test utilities
```

### Unit Testing

**Example: Testing settings-manager.ts**

```typescript
import { loadSettings, addDenyPattern } from '../../src/core/settings-manager';
import { createTestProject, cleanupTestProject } from '../helpers/test-utils';

describe('settings-manager', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestProject();
  });

  afterEach(async () => {
    await cleanupTestProject(testDir);
  });

  it('creates settings.json if missing', async () => {
    const settings = await loadSettings(testDir);

    expect(settings.permissions).toBeDefined();
    expect(settings.permissions.deny).toEqual([]);
  });

  it('adds deny pattern without duplicates', async () => {
    await addDenyPattern(testDir, 'memory', 'test.md');
    await addDenyPattern(testDir, 'memory', 'test.md'); // Duplicate

    const settings = await loadSettings(testDir);
    const memoryPatterns = settings.permissions.deny.filter(
      d => d.type === 'memory' && d.pattern === 'test.md'
    );

    expect(memoryPatterns).toHaveLength(1);
  });
});
```

### Integration Testing

**Example: Testing context management workflow**

```typescript
import {
  buildProjectContext,
  addDenyPattern,
  removeDenyPattern
} from '../../src/core';

describe('context management integration', () => {
  it('blocks and unblocks memory file', async () => {
    const testDir = await createTestProject({
      memories: ['notes.md', 'archive/old.md']
    });

    // Block a file
    await addDenyPattern(testDir, 'memory', 'notes.md');

    // Build context
    let context = await buildProjectContext(testDir);
    let blockedMemory = context.memoryFiles.find(m => m.name === 'notes.md');
    expect(blockedMemory?.isBlocked).toBe(true);

    // Unblock
    await removeDenyPattern(testDir, 'memory', 'notes.md');

    // Verify unblocked
    context = await buildProjectContext(testDir);
    blockedMemory = context.memoryFiles.find(m => m.name === 'notes.md');
    expect(blockedMemory?.isBlocked).toBe(false);
  });
});
```

### Test Coverage Goals

- **Unit tests**: >90% coverage
- **Integration tests**: Critical workflows 100% covered
- **Edge cases**: All error paths tested

### Running Tests

```bash
# All tests
npm test

# With coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Specific file
npm test -- settings-manager

# Specific test
npm test -- --testNamePattern="adds deny pattern"
```

---

## Working with Settings

### Settings.json Structure

```json
{
  "permissions": {
    "deny": [
      { "type": "memory", "pattern": "sensitive.md" },
      { "type": "agent", "pattern": "experimental.md" }
    ]
  }
}
```

### Adding New Settings

**Step 1: Update types**

```typescript
// src/models/settings-types.ts
export interface SettingsJson {
  permissions: PermissionsConfig;
  newFeature?: {
    enabled: boolean;
    config: string;
  };
  [key: string]: unknown;
}
```

**Step 2: Add manager functions**

```typescript
// src/core/settings-manager.ts
export async function updateNewFeature(
  projectDir: string,
  config: { enabled: boolean; config: string }
): Promise<void> {
  const settingsPath = getSettingsPath(projectDir);

  await withFileLock(settingsPath, async () => {
    const settings = await loadSettingsInternal(projectDir);

    settings.newFeature = config;

    await atomicWrite(settingsPath, JSON.stringify(settings, null, 2));
  });
}
```

**Step 3: Add tests**

```typescript
it('updates new feature config', async () => {
  await updateNewFeature(testDir, { enabled: true, config: 'test' });

  const settings = await loadSettings(testDir);
  expect(settings.newFeature?.enabled).toBe(true);
});
```

### Best Practices

1. **Always use file locking** for concurrent access safety
2. **Always use atomic writes** to prevent corruption
3. **Validate input** before writing
4. **Preserve unknown fields** for forward compatibility
5. **Test concurrent access** scenarios

---

## TUI Development

### Ink Framework

mcp-toggle uses [Ink](https://github.com/vadimdemedes/ink) for terminal UI development with React.

### Component Structure

```typescript
import React from 'react';
import { Box, Text } from 'ink';

interface MyComponentProps {
  items: string[];
  selectedIndex: number;
  isFocused: boolean;
  onSelect: (index: number) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  items,
  selectedIndex,
  isFocused,
  onSelect
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isFocused ? 'cyan' : 'gray'}
    >
      <Text bold>My Component</Text>
      {items.map((item, idx) => (
        <Text
          key={idx}
          color={idx === selectedIndex && isFocused ? 'cyan' : undefined}
        >
          {item}
        </Text>
      ))}
    </Box>
  );
};
```

### Keyboard Input Handling

```typescript
import { useInput } from 'ink';

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    // Arrow keys
    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1));
    }

    // Tab to switch panels
    if (key.tab) {
      switchPanel();
    }

    // Space to toggle
    if (input === ' ') {
      toggleItem(selectedIndex);
    }

    // Enter to save
    if (key.return) {
      saveChanges();
    }

    // Quit
    if (input === 'q' || key.escape) {
      process.exit(0);
    }
  });

  return <MyComponent />;
}
```

### State Management

Use React hooks for state:

```typescript
import { useState, useEffect } from 'react';

function App() {
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContext() {
      const ctx = await buildProjectContext(projectDir);
      setContext(ctx);
      setLoading(false);
    }
    loadContext();
  }, [projectDir]);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return <MainView context={context!} />;
}
```

### Testing TUI Components

Use Ink's testing utilities:

```typescript
import { render } from 'ink-testing-library';
import { MyComponent } from '../src/tui/components/my-component';

it('renders items', () => {
  const { lastFrame } = render(
    <MyComponent
      items={['Item 1', 'Item 2']}
      selectedIndex={0}
      isFocused={true}
      onSelect={() => {}}
    />
  );

  expect(lastFrame()).toContain('Item 1');
  expect(lastFrame()).toContain('Item 2');
});
```

---

## Adding New Features

### Feature Development Workflow

1. **Spec**: Create feature spec in `specs/`
2. **Types**: Add type definitions in `src/models/`
3. **Core Logic**: Implement in `src/core/`
4. **Tests**: Write unit tests
5. **TUI**: Add UI components if needed
6. **Integration**: Write integration tests
7. **Docs**: Update API docs and README

### Example: Adding Custom Patterns Feature

**Step 1: Spec**

Create `specs/005-custom-patterns/spec.md`:
```markdown
# Custom Deny Patterns

Allow users to define custom regex patterns for blocking.

## User Story
As a developer, I want to block multiple files with a single pattern...
```

**Step 2: Types**

```typescript
// src/models/settings-types.ts
export interface DenyPattern {
  type: 'agent' | 'memory' | 'custom';
  pattern: string;
  isRegex?: boolean;
}
```

**Step 3: Core Logic**

```typescript
// src/core/settings-manager.ts
export async function addCustomPattern(
  projectDir: string,
  pattern: string,
  isRegex: boolean = false
): Promise<void> {
  await addDenyPattern(projectDir, 'custom', pattern);
  // Additional logic...
}
```

**Step 4: Tests**

```typescript
// tests/unit/settings-manager.test.ts
describe('custom patterns', () => {
  it('adds regex pattern', async () => {
    await addCustomPattern(testDir, 'temp-*.md', true);
    // Assertions...
  });
});
```

**Step 5: TUI**

```typescript
// src/tui/components/custom-patterns.tsx
export const CustomPatterns: React.FC<Props> = ({ patterns }) => {
  // Component implementation...
};
```

**Step 6: Integration Tests**

```typescript
// tests/integration/custom-patterns.test.ts
it('blocks files matching regex pattern', async () => {
  // Test workflow...
});
```

**Step 7: Documentation**

Update `docs/api.md` and `README.md` with new feature.

---

## Contribution Guidelines

### Code Style

- **Formatting**: Use Prettier (run `npm run format`)
- **Linting**: Fix ESLint errors (run `npm run lint`)
- **TypeScript**: Enable strict mode, no `any` types
- **Comments**: JSDoc for public APIs

### Commit Messages

Follow conventional commits format:

```
feat(agents): add custom pattern support
fix(settings): prevent concurrent write race condition
docs(api): document addCustomPattern function
test(integration): add workflow tests for custom patterns
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance

### Pull Request Process

1. **Fork** repository
2. **Create branch**: `git checkout -b feature/my-feature`
3. **Implement** feature with tests
4. **Run checks**: `npm test && npm run lint`
5. **Commit** with conventional messages
6. **Push**: `git push origin feature/my-feature`
7. **Open PR** with description

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] Types updated if needed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or clearly documented)

### Code Review

All PRs require:
- ✅ At least one approval
- ✅ All CI checks passing
- ✅ No merge conflicts
- ✅ Conventional commit messages

---

## Debugging

### Enable Debug Logs

```bash
DEBUG=mcp-toggle:* mcp-toggle
```

### Common Issues

**Settings.json corruption**:
```bash
# Check JSON validity
cat .claude/settings.json | jq .

# Restore from backup
cp .claude/settings.json.backup .claude/settings.json
```

**File locking issues**:
```bash
# Remove stale locks
rm .claude/settings.json.lock
```

**Test failures**:
```bash
# Clean test artifacts
rm -rf /tmp/mcp-toggle-test-*

# Run single test for debugging
npm test -- --testNamePattern="specific test" --verbose
```

---

## Performance Considerations

### File I/O Optimization

- Use `fast-glob` for file discovery (faster than Node's glob)
- Batch file reads when possible
- Cache frontmatter parsing results

### Memory Management

- Stream large files instead of loading into memory
- Limit content preview to 200 characters
- Clean up temporary files after operations

### Concurrency

- Use file locking for write operations
- Allow concurrent reads
- Queue writes to prevent race conditions

---

## Release Process

1. **Update version**: `npm version [major|minor|patch]`
2. **Update CHANGELOG.md**
3. **Build**: `npm run build`
4. **Test**: `npm test`
5. **Commit**: `git commit -am "chore: release v0.x.x"`
6. **Tag**: `git tag v0.x.x`
7. **Push**: `git push && git push --tags`
8. **Publish**: `npm publish`

---

## Resources

- **Ink Documentation**: https://github.com/vadimdemedes/ink
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code

---

## Getting Help

- **Issues**: https://github.com/machjesusmoto/mcp-toggle/issues
- **Discussions**: https://github.com/machjesusmoto/mcp-toggle/discussions
- **API Docs**: [docs/api.md](./api.md)
- **Migration Guide**: [docs/migration-v0.4.0.md](./migration-v0.4.0.md)

# Contributing to MCP Toggle

Thank you for your interest in contributing to MCP Toggle! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're here to build useful tools together.

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### Initial Setup

1. **Fork and clone the repository**:

```bash
git clone https://github.com/yourusername/mcp-toggle.git
cd mcp-toggle
```

2. **Install dependencies**:

```bash
npm install
```

3. **Run tests to verify setup**:

```bash
npm test
```

### Development Workflow

1. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following our code standards (see below)

3. **Add tests** for new functionality

4. **Run the test suite**:

```bash
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
npm run test:watch       # Watch mode for development
```

5. **Lint and format**:

```bash
npm run lint             # Check for linting errors
npm run format           # Auto-format code
```

6. **Build TypeScript**:

```bash
npm run build            # Compile to dist/
```

7. **Test locally**:

```bash
npm link                 # Link globally
mcp-toggle              # Test the CLI
```

8. **Commit your changes**:

```bash
git add .
git commit -m "feat: add your feature description"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/modifications
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

9. **Push and create Pull Request**:

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub with a clear description of your changes.

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Prefer `interface` over `type` for object shapes
- Use strict typing - avoid `any`
- Document public APIs with JSDoc comments

### Testing

- Write tests for all new functionality
- Aim for >80% code coverage
- Use descriptive test names: `should [expected behavior] when [condition]`
- Organize tests: unit tests in `tests/unit/`, integration tests in `tests/integration/`

### Code Style

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters
- Use meaningful variable names
- Keep functions small and focused

The project uses ESLint and Prettier for automatic formatting - run `npm run format` before committing.

## Project Structure

```
mcp-toggle/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── core/              # Core business logic
│   │   ├── config-loader.ts
│   │   ├── memory-loader.ts
│   │   ├── blocked-manager.ts
│   │   ├── claude-md-updater.ts
│   │   └── project-context-builder.ts
│   ├── models/            # Type definitions
│   │   └── project-context.ts
│   └── tui/               # Terminal UI components
│       ├── app.tsx
│       └── components/
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── helpers/          # Test utilities
├── bin/                  # CLI executable
├── specs/                # Design specifications
└── dist/                 # Compiled output (gitignored)
```

## Testing Guidelines

### Unit Tests

Test individual functions and modules in isolation:

```typescript
describe('myFunction', () => {
  it('should return expected result when given valid input', () => {
    const result = myFunction(validInput);
    expect(result).toBe(expectedOutput);
  });

  it('should throw error when given invalid input', () => {
    expect(() => myFunction(invalidInput)).toThrow();
  });
});
```

### Integration Tests

Test complete workflows end-to-end:

```typescript
it('should complete full blocking workflow', async () => {
  // Setup
  await createMockProject(tempDir);

  // Act
  await saveBlockedItems(tempDir, blockedItems);

  // Assert
  const context = await buildProjectContext(tempDir);
  expect(context.mcpServers[0].isBlocked).toBe(true);
});
```

### Test Helpers

Use test utilities from `tests/helpers/test-utils.ts`:
- `createTempDir()` - Create temporary test directory
- `cleanupTempDir()` - Clean up after tests
- `createMockClaudeJson()` - Create test configuration files
- `createMockMemoryFiles()` - Create test memory files

## Documentation

### Code Documentation

Use JSDoc for all public functions:

```typescript
/**
 * Load all MCP servers from .claude.json hierarchy.
 *
 * @param projectDir - Project root directory
 * @returns Array of MCP server configurations
 * @throws Error if projectDir doesn't exist
 */
export async function loadMCPServers(projectDir: string): Promise<MCPServer[]> {
  // ...
}
```

### README Updates

If your change affects user-facing behavior, update README.md:
- Installation instructions
- Usage examples
- CLI arguments
- Troubleshooting

## Pull Request Process

1. **Ensure all tests pass**: `npm test`
2. **Update documentation** if needed
3. **Add entry to CHANGELOG.md** under "Unreleased"
4. **Create descriptive PR**:
   - Clear title following Conventional Commits
   - Description of what changed and why
   - Link to any related issues
5. **Wait for review** - maintainers will review within 1-2 days
6. **Address feedback** if requested
7. **Merge** - Maintainer will merge once approved

## Release Process

(For maintainers only)

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release date
3. Create git tag: `git tag v0.x.0`
4. Build: `npm run build`
5. Publish: `npm publish`
6. Push tags: `git push --tags`

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

Thank you for contributing! 🎉

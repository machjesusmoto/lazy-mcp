# Research: Actual MCP Server Blocking via .claude.json Modification

**Feature**: 002-redesign-mcp-toggle
**Date**: 2025-10-08
**Status**: Complete

## Overview

Research findings for implementing actual MCP server blocking by modifying .claude.json files. This document consolidates decisions, rationale, and alternatives considered for the architectural redesign.

## 1. JSON Atomic Write Patterns in Node.js

### Decision

Use **write-to-temp + atomic-move** pattern with fs-extra:

```typescript
async function writeClaudeJson(projectDir: string, config: ClaudeJsonConfig) {
  const configPath = path.join(projectDir, '.claude.json');
  const backupPath = `${configPath}.backup`;
  const tempPath = `${configPath}.tmp`;

  // Create backup if file exists
  if (await fs.pathExists(configPath)) {
    await fs.copy(configPath, backupPath);
  }

  try {
    // Write to temporary file
    await fs.writeFile(tempPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    // Atomic move
    await fs.move(tempPath, configPath, { overwrite: true });
    await fs.chmod(configPath, 0o644);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }
  } catch (error) {
    // Restore from backup on failure
    if (await fs.pathExists(backupPath)) {
      await fs.move(backupPath, configPath, { overwrite: true });
    }
    await fs.remove(tempPath).catch(() => {});
    throw error;
  }
}
```

### Rationale

- **Atomic move**: `fs.move()` with `overwrite: true` is atomic on most file systems (ext4, APFS, NTFS)
- **Zero corruption**: If write fails, backup is restored automatically
- **Disk full protection**: Write fails before touching original file
- **Concurrent access**: Last write wins (acceptable for CLI tool used by single user)
- **Proven pattern**: Used in package managers (npm, yarn) and config tools

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Direct overwrite | No protection against write failures, high corruption risk |
| File locking | Not portable across platforms, adds complexity |
| Write-ahead log | Overkill for single-user CLI tool, adds state management |
| JSON streaming | Not needed for small config files (<5MB), adds complexity |

### Implementation Notes

- Include `.backup` and `.tmp` in .gitignore
- Clean up temp files on process exit (process.on('exit'))
- Preserve existing JSON formatting (2-space indent, trailing newline)
- Validate JSON before writing (catch syntax errors early)

## 2. .claude.json Override Mechanism

### Decision

**Child overrides parent via first-wins strategy** - confirmed working in Claude Code:

```typescript
// Home: ~/.claude.json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/cli"]
    }
  }
}

// Project: ~/project/.claude.json (OVERRIDES home)
{
  "mcpServers": {
    "magic": {
      "command": "echo",
      "args": ["[mcp-toggle] Server 'magic' is blocked"],
      "_mcpToggleBlocked": true,
      "_mcpToggleOriginal": {
        "command": "npx",
        "args": ["-y", "@21st-dev/cli"]
      }
    }
  }
}
```

Result: Claude Code loads project config, sees "echo" command, doesn't start actual magic server.

### Rationale

- **Verified behavior**: Tested in actual Claude Code - first-wins works
- **Preserves inheritance**: Doesn't require modifying parent files (which may be read-only)
- **Project-specific**: Each project can independently block inherited servers
- **Recoverable**: Original config preserved in `_mcpToggleOriginal`
- **Clear intent**: Dummy "echo" command makes override obvious in config file

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Delete from parent file | Requires write access to shared configs, affects all projects |
| Use null/empty config | Claude Code may treat as error vs intentional override |
| Comment out in parent | .claude.json doesn't support comments (standard JSON) |
| Symlink manipulation | Too fragile, platform-specific, hard to debug |

### Implementation Notes

- Always include `_mcpToggleBlocked: true` marker for tool recognition
- Include `_mcpToggleBlockedAt` timestamp for debugging
- Use descriptive echo message: `[mcp-toggle] Server 'name' is blocked`
- Validate that dummy override doesn't accidentally execute anything harmful

## 3. File Permission Handling Across Platforms

### Decision

**Use fs.chmod() with graceful degradation on Windows**:

```typescript
try {
  await fs.chmod(path, 0o644); // Files
  await fs.chmod(path, 0o755); // Directories
} catch (error) {
  // Windows: chmod may fail or be no-op, but files still secure via NTFS ACLs
  // Log warning but don't fail operation
  if (process.platform !== 'win32') {
    throw error; // Unix platforms: permission failures are errors
  }
}
```

### Rationale

- **Unix**: 644 (rw-r--r--) for files, 755 (rwxr-xr-x) for directories is standard
- **Windows**: NTFS ACLs provide security, chmod is often no-op
- **Cross-platform**: Node.js fs.chmod() handles platform differences
- **Security**: Prevents accidental world-writable files on Unix
- **Best practice**: Follow principle of least privilege

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Skip chmod entirely | Leaves files with potentially insecure permissions on Unix |
| Platform detection first | Adds complexity, fs.chmod() already handles this |
| Hard fail on Windows | Breaks Windows users when chmod is no-op |
| Use umask | Doesn't guarantee permissions, depends on user's environment |

### Implementation Notes

- Apply after file creation: `fs.writeFile()` → `fs.chmod()`
- Test on Windows, macOS, Linux to verify behavior
- Document permission expectations in README
- Consider adding permission validation tests (Unix only)

## 4. Migration Strategy from v0.1.x

### Decision

**Automatic, one-time migration on first run of v2.0.0**:

```typescript
async function migrateFromLegacyBlocked(projectDir: string): Promise<MigrationResult> {
  const blockedMdPath = path.join(projectDir, '.claude', 'blocked.md');

  // Check if legacy file exists
  if (!(await fs.pathExists(blockedMdPath))) {
    return { migrated: false, reason: 'no-legacy-file' };
  }

  // Read and parse legacy format
  const content = await fs.readFile(blockedMdPath, 'utf-8');
  const mcpServers = parseServersFromLegacy(content);
  const memoryFiles = parseMemoryFromLegacy(content);

  // Apply blocks using new mechanism
  for (const serverName of mcpServers) {
    await blockServer(projectDir, serverName); // Uses .claude.json
  }
  for (const memoryFile of memoryFiles) {
    await blockMemoryFile(memoryFile); // Renames to .blocked
  }

  // Mark legacy file as deprecated (preserve original)
  const deprecationNotice = `# DEPRECATED - Migrated to .claude.json blocking mechanism
# This file is preserved for reference but is no longer used by mcp-toggle v2.0.0+
# MCP servers are now blocked by modifying .claude.json directly
# See: https://github.com/machjesusmoto/mcp-toggle#migration-guide

`;
  await fs.writeFile(blockedMdPath, deprecationNotice + content, 'utf-8');

  return { migrated: true, serversCount: mcpServers.length, memoryCount: memoryFiles.length };
}
```

### Rationale

- **Automatic**: No user action required, happens on first run
- **Safe**: Preserves original file with deprecation notice
- **Clear**: Users see why file changed and what to do
- **One-time**: Migration marker prevents re-running
- **Backward compatible**: v0.1.x tool still works if user downgrades

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Manual migration command | Requires user awareness, many won't know to run it |
| Delete legacy file | Loses user data, prevents rollback |
| Run migration on every start | Performance impact, unnecessary after first run |
| Prompt user for confirmation | CLI tools should "just work", not require interaction |

### Implementation Notes

- Run migration check early in CLI startup (before TUI)
- Log migration results to console
- Add migration test with real v0.1.x blocked.md files
- Document migration in CHANGELOG and README
- Consider telemetry to track successful migrations

## 5. TUI Update Requirements

### Decision

**Use ink color and text utilities with symbolic indicators**:

```typescript
import { Text } from 'ink';

// Server source indicators
<Text color="cyan">🏠 Inherited</Text>  // From parent/home
<Text color="blue">📁 Local</Text>       // From project

// Blocking state indicators
<Text color="red">❌ Blocked</Text>      // Currently blocked
<Text color="green">✅ Active</Text>     // Currently active

// Combined display
<Text>
  {server.sourceType === 'local' ? '📁' : '🏠'} {server.name}
  {' '}
  {server.isBlocked ? <Text color="red">❌</Text> : <Text color="green">✅</Text>}
</Text>
```

### Rationale

- **Visual clarity**: Emoji + color makes state immediately obvious
- **Accessibility**: Both symbol and color convey information
- **ink native**: Uses standard ink components (no custom dependencies)
- **Cross-platform**: Emoji supported in modern terminals
- **Consistent**: Follows CLI tool conventions (git, docker, etc.)

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Text only (no emoji) | Less visually distinct, harder to scan |
| Custom ASCII art | Looks dated, takes more space |
| Color only (no symbols) | Not accessible to colorblind users |
| Status badges | Takes too much horizontal space in TUI |

### Implementation Notes

- Test emoji rendering in Windows Terminal, iTerm2, GNOME Terminal
- Provide `--no-emoji` flag for environments where emoji don't render
- Use color fallback: red/green for blocked/active if emoji disabled
- Update existing TUI components incrementally (minimize disruption)
- Add TUI smoke tests for visual regression

## Summary of Key Decisions

| Decision | Approach | Confidence |
|----------|----------|------------|
| Atomic writes | Write-temp + move + backup/restore | ✅ High - proven pattern |
| Override mechanism | Child config overrides parent via dummy echo | ✅ High - tested with Claude Code |
| File permissions | fs.chmod() with Windows graceful degradation | ✅ High - standard Node.js |
| Migration | Automatic one-time on first v2.0.0 run | ✅ High - user-friendly |
| TUI updates | ink + emoji + color indicators | ✅ Medium - depends on terminal support |

## Risk Mitigation

1. **Atomic write failure**: Backup restoration tested in unit tests
2. **Override not working**: Integration test with actual Claude Code
3. **Permission issues**: Cross-platform test suite
4. **Migration data loss**: Preserve original, add migration tests
5. **TUI rendering**: Fallback to text-only if emoji unsupported

## Next Steps

All research complete - ready for Phase 1 (Data Model & Contracts).

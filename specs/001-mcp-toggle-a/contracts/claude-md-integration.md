# claude.md Integration Specification

**Version**: 1.0.0
**Date**: 2025-10-07
**Status**: Complete

## Purpose

The `claude.md` file provides instructions to Claude Code on how to process the `blocked.md` file at runtime. This integration spec defines how mcp-toggle updates claude.md to enable automatic blocking functionality.

## Location

```
<project-root>/claude.md
```

**Path Rules**:
- Located in project root directory (same level as .claude/)
- Filename is case-sensitive: `claude.md` (lowercase)
- Standard Claude Code project instruction file

---

## Integration Block Format

### Template

```markdown
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
```

---

## Marker Comments

### Start Marker
```markdown
<!-- MCP Toggle Integration - DO NOT EDIT THIS SECTION -->
```

**Purpose**:
- Identifies the start of the integration block
- Warns users not to manually edit this section
- Used by mcp-toggle to detect existing integration

**Rules**:
- Must be exact match (case-sensitive)
- Must be on its own line
- Can have leading/trailing whitespace (ignored)

### End Marker
```markdown
<!-- End MCP Toggle Integration -->
```

**Purpose**:
- Identifies the end of the integration block
- Used by mcp-toggle to update or replace integration

**Rules**:
- Must be exact match (case-sensitive)
- Must be on its own line
- Can have leading/trailing whitespace (ignored)

---

## Integration Block Content

### Section Header
```markdown
# MCP Server and Memory Control
```

**Purpose**: Clear section title for human readers

### Explanation Paragraph
```markdown
This project uses `blocked.md` to control which MCP servers and memory files are loaded.
```

**Purpose**: Brief overview of the blocking mechanism

### Processing Instructions
```markdown
When Claude Code starts in this directory:
1. Read `.claude/blocked.md` if it exists
2. For each line prefixed with `mcp:`, skip loading that MCP server
3. For each line prefixed with `memory:`, skip loading that memory file
```

**Purpose**: Step-by-step instructions for Claude Code to follow

**Format Requirements**:
- Numbered list for clarity
- Each step is actionable
- References exact prefixes from blocked.md format
- Clear conditional (if file exists)

### Usage Instruction
```markdown
To manage blocked items, run: `npx mcp-toggle`
```

**Purpose**: Tell users how to modify blocks

### Status Line
```markdown
**Current blocked items**: Check `.claude/blocked.md` for the list.
```

**Purpose**: Direct users to blocked.md for current state

---

## Update Rules

### Detection Algorithm

```typescript
function hasIntegration(claudeMdContent: string): boolean {
  const startMarker = '<!-- MCP Toggle Integration';
  const endMarker = '<!-- End MCP Toggle Integration -->';

  return claudeMdContent.includes(startMarker) &&
         claudeMdContent.includes(endMarker);
}
```

### Insertion Algorithm

**When claude.md doesn't exist**:
1. Create new file with just the integration block
2. Set permissions to 644

```markdown
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
```

**When claude.md exists but has no integration**:
1. Read existing content
2. Append integration block at the end
3. Ensure blank line before integration block

```typescript
function addIntegration(existingContent: string): string {
  // Ensure existing content ends with newline
  let content = existingContent.trimEnd() + '\n\n';

  // Append integration block
  content += INTEGRATION_TEMPLATE;

  return content;
}
```

**When claude.md exists with integration**:
1. No action needed (integration already present)
2. Optionally verify content is up-to-date (future enhancement)

---

## Content Preservation Rules

### Core Principle
**Never modify existing content** outside the integration block.

### Preservation Guarantees

1. **Content Before Integration**: Preserved exactly
2. **Content After Integration**: Preserved exactly (if integration not at end)
3. **Whitespace**: Existing whitespace preserved
4. **Comments**: Other HTML comments preserved
5. **Encoding**: UTF-8 encoding preserved

### Atomic Update

```typescript
function updateClaudeMd(claudeMdPath: string): void {
  // 1. Read existing content (if file exists)
  const existing = fs.existsSync(claudeMdPath)
    ? fs.readFileSync(claudeMdPath, 'utf-8')
    : '';

  // 2. Check if integration already present
  if (hasIntegration(existing)) {
    // Already integrated, no action needed
    return;
  }

  // 3. Add integration
  const updated = addIntegration(existing);

  // 4. Write atomically (temp file + rename)
  const tempPath = `${claudeMdPath}.tmp`;
  fs.writeFileSync(tempPath, updated, 'utf-8');
  fs.renameSync(tempPath, claudeMdPath);

  // 5. Set permissions
  fs.chmodSync(claudeMdPath, 0o644);
}
```

---

## Integration Verification

### Post-Update Checks

After updating claude.md, verify:
1. File exists
2. File is readable
3. Start marker present
4. End marker present
5. Markers are properly paired
6. Original content preserved (if file existed)

### Validation Function

```typescript
function validateIntegration(claudeMdPath: string): boolean {
  if (!fs.existsSync(claudeMdPath)) return false;

  const content = fs.readFileSync(claudeMdPath, 'utf-8');

  // Check markers
  const startMarker = '<!-- MCP Toggle Integration';
  const endMarker = '<!-- End MCP Toggle Integration -->';

  const hasStart = content.includes(startMarker);
  const hasEnd = content.includes(endMarker);

  if (!hasStart || !hasEnd) return false;

  // Check marker order
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  return startIndex < endIndex;
}
```

---

## Error Handling

### File Permission Errors

**Scenario**: Cannot write to claude.md

**Handling**:
```
Error: Permission denied
  Cannot write to claude.md: /path/to/project/claude.md

  Please check file permissions or run with appropriate privileges.

  Note: blocked.md was created successfully, but claude.md integration failed.
  You can manually add the integration instructions from the documentation.
```

**Exit Code**: 3

**Recovery**: blocked.md still works, just needs manual claude.md update

### File Lock Errors

**Scenario**: claude.md is locked by another process

**Handling**:
- Retry up to 3 times with 100ms delay
- If still fails, show error message similar to permission denied
- Provide manual integration instructions

### Disk Full Errors

**Scenario**: No disk space available

**Handling**:
```
Error: Disk full
  Cannot write to claude.md due to insufficient disk space.

  Please free up disk space and try again.
```

**Exit Code**: 1

---

## User Experience

### First Run (No claude.md)

**TUI Message After Save**:
```
✓ Saved 2 changes to .claude/blocked.md
✓ Created claude.md with integration instructions
```

### Subsequent Runs (claude.md exists without integration)

**TUI Message After Save**:
```
✓ Saved 2 changes to .claude/blocked.md
✓ Updated claude.md with integration instructions
```

### Already Integrated

**TUI Message After Save**:
```
✓ Saved 2 changes to .claude/blocked.md
  (claude.md integration already present)
```

---

## Example Scenarios

### Scenario 1: Empty Project

**Initial State**:
```
project/
└── (no files)
```

**After First mcp-toggle Use**:
```
project/
├── .claude/
│   └── blocked.md
└── claude.md        (created with integration)
```

**claude.md Content**:
```markdown
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
```

---

### Scenario 2: Existing claude.md

**Initial claude.md**:
```markdown
# My Project

This project uses Claude Code for development.

## Instructions

Please follow these coding standards:
- Use TypeScript
- Write tests for all features
- Document public APIs
```

**After mcp-toggle Use**:
```markdown
# My Project

This project uses Claude Code for development.

## Instructions

Please follow these coding standards:
- Use TypeScript
- Write tests for all features
- Document public APIs

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
```

**Note**: Original content fully preserved, integration appended at end.

---

## Testing Requirements

### Integration Tests

1. **Create claude.md from scratch**: Verify content matches template
2. **Append to existing claude.md**: Verify original content preserved
3. **Already integrated**: Verify no-op, no duplication
4. **Permission denied**: Verify graceful error handling
5. **Disk full**: Verify error handling and rollback
6. **Marker detection**: Verify correct identification of existing integration

### Edge Cases

1. **Empty claude.md**: Should append to empty file
2. **claude.md with only whitespace**: Should append after whitespace
3. **claude.md with markers but wrong content**: Should detect and handle (future)
4. **Multiple marker pairs**: Should handle gracefully (use first pair)
5. **Incomplete markers**: Should treat as not integrated, append new block

---

## Maintenance Notes

### Future Enhancements

1. **Version Detection**: Add version tag to integration block to detect outdated integrations
2. **Content Update**: Update integration block content if format changes
3. **Removal Support**: Add command to remove integration if user wants to undo
4. **Custom Template**: Allow users to customize integration text via config file

### Breaking Changes

If integration format needs breaking changes:
1. Increment version in markers: `<!-- MCP Toggle Integration v2.0 -->`
2. Detect old version and update in place
3. Document migration path in changelog

---

## Security Considerations

- **No Code Execution**: Integration block contains only markdown/instructions
- **No External Links**: All references are local filesystem paths
- **No Credentials**: No sensitive data in integration block
- **Safe Markers**: HTML comments don't execute in markdown renderers

---

This specification ensures claude.md integration is:
- **Safe**: Preserves existing content, atomic updates
- **Idempotent**: Can run multiple times without issue
- **Clear**: Instructions are unambiguous for Claude Code
- **Maintainable**: Version-aware, extensible design
- **User-Friendly**: Provides helpful context and instructions

# Frontmatter Parser Fix

**Date**: 2025-10-10
**Issue**: Agent files with complex multi-line descriptions were failing to parse
**Resolution**: Enhanced parser with fallback mechanism for non-strict YAML

## Problem

User agent files in `~/.claude/agents/` were producing errors like:
```
Failed to load agent file /home/dtaylor/.claude/agents/documentation-architect.md: Error: Invalid frontmatter in agent file
```

Only 19 out of 57+ agent files were loading successfully.

### Root Cause

Agent frontmatter contained multi-line `description` fields with:
- XML-like tags (`<example>`, `<commentary>`)
- Special characters (colons, quotes, apostrophes)
- Unquoted multi-line content

Example problematic frontmatter:
```yaml
---
name: documentation-architect
description: Use this agent when you need to create, refine, or update project documentation by synthesizing information from multiple sources including reference materials, technical specifications, and implementation details. This agent excels at collaborating with research curators and engineers to produce comprehensive, accurate, and well-structured documentation that serves both technical and non-technical audiences. Examples: <example>Context: The user needs to document a newly implemented API that was built based on research and specifications. user: 'We just finished implementing the authentication API based on the OAuth2 spec and our custom requirements' assistant: 'I'll use the documentation-architect agent to create comprehensive API documentation that combines the OAuth2 reference standards with your actual implementation details' <commentary>Since the user needs to document an implemented feature combining reference specs with actual code, use the Task tool to launch the documentation-architect agent.</commentary></example> <example>Context: The user wants to update existing documentation after code changes. user: 'The payment processing module has been refactored and we need to update all the related documentation' assistant: 'Let me use the documentation-architect agent to review the refactored code and update the documentation accordingly' <commentary>Since documentation needs to be updated based on code changes, use the Task tool to launch the documentation-architect agent to ensure accuracy between code and docs.</commentary></example>
model: sonnet
color: cyan
---
```

The strict YAML parser (`js-yaml`) was rejecting this because:
1. The description value contains unescaped special characters
2. Multi-line content should use `|` or `>` indicators
3. XML-like tags and quotes within the value need proper escaping

## Solution

Enhanced the frontmatter parser with a **two-tier approach**:

### Tier 1: Standard YAML Parser (Primary)
- Uses `js-yaml` with lenient options
- Handles well-formed YAML correctly
- Suppresses warnings for minor issues

### Tier 2: Fallback Simple Parser (Secondary)
- Activates when strict YAML parsing fails
- Uses regex-based key-value extraction
- Handles multi-line values that span until the next key

## Implementation

### File Modified
`src/utils/frontmatter-parser.ts`

### Key Changes

1. **Enhanced YAML Loading**:
```typescript
const frontmatter = yaml.load(yamlContent, {
  json: true,              // Allow JSON-compatible features
  onWarning: () => {},     // Suppress warnings
});
```

2. **Added Fallback Parser**:
```typescript
function parseSimpleFrontmatter(yamlContent: string): Record<string, any> | null {
  const lines = yamlContent.split('\n');
  const result: Record<string, any> = {};
  let currentKey: string | null = null;
  let currentValue: string[] = [];

  const flushCurrent = () => {
    if (currentKey) {
      const value = currentValue.join('\n').trim();
      result[currentKey] = value;
      currentKey = null;
      currentValue = [];
    }
  };

  for (const line of lines) {
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);

    if (keyMatch) {
      flushCurrent();
      currentKey = keyMatch[1];
      const initialValue = keyMatch[2];
      if (initialValue) {
        currentValue.push(initialValue);
      }
    } else if (currentKey) {
      currentValue.push(line);
    }
  }

  flushCurrent();
  return Object.keys(result).length > 0 ? result : null;
}
```

3. **Updated Main Parser Flow**:
```typescript
try {
  const frontmatter = yaml.load(yamlContent, { json: true, onWarning: () => {} });
  // ... validation ...
  return { frontmatter, body };
} catch (error) {
  // Try fallback parser
  const manualParsed = parseSimpleFrontmatter(yamlContent);
  if (manualParsed) {
    return { frontmatter: manualParsed, body };
  }
  return null;
}
```

## Results

### Before Fix
- **Agents loaded**: 19 out of 57+
- **Error rate**: ~66% failure
- **User experience**: Many "Invalid frontmatter" warnings

### After Fix
- **Agents loaded**: 57 out of 57+
- **Error rate**: 0% failure
- **User experience**: No warnings, all agents available

### Test Results
- All 221 tests still passing
- No regressions introduced
- Backward compatible with well-formed YAML

## Limitations

The fallback parser has some limitations:
1. **No nested structures**: Only handles flat key-value pairs
2. **No arrays**: Multi-value fields parsed as single string
3. **No special YAML features**: No anchors, aliases, or complex types

However, these limitations are acceptable because:
- Agent frontmatter is simple (name, description, model, color, tools)
- The `tools` field is parsed separately with `.split(',')` in the agent manager
- Most agent files will work fine with either parser

## Best Practices Going Forward

### For Agent Authors
When creating agent files, prefer well-formed YAML:

**Good** (strict YAML):
```yaml
---
name: my-agent
description: |
  Multi-line description
  with proper YAML syntax
  and <special> characters
model: sonnet
---
```

**Also Works** (fallback parser):
```yaml
---
name: my-agent
description: Simple description with <tags> and 'quotes' that spans
  multiple lines until the next key
model: sonnet
---
```

### For Future Development
- Consider adding validation warnings for non-standard YAML
- Could provide a migration tool to convert to strict YAML
- Documentation should show proper YAML syntax examples

## Related Files
- `src/utils/frontmatter-parser.ts` - Parser implementation
- `src/core/agent-manager.ts` - Consumer of parsed frontmatter
- `docs/agent-management.md` - Agent system documentation

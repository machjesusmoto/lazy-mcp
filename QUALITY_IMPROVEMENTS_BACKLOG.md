# Quality Improvements Backlog
**Created**: 2025-10-11
**Source**: Phase 2 Quality Review
**Priority**: Nice-to-have (post-merge improvements)

---

## Overview

This document tracks potential quality improvements identified during the Phase 2 Quality Review. All items are **optional enhancements** that would improve code quality but are not required for production readiness.

**Current Status**: Codebase is production-ready and approved for merge.

---

## 1. Code Organization

### 1.1 Extract Shared Utilities

**Priority**: 🟢 Low
**Effort**: 30 minutes
**Impact**: Reduced duplication, improved maintainability

#### Status Icon Helper

**Current State**: Duplicated in multiple components

```typescript
// Found in: ItemList.tsx, ServerList.tsx, MemoryList.tsx
const getStatusIcon = (isBlocked: boolean): string => {
  return isBlocked ? '✗' : '✓';
};
```

**Proposed Solution**:
```typescript
// src/utils/ui-helpers.ts
export function getStatusIcon(isBlocked: boolean): string {
  return isBlocked ? '✗' : '✓';
}

export function getTypeIcon(type: 'server' | 'memory' | 'agent'): string {
  switch (type) {
    case 'server': return '[S]';
    case 'memory': return '[M]';
    case 'agent': return '[A]';
  }
}
```

**Files to Update**:
- `src/tui/components/item-list.tsx`
- `src/tui/components/server-list.tsx`
- `src/tui/components/memory-list.tsx`

#### Text Truncation Helper

**Current State**: Implemented only in ItemList

```typescript
// src/tui/components/item-list.tsx
const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
```

**Proposed Solution**:
```typescript
// src/utils/text-utils.ts
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).length > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}
```

**Files to Update**:
- `src/tui/components/item-list.tsx`
- `src/tui/components/details-pane.tsx`

---

## 2. Testing Enhancements

### 2.1 Add Viewport Unit Tests

**Priority**: 🟡 Medium
**Effort**: 1 hour
**Impact**: Better test coverage for critical rendering logic

**Current State**: Viewport logic tested through integration tests

**Proposed Solution**:
```typescript
// tests/unit/viewport-logic.test.ts

describe('Viewport Calculation', () => {
  describe('buildVisibleItems', () => {
    it('should build items from start index', () => { ... });
    it('should account for section headers', () => { ... });
    it('should stop at available lines limit', () => { ... });
  });

  describe('buildVisibleItemsFromEnd', () => {
    it('should work backwards from end', () => { ... });
    it('should include last items correctly', () => { ... });
  });

  describe('scrollOffset calculation', () => {
    it('should use top strategy near beginning', () => { ... });
    it('should use bottom strategy near end', () => { ... });
    it('should use middle strategy with adjustment', () => { ... });
  });

  describe('edge cases', () => {
    it('should handle empty list', () => { ... });
    it('should handle single item', () => { ... });
    it('should handle exact screen fill', () => { ... });
    it('should handle very long lists (>100 items)', () => { ... });
  });
});
```

**Benefits**:
- Easier to test edge cases in isolation
- Faster test execution (no full component render)
- Better documentation of viewport behavior

---

## 3. Code Quality

### 3.1 Extract Viewport Logic to Custom Hook

**Priority**: 🟢 Low
**Effort**: 1 hour
**Impact**: Better separation of concerns, easier testing

**Current State**: Viewport logic embedded in ItemList component

**Proposed Solution**:
```typescript
// src/tui/hooks/useViewport.ts

export interface UseViewportOptions {
  items: UnifiedItem[];
  selectedIndex: number;
  availableHeight: number;
}

export interface ViewportResult {
  visibleItems: UnifiedItem[];
  scrollOffset: number;
}

export function useViewport({
  items,
  selectedIndex,
  availableHeight,
}: UseViewportOptions): ViewportResult {
  // Extract viewport calculation logic here
  // Makes component more focused on rendering
}
```

**Files to Update**:
- Create `src/tui/hooks/useViewport.ts`
- Update `src/tui/components/item-list.tsx` to use hook

**Benefits**:
- Cleaner component code (focus on rendering)
- Easier to unit test viewport logic
- Reusable for future list components

### 3.2 Extract Constants from Viewport Logic

**Priority**: 🟢 Low
**Effort**: 15 minutes
**Impact**: Better maintainability, clearer intent

**Current State**: Magic numbers in viewport calculation

**Proposed Solution**:
```typescript
// src/tui/components/item-list.tsx or viewport hook

const VIEWPORT_CONFIG = {
  // When to use "near top" strategy
  TOP_REGION_FACTOR: 0.5,

  // When to use "near bottom" strategy
  BOTTOM_REGION_FACTOR: 0.5,

  // Conservative placement in middle region
  MIDDLE_PLACEMENT_FACTOR: 0.6,

  // Safety limit for iterative adjustment
  MAX_ADJUSTMENT_ATTEMPTS: 10,

  // Layout spacing
  BORDER_LINES: 2,
  TITLE_LINES: 1,
  SCROLL_INDICATOR_LINES: 2,
} as const;
```

**Benefits**:
- Easier to tune viewport behavior
- Self-documenting code
- No magic numbers

---

## 4. Type Safety

### 4.1 Replace JSON `any` Types with Schema Validation

**Priority**: 🟡 Medium
**Effort**: 4 hours
**Impact**: Full TypeScript strict mode compliance, better runtime safety

**Current State**: 85 justified `any` types for JSON config structures

**Proposed Solution**:
```typescript
// src/utils/json-schema.ts

import { z } from 'zod';

const MCPServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  _mcpToggleBlocked: z.boolean().optional(),
  _mcpToggleBlockedAt: z.string().optional(),
  _mcpToggleOriginal: z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
  }).optional(),
});

const ClaudeConfigSchema = z.object({
  mcpServers: z.record(MCPServerSchema),
});

// Type-safe config reading
export async function readClaudeConfig(path: string) {
  const data = await fs.readJSON(path);
  return ClaudeConfigSchema.parse(data); // Validates and types
}
```

**Files to Update**:
- `src/utils/mcp-json-utils.ts`
- `src/core/config-loader.ts`
- `src/core/migration-manager.ts`

**Benefits**:
- Runtime validation of JSON structures
- No more `any` types for configs
- Better error messages for invalid configs
- Full TypeScript strict mode compliance

**Dependencies**:
- Add `zod` package for schema validation

### 4.2 Create Proper TUI Server Type

**Priority**: 🟢 Low
**Effort**: 30 minutes
**Impact**: Remove 4 justified `any` types

**Current State**: TUI passes dynamic server structures

```typescript
// TODO: Replace with MCPServer type
selectedServers: any[]
```

**Proposed Solution**:
```typescript
// src/models/tui-types.ts

export interface TUIServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  hierarchyLevel: number;
  isBlocked: boolean;
  _mcpToggleBlocked?: boolean;
  _mcpToggleBlockedAt?: string;
  _mcpToggleOriginal?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
}
```

**Files to Update**:
- `src/core/migration-manager.ts`

---

## 5. Error Handling

### 5.1 Structured Error Types

**Priority**: 🟢 Low
**Effort**: 2 hours
**Impact**: Better error handling, easier debugging

**Current State**: Generic Error objects with string messages

**Proposed Solution**:
```typescript
// src/utils/errors.ts

export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly phase: 'backup' | 'write' | 'verify' | 'cleanup',
    public readonly serverName?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly configPath: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}
```

**Files to Update**:
- `src/core/migration-manager.ts`
- `src/core/blocked-manager.ts`
- `src/utils/mcp-json-utils.ts`

**Benefits**:
- Type-safe error handling with `instanceof`
- Structured error information for logging
- Better error categorization
- Easier debugging

---

## 6. Documentation

### 6.1 Add Viewport Algorithm Documentation

**Priority**: 🟢 Low
**Effort**: 30 minutes
**Impact**: Better code understanding for contributors

**Proposed Solution**:
Create `docs/VIEWPORT_ALGORITHM.md` documenting:
- Line counting formulas
- Three-strategy approach
- Edge case handling
- Performance characteristics

**Source Material**: Already documented in quality review (Appendix C)

### 6.2 Create Architecture Decision Records (ADRs)

**Priority**: 🟢 Low
**Effort**: 1 hour
**Impact**: Document key design decisions

**Proposed ADRs**:
1. **ADR-001**: Why we chose v2.0.0 blocking mechanism (.mcp.json modification)
2. **ADR-002**: Why we unified servers/memory/agents into single list
3. **ADR-003**: Why we use atomic write + rollback pattern
4. **ADR-004**: Why we chose 66/33 split for list/details panes

---

## Implementation Priority

### Phase 1: Quick Wins (Total: 1.5 hours)
1. Extract shared utilities (30 min)
2. Extract viewport constants (15 min)
3. Create TUI server type (30 min)
4. Add viewport documentation (30 min)

### Phase 2: Testing (Total: 1 hour)
1. Add viewport unit tests (1 hour)

### Phase 3: Refactoring (Total: 3 hours)
1. Extract viewport hook (1 hour)
2. Structured error types (2 hours)

### Phase 4: Type Safety (Total: 4 hours)
1. JSON schema validation (4 hours)

### Phase 5: Documentation (Total: 1 hour)
1. Create ADRs (1 hour)

**Total Effort**: ~10.5 hours across all improvements

---

## Tracking

Use GitHub issues to track implementation:

- [ ] #TBD: Extract shared utilities (Phase 1)
- [ ] #TBD: Extract viewport constants (Phase 1)
- [ ] #TBD: Create TUI server type (Phase 1)
- [ ] #TBD: Add viewport documentation (Phase 1)
- [ ] #TBD: Add viewport unit tests (Phase 2)
- [ ] #TBD: Extract viewport hook (Phase 3)
- [ ] #TBD: Structured error types (Phase 3)
- [ ] #TBD: JSON schema validation (Phase 4)
- [ ] #TBD: Create ADRs (Phase 5)

---

**Note**: All improvements in this document are **optional**. The codebase is production-ready and approved for merge in its current state.

**Last Updated**: 2025-10-11

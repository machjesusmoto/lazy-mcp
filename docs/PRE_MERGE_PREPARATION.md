# Pre-Merge Preparation Plan
**Branch**: `004-comprehensive-context-management` → `main`
**Version**: v0.4.2 (published)
**Date**: 2025-10-11
**Current Commit**: 063690f

## Executive Summary

This document outlines a systematic, phase-based approach to prepare the feature branch for merge to main. The plan ensures code quality, test coverage, documentation accuracy, and security before integrating critical viewport fixes and visual enhancements into the stable codebase.

**Key Achievements on Branch**:
- ✅ Fixed critical viewport calculation bug (items disappearing from unified list)
- ✅ Enhanced visual design (cyan/bold token estimates, improved navigation keys)
- ✅ Published v0.4.2 to npm with full release notes
- ✅ Tested across multiple terminal window sizes

**Risks Identified**:
- Backup files present (app-old.tsx, app.tsx.backup, compiled versions in dist/)
- Potential dead code or unused imports
- Test suite not recently validated
- Documentation may reference old implementation details

---

## Phase 1: Code Cleanup
**Agent**: cleanup-specialist, code-organizer
**Duration**: 2-3 hours
**Priority**: High (must complete before other phases)

### Task 1.1: Remove Backup Files
**Files to Delete**:
```
src/tui/app-old.tsx
src/tui/app.tsx.backup
dist/tui/app-old.js
dist/tui/app-old.js.map
dist/tui/app-old.d.ts
dist/tui/app-old.d.ts.map
```

**Actions**:
1. Verify no references to these files exist in codebase
2. Delete source backup files: `rm src/tui/app-old.tsx src/tui/app.tsx.backup`
3. Rebuild to clear compiled backups: `npm run build`
4. Verify dist/ contains only current compiled files

**Validation**:
- [ ] `git status` shows deleted backup files
- [ ] No import statements reference backup files
- [ ] `npm run build` succeeds without errors
- [ ] dist/ contains only current compiled files

**Dependencies**: None (can start immediately)

---

### Task 1.2: Identify and Remove Dead Code
**Agent**: code-analyzer, refactoring-expert

**Analysis Areas**:
1. **Unused Imports**: Check all .ts/.tsx files for unused imports
2. **Commented Code**: Remove old commented implementations
3. **Unused Functions**: Identify functions not called anywhere
4. **Deprecated Patterns**: Old v0.3.0 blocking mechanisms

**Tools**:
```bash
# Find unused exports
npx ts-unused-exports tsconfig.json

# Check for commented code blocks
grep -r "^[[:space:]]*//.*function\|^[[:space:]]*//.*const" src/

# Find TODOs and FIXMEs
grep -rn "TODO\|FIXME" src/
```

**Validation**:
- [ ] No unused imports remain (ESLint clean)
- [ ] No commented-out code blocks
- [ ] All TODOs documented or resolved
- [ ] `npm run lint` passes with zero warnings

**Dependencies**: Task 1.1 (backup files removed)

---

### Task 1.3: Verify Build Artifacts
**Agent**: build-engineer

**Actions**:
1. Clean build: `rm -rf dist/ && npm run build`
2. Verify all source files compiled successfully
3. Check dist/ structure matches src/ structure
4. Ensure no stale .d.ts or .js.map files

**Validation**:
- [ ] `dist/` mirrors `src/` structure exactly
- [ ] All .tsx files have corresponding .js, .d.ts, .js.map
- [ ] No orphaned compiled files (files in dist/ without src/ counterpart)
- [ ] Build completes in <30 seconds

**Dependencies**: Task 1.2 (dead code removed)

---

## Phase 2: Quality Review
**Agent**: refactoring-expert, quality-engineer
**Duration**: 4-6 hours
**Priority**: High

### Task 2.1: Viewport Calculation Code Review
**Agent**: code-reviewer, algorithm-specialist

**Focus**: Critical viewport fix (v0.4.2) - ensure implementation is optimal

**Review Areas**:
1. **buildVisibleItems()** - Forward scrolling logic
2. **buildVisibleItemsFromEnd()** - Backwards scrolling logic
3. **Section header counting** - 3-line calculation accuracy
4. **Iterative adjustment** - Middle scrolling guarantee

**Questions to Answer**:
- Is the algorithm as simple as possible?
- Are edge cases handled (empty lists, single item, etc.)?
- Could performance be improved? (Currently O(n) worst case)
- Are comments clear and accurate?

**Deliverables**:
- Code review document highlighting any concerns
- Refactoring recommendations (if any)
- Performance analysis

**Validation**:
- [ ] Algorithm correctness verified
- [ ] Performance acceptable (tested with 100+ items)
- [ ] Edge cases documented and tested
- [ ] Comments match implementation

**Dependencies**: Task 1.3 (clean build verified)

---

### Task 2.2: Component Architecture Review
**Agent**: frontend-architect, react-specialist

**Components to Review**:
```
src/tui/components/
├── agent-list.tsx
├── context-summary.tsx
├── details-pane.tsx
├── error-boundary.tsx
├── item-list.tsx          # Core unified list - critical
├── memory-list.tsx
├── memory-migration-prompt.tsx
├── memory-migration-status.tsx
├── migration-menu.tsx
├── server-list.tsx
└── status-bar.tsx
```

**Review Criteria**:
1. **Single Responsibility**: Each component has one clear purpose
2. **Prop Drilling**: Are props passed through too many layers?
3. **State Management**: Is useState/useEffect usage appropriate?
4. **Reusability**: Can components be more generic?
5. **Performance**: Any unnecessary re-renders?

**Focus Areas**:
- `item-list.tsx` - Most complex component, needs careful review
- `app.tsx` - Orchestration logic, state management
- Hook patterns - Any custom hooks that could be extracted?

**Deliverables**:
- Architecture review document
- Refactoring recommendations ranked by priority
- Prop interface improvements

**Validation**:
- [ ] No prop drilling deeper than 2 levels
- [ ] All components have clear single responsibility
- [ ] Performance analysis complete (React DevTools)
- [ ] Reusability opportunities identified

**Dependencies**: Task 2.1 (viewport logic reviewed)

---

### Task 2.3: Type Safety Audit
**Agent**: typescript-expert, type-safety-engineer

**Review Areas**:
1. **Any Types**: Identify and eliminate `any` usage
2. **Type Assertions**: Review `as` casts for safety
3. **Optional Chaining**: Ensure proper null handling
4. **Interface Completeness**: All data models fully typed

**Tools**:
```bash
# Find 'any' usage
grep -rn ": any" src/

# Find type assertions
grep -rn " as " src/

# TypeScript strict mode check
npx tsc --noEmit --strict
```

**Validation**:
- [ ] Zero `any` types (or documented exceptions)
- [ ] All type assertions justified with comments
- [ ] Strict mode compilation successful
- [ ] No TypeScript errors or warnings

**Dependencies**: Task 2.2 (component review complete)

---

### Task 2.4: Error Handling Review
**Agent**: reliability-engineer, error-handling-specialist

**Review Focus**:
1. **File Operations**: Are all fs operations wrapped in try-catch?
2. **User Input**: Is validation present for all user actions?
3. **Error Messages**: Are they helpful and actionable?
4. **Graceful Degradation**: Does app continue on non-critical errors?

**Critical Paths to Review**:
- Settings file read/write operations
- Memory file discovery and parsing
- Agent frontmatter parsing
- Atomic write rollback scenarios

**Deliverables**:
- Error handling coverage report
- Recommendations for improved error messages
- Graceful degradation improvements

**Validation**:
- [ ] All file operations have error handling
- [ ] Error messages are user-friendly
- [ ] Non-critical errors don't crash app
- [ ] Rollback mechanisms tested

**Dependencies**: Task 2.3 (type safety verified)

---

## Phase 3: Test Validation
**Agent**: test-engineer, qa-specialist
**Duration**: 3-4 hours
**Priority**: Critical

### Task 3.1: Run Full Test Suite
**Agent**: test-runner, ci-engineer

**Actions**:
```bash
# Run all tests with coverage
npm run test:coverage

# Check coverage thresholds
# Expect: >80% line coverage, >70% branch coverage
```

**Expected Results**:
- All unit tests pass (14 test files)
- All integration tests pass (3 test files)
- No flaky tests (run 3 times to verify)
- Coverage meets thresholds

**Validation**:
- [ ] All tests pass (100% success rate)
- [ ] No test timeouts or hangs
- [ ] Coverage: >80% lines, >70% branches
- [ ] Test run time: <30 seconds

**Dependencies**: Task 2.4 (error handling reviewed)

---

### Task 3.2: Identify Test Gaps
**Agent**: test-architect, coverage-analyst

**Analysis**:
1. **Uncovered Code**: What code lacks test coverage?
2. **Edge Cases**: Are boundary conditions tested?
3. **Integration Gaps**: Are component interactions tested?
4. **Viewport Logic**: Is the v0.4.2 fix thoroughly tested?

**Tools**:
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

**Focus Areas**:
- `src/tui/components/item-list.tsx` - Critical viewport logic
- `src/core/migration-manager.ts` - Migration scenarios
- `src/core/settings-manager.ts` - Atomic write edge cases

**Deliverables**:
- Test gap analysis document
- List of recommended new tests (prioritized)
- Coverage improvement plan

**Validation**:
- [ ] All critical paths have tests
- [ ] Edge cases documented
- [ ] Integration test coverage assessed
- [ ] Viewport fix has dedicated tests

**Dependencies**: Task 3.1 (test suite passes)

---

### Task 3.3: Manual TUI Testing
**Agent**: qa-tester, ux-specialist

**Test Scenarios**:
1. **Viewport Scrolling**: Test with 5, 20, 50, 100 items
2. **Terminal Sizes**: Test at 80x24, 120x40, 200x60
3. **Navigation**: All keyboard shortcuts work correctly
4. **Blocking**: Toggle block/unblock for all item types
5. **Migration**: Old .blocked files migrate correctly

**Window Sizes to Test**:
```bash
# Small terminal
resize -s 24 80 && npx mcp-toggle

# Medium terminal
resize -s 40 120 && npx mcp-toggle

# Large terminal
resize -s 60 200 && npx mcp-toggle
```

**Validation Checklist**:
- [ ] All items visible at end of list (no disappearing)
- [ ] Selection highlight always visible
- [ ] Token estimates displayed in cyan/bold
- [ ] Navigation keys work in all window sizes
- [ ] No visual glitches or layout issues

**Dependencies**: Task 3.2 (test gaps identified)

---

### Task 3.4: Write Missing Critical Tests
**Agent**: test-writer, quality-assurance

**Priority Tests** (based on Task 3.2 findings):
1. **Viewport Edge Cases**:
   - Empty list
   - Single item
   - Items exactly filling screen
   - Scrolling to last item
   - Section header line counting

2. **Migration Scenarios**:
   - No .blocked files (clean state)
   - Multiple .blocked files
   - Mixed .blocked and settings.json
   - Invalid .blocked file format

3. **Settings Manager**:
   - Concurrent writes (race condition)
   - Disk full scenario
   - Permission denied
   - Invalid JSON recovery

**Test File Locations**:
```
tests/unit/item-list.test.ts           # Viewport tests
tests/integration/migration-flow.test.ts # Migration scenarios
tests/unit/settings-manager.test.ts     # Atomic write edge cases
```

**Validation**:
- [ ] All critical gaps filled with tests
- [ ] New tests pass
- [ ] Coverage increased to >85%
- [ ] No new test flakiness introduced

**Dependencies**: Task 3.3 (manual testing complete)

---

## Phase 4: Documentation Verification
**Agent**: documentation-architect, technical-writer
**Duration**: 2-3 hours
**Priority**: Medium-High

### Task 4.1: README Accuracy Check
**Agent**: documentation-reviewer

**Review Sections**:
1. **Installation**: Are npm/npx commands current?
2. **Usage**: Do keyboard shortcuts match implementation?
3. **TUI Layout**: Does ASCII art match actual rendering?
4. **Migration Guide**: v0.3.0 → v0.4.0 instructions accurate?
5. **Troubleshooting**: Are solutions current and helpful?

**Actions**:
1. Read README.md line-by-line
2. Compare with actual TUI behavior (run app)
3. Test all documented commands
4. Verify all links work

**Validation**:
- [ ] All commands tested and working
- [ ] Screenshots/ASCII art match current UI
- [ ] Migration instructions accurate
- [ ] All links functional (no 404s)

**Dependencies**: Task 3.4 (all tests passing)

---

### Task 4.2: CHANGELOG Completeness
**Agent**: release-manager, changelog-specialist

**Verify v0.4.2 Entry**:
- [ ] Fixed section lists all bug fixes
- [ ] Changed section lists all enhancements
- [ ] Technical Details section accurate
- [ ] All commit messages represented

**Actions**:
1. Compare CHANGELOG v0.4.2 with git log
2. Ensure all user-facing changes documented
3. Verify technical accuracy of descriptions
4. Check semantic versioning correctness

**Validation**:
- [ ] All commits since v0.4.1 represented
- [ ] User-facing changes clearly described
- [ ] Technical details accurate
- [ ] Version numbering follows semver

**Dependencies**: Task 4.1 (README verified)

---

### Task 4.3: API Documentation Update
**Agent**: api-documenter

**Files to Review**:
```
docs/api.md                    # Programmatic API reference
docs/developer-guide.md        # Contributing guidelines
docs/MEMORY_SYSTEMS.md         # Memory clarification
docs/migration-v0.4.0.md       # Migration guide
```

**Review Criteria**:
1. **API Examples**: Do code examples work?
2. **Type Signatures**: Match current implementation?
3. **Developer Guide**: Setup instructions current?
4. **Memory Systems**: Accurate after v0.4.0 changes?

**Validation**:
- [ ] All API examples tested and working
- [ ] Type signatures match implementation
- [ ] Setup instructions verified
- [ ] Memory systems doc current

**Dependencies**: Task 4.2 (CHANGELOG verified)

---

### Task 4.4: Inline Code Comments
**Agent**: code-documenter

**Review Areas**:
1. **Complex Algorithms**: Is viewport logic well-commented?
2. **Public APIs**: Do exported functions have JSDoc?
3. **Type Definitions**: Are interfaces documented?
4. **Configuration**: Are settings explained?

**Focus Files**:
```
src/tui/components/item-list.tsx    # Viewport algorithm
src/core/settings-manager.ts        # Atomic write pattern
src/core/migration-manager.ts       # Migration logic
src/utils/token-estimator.ts        # Token calculation
```

**Validation**:
- [ ] All public functions have JSDoc
- [ ] Complex algorithms have explanatory comments
- [ ] Type definitions have descriptions
- [ ] Configuration options documented

**Dependencies**: Task 4.3 (API docs verified)

---

## Phase 5: Security Audit
**Agent**: security-engineer, vulnerability-analyst
**Duration**: 2-3 hours
**Priority**: High

### Task 5.1: Dependency Vulnerability Scan
**Agent**: security-scanner

**Actions**:
```bash
# Audit dependencies
npm audit

# Check for outdated packages with known vulnerabilities
npm outdated

# Use additional security tools
npx snyk test  # If available
```

**Review Focus**:
- Direct dependencies (package.json)
- Transitive dependencies (package-lock.json)
- Known CVEs in dependency tree

**Validation**:
- [ ] Zero high/critical vulnerabilities
- [ ] All medium vulnerabilities assessed
- [ ] Dependency versions documented
- [ ] Update plan for vulnerable packages

**Dependencies**: Task 4.4 (documentation complete)

---

### Task 5.2: File System Security Review
**Agent**: security-expert, code-security-analyst

**Review Areas**:
1. **Path Traversal**: Are all file paths validated?
2. **Permission Checks**: Do we verify read/write access?
3. **Atomic Writes**: Is rollback working correctly?
4. **Input Validation**: Are user inputs sanitized?

**Critical Functions**:
```typescript
// Path validation
src/core/config-loader.ts:findClaudeJson()
src/core/memory-loader.ts:loadMemoryFiles()
src/core/agent-manager.ts:discoverAgents()

// Atomic operations
src/utils/atomic-write.ts:atomicWrite()
src/core/settings-manager.ts:updateSettings()
```

**Validation**:
- [ ] No path traversal vulnerabilities
- [ ] All file operations check permissions
- [ ] Atomic writes tested with failures
- [ ] User input properly sanitized

**Dependencies**: Task 5.1 (dependencies scanned)

---

### Task 5.3: Sensitive Data Handling
**Agent**: privacy-engineer, data-security-specialist

**Review Focus**:
1. **Settings Storage**: Is settings.json properly secured?
2. **Error Messages**: Do errors leak sensitive paths?
3. **Logging**: Are there debug logs with sensitive data?
4. **Git Ignore**: Is .claude/ properly ignored?

**Validation Checklist**:
- [ ] .claude/settings.json has appropriate permissions (644)
- [ ] No credentials or secrets in code
- [ ] Error messages sanitized (no full paths)
- [ ] .gitignore includes .claude/ patterns

**Dependencies**: Task 5.2 (filesystem security verified)

---

## Phase 6: Merge Execution
**Agent**: git-specialist, merge-coordinator
**Duration**: 1-2 hours
**Priority**: Critical

### Task 6.1: Pre-Merge Verification
**Agent**: release-coordinator

**Final Checklist**:
```bash
# All phases complete
✓ Phase 1: Code Cleanup
✓ Phase 2: Quality Review
✓ Phase 3: Test Validation
✓ Phase 4: Documentation Verification
✓ Phase 5: Security Audit

# Git status clean
git status  # Should show only intended changes

# Tests passing
npm test    # 100% pass rate

# Build succeeds
npm run build  # No errors

# Lint clean
npm run lint   # Zero warnings
```

**Validation**:
- [ ] All previous phases completed
- [ ] Git working directory clean
- [ ] All tests passing
- [ ] Build artifacts current
- [ ] Lint warnings resolved

**Dependencies**: All previous tasks complete

---

### Task 6.2: Create Merge Preparation Commit
**Agent**: git-expert

**Actions**:
```bash
# Stage all cleanup changes
git add -A

# Commit with descriptive message
git commit -m "chore: pre-merge cleanup and quality improvements

- Remove backup files (app-old.tsx, app.tsx.backup)
- Eliminate dead code and unused imports
- Add missing test coverage for viewport logic
- Update documentation for v0.4.2 accuracy
- Pass security audit (zero critical vulnerabilities)

All quality gates passed:
- Tests: 100% pass rate, >85% coverage
- Lint: Zero warnings
- Build: No errors
- Docs: Current and accurate"
```

**Validation**:
- [ ] Commit message follows conventional commits
- [ ] All changes staged and committed
- [ ] Commit hash documented for rollback

**Dependencies**: Task 6.1 (pre-merge verification complete)

---

### Task 6.3: Merge to Main with Verification
**Agent**: merge-specialist, ci-coordinator

**Merge Strategy**: Merge commit (preserve feature branch history)

**Actions**:
```bash
# Ensure on feature branch
git checkout 004-comprehensive-context-management

# Fetch latest main
git fetch origin main

# Check for conflicts
git merge-base HEAD origin/main
git diff origin/main...HEAD

# Switch to main
git checkout main
git pull origin main

# Merge feature branch
git merge --no-ff 004-comprehensive-context-management \
  -m "Merge branch '004-comprehensive-context-management'

Includes:
- v0.4.2 critical viewport calculation fix
- Visual enhancements (cyan/bold styling)
- Comprehensive pre-merge quality improvements
- Full test suite validation
- Security audit passed

All quality gates verified before merge."

# Verify merge
npm install  # In case package-lock changed
npm test     # Confirm tests still pass
npm run build # Confirm build succeeds
```

**Validation**:
- [ ] Merge completed without conflicts
- [ ] Tests pass on main branch
- [ ] Build succeeds on main branch
- [ ] No regressions introduced

**Dependencies**: Task 6.2 (preparation commit created)

---

### Task 6.4: Post-Merge Verification
**Agent**: qa-engineer, smoke-tester

**Smoke Tests**:
```bash
# Install globally from main branch
npm install -g .

# Run in test project
cd /tmp/test-project
mcp-toggle

# Verify core functionality:
1. TUI renders correctly
2. All navigation keys work
3. Viewport scrolling works with 50+ items
4. Blocking/unblocking persists to settings.json
5. Token estimates display in cyan/bold
```

**Validation**:
- [ ] Global install successful
- [ ] TUI renders without errors
- [ ] All core features working
- [ ] No regressions from main merge

**Dependencies**: Task 6.3 (merge completed)

---

### Task 6.5: Cleanup Feature Branch
**Agent**: git-maintainer

**Actions**:
```bash
# Verify merge is in main
git log main --oneline | grep "Merge branch '004"

# Delete local feature branch
git branch -d 004-comprehensive-context-management

# Delete remote feature branch (if pushed)
git push origin --delete 004-comprehensive-context-management

# Tag the merge commit
git tag -a v0.4.2-merged -m "v0.4.2 merged to main after full quality review"
git push origin v0.4.2-merged
```

**Validation**:
- [ ] Feature branch deleted locally
- [ ] Feature branch deleted remotely (if applicable)
- [ ] Merge commit tagged
- [ ] Tag pushed to origin

**Dependencies**: Task 6.4 (post-merge verification complete)

---

## Rollback Plan

In case issues are discovered after merge:

### Emergency Rollback Steps
```bash
# Find merge commit hash
git log main --oneline | head -5

# Revert the merge (creates new commit)
git revert -m 1 <merge-commit-hash>

# Push rollback
git push origin main

# Notify team
# Document issue in GitHub issue
```

### Re-Merge Strategy (After Fix)
1. Checkout feature branch: `git checkout 004-comprehensive-context-management`
2. Fix identified issue
3. Re-run all quality gates (Phases 1-5)
4. Re-attempt merge (Phase 6)

---

## Success Criteria

### Code Quality
- ✅ Zero backup files in repository
- ✅ Zero dead code or unused imports
- ✅ Zero linting warnings
- ✅ Clean build (no errors)

### Test Quality
- ✅ 100% test pass rate
- ✅ >85% line coverage
- ✅ All critical paths tested
- ✅ Manual TUI testing complete

### Documentation Quality
- ✅ README accurate and current
- ✅ CHANGELOG complete for v0.4.2
- ✅ API docs match implementation
- ✅ Inline comments for complex code

### Security Quality
- ✅ Zero critical vulnerabilities
- ✅ No path traversal risks
- ✅ Proper file permissions
- ✅ Input validation present

### Merge Quality
- ✅ No merge conflicts
- ✅ Tests pass on main
- ✅ No regressions introduced
- ✅ Rollback plan documented

---

## Timeline Estimate

| Phase | Duration | Agent | Dependencies |
|-------|----------|-------|--------------|
| **Phase 1: Code Cleanup** | 2-3 hours | cleanup-specialist | None |
| **Phase 2: Quality Review** | 4-6 hours | refactoring-expert | Phase 1 |
| **Phase 3: Test Validation** | 3-4 hours | test-engineer | Phase 2 |
| **Phase 4: Documentation** | 2-3 hours | documentation-architect | Phase 3 |
| **Phase 5: Security Audit** | 2-3 hours | security-engineer | Phase 4 |
| **Phase 6: Merge Execution** | 1-2 hours | merge-coordinator | Phase 5 |
| **Total** | **14-21 hours** | Multiple specialists | Sequential |

**Recommended Approach**: Execute phases sequentially over 2-3 days to allow for thorough review and testing.

---

## Agent Assignments

### Primary Agents by Phase

**Phase 1: Code Cleanup**
- cleanup-specialist (lead)
- code-organizer
- build-engineer

**Phase 2: Quality Review**
- refactoring-expert (lead)
- quality-engineer
- frontend-architect
- typescript-expert
- reliability-engineer

**Phase 3: Test Validation**
- test-engineer (lead)
- qa-specialist
- test-architect
- coverage-analyst
- ux-specialist
- test-writer

**Phase 4: Documentation Verification**
- documentation-architect (lead)
- technical-writer
- api-documenter
- code-documenter

**Phase 5: Security Audit**
- security-engineer (lead)
- vulnerability-analyst
- security-expert
- privacy-engineer

**Phase 6: Merge Execution**
- git-specialist (lead)
- merge-coordinator
- release-coordinator
- ci-coordinator
- qa-engineer
- smoke-tester
- git-maintainer

---

## Appendix: Quality Gates Reference

### Code Quality Gates
1. No backup files in repository
2. No dead code or unused imports
3. Zero linting warnings
4. TypeScript strict mode clean
5. All TODOs documented or resolved

### Test Quality Gates
1. 100% test pass rate (no failures)
2. >85% line coverage
3. >75% branch coverage
4. No test flakiness (3 consecutive runs)
5. Manual TUI testing complete

### Documentation Gates
1. README commands verified working
2. CHANGELOG complete and accurate
3. API docs match implementation
4. Migration guide tested

### Security Gates
1. Zero critical npm vulnerabilities
2. Zero high npm vulnerabilities
3. No path traversal risks
4. Proper file permissions set

### Merge Gates
1. All previous gates passed
2. No merge conflicts
3. Tests pass on main after merge
4. Build succeeds on main after merge
5. Smoke tests pass

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Owner**: Development Team
**Review Status**: Ready for Execution

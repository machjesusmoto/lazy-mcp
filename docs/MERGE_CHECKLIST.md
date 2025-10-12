# Pre-Merge Checklist
**Quick Reference for Pre-Merge Preparation**
**Branch**: `004-comprehensive-context-management` → `main`
**Version**: v0.4.2

> Use this checklist while executing the full [Pre-Merge Preparation Plan](PRE_MERGE_PREPARATION.md)

---

## ✅ Phase 1: Code Cleanup (2-3 hours)

### Task 1.1: Remove Backup Files
- [ ] Delete `src/tui/app-old.tsx`
- [ ] Delete `src/tui/app.tsx.backup`
- [ ] Run `npm run build` to clear compiled backups
- [ ] Verify `dist/` contains no `-old` files
- [ ] Commit: `git commit -m "chore: remove backup files"`

### Task 1.2: Remove Dead Code
- [ ] Run `npm run lint` and fix all warnings
- [ ] Search for commented code: `grep -r "^[[:space:]]*//.*function" src/`
- [ ] Remove commented blocks
- [ ] Find TODOs: `grep -rn "TODO\|FIXME" src/`
- [ ] Document or resolve all TODOs
- [ ] Commit: `git commit -m "chore: remove dead code and comments"`

### Task 1.3: Verify Build
- [ ] Clean build: `rm -rf dist/ && npm run build`
- [ ] Verify build completes <30s
- [ ] Check dist/ mirrors src/ structure
- [ ] No TypeScript errors or warnings

**Phase 1 Complete**: ✅ All backup files removed, no dead code, clean build

---

## ✅ Phase 2: Quality Review (4-6 hours)

### Task 2.1: Viewport Logic Review
- [ ] Review `src/tui/components/item-list.tsx` algorithm
- [ ] Verify section header counting (3 lines)
- [ ] Check backwards scrolling logic
- [ ] Test performance with 100+ items
- [ ] Document any refactoring recommendations

### Task 2.2: Component Architecture
- [ ] Review all components in `src/tui/components/`
- [ ] Check for prop drilling (max 2 levels)
- [ ] Verify single responsibility principle
- [ ] Identify reusability improvements
- [ ] Run React DevTools performance analysis

### Task 2.3: Type Safety Audit
- [ ] Find `any` types: `grep -rn ": any" src/`
- [ ] Review type assertions: `grep -rn " as " src/`
- [ ] Run strict mode: `npx tsc --noEmit --strict`
- [ ] Document justified type assertions
- [ ] Eliminate or justify all `any` types

### Task 2.4: Error Handling Review
- [ ] Check all file operations have try-catch
- [ ] Verify error messages are user-friendly
- [ ] Test rollback mechanisms
- [ ] Ensure graceful degradation on errors

**Phase 2 Complete**: ✅ Code quality verified, architecture solid, type safety confirmed

---

## ✅ Phase 3: Test Validation (3-4 hours)

### Task 3.1: Run Full Test Suite
- [ ] Run `npm run test:coverage`
- [ ] Verify 100% test pass rate
- [ ] Check coverage: >80% lines, >70% branches
- [ ] Run tests 3 times to check for flakiness
- [ ] Test run time <30 seconds

### Task 3.2: Identify Test Gaps
- [ ] Open coverage report: `coverage/lcov-report/index.html`
- [ ] List uncovered code sections
- [ ] Identify missing edge case tests
- [ ] Check viewport logic has comprehensive tests
- [ ] Document test gaps with priorities

### Task 3.3: Manual TUI Testing
- [ ] Test viewport with 5, 20, 50, 100 items
- [ ] Test terminal sizes: 80x24, 120x40, 200x60
- [ ] Verify all keyboard shortcuts work
- [ ] Test blocking/unblocking all item types
- [ ] Verify migration from .blocked files works
- [ ] Check visual elements (cyan/bold tokens)

### Task 3.4: Write Missing Tests
- [ ] Add viewport edge case tests
- [ ] Add migration scenario tests
- [ ] Add settings manager race condition tests
- [ ] Run new tests to verify they pass
- [ ] Re-check coverage (target >85%)

**Phase 3 Complete**: ✅ All tests pass, coverage >85%, manual testing verified

---

## ✅ Phase 4: Documentation (2-3 hours)

### Task 4.1: README Verification
- [ ] Test all installation commands
- [ ] Verify keyboard shortcuts match code
- [ ] Test all usage examples
- [ ] Check TUI ASCII art matches actual UI
- [ ] Verify all links work (no 404s)

### Task 4.2: CHANGELOG Review
- [ ] Compare v0.4.2 entry with git log
- [ ] Ensure all commits represented
- [ ] Verify technical accuracy
- [ ] Check semantic versioning correctness

### Task 4.3: API Documentation
- [ ] Test all code examples in `docs/api.md`
- [ ] Verify type signatures match code
- [ ] Test developer setup instructions
- [ ] Review `docs/MEMORY_SYSTEMS.md` accuracy

### Task 4.4: Inline Comments
- [ ] Verify JSDoc on all public functions
- [ ] Check comments on complex algorithms
- [ ] Ensure type definitions documented
- [ ] Review configuration option docs

**Phase 4 Complete**: ✅ All documentation current and accurate

---

## ✅ Phase 5: Security Audit (2-3 hours)

### Task 5.1: Dependency Scan
- [ ] Run `npm audit`
- [ ] Check `npm outdated`
- [ ] Document any vulnerabilities
- [ ] Create update plan for vulnerable packages
- [ ] Zero high/critical vulnerabilities

### Task 5.2: File System Security
- [ ] Review path validation in loaders
- [ ] Check permission checks on file operations
- [ ] Test atomic write rollback
- [ ] Verify input sanitization
- [ ] No path traversal vulnerabilities

### Task 5.3: Sensitive Data
- [ ] Verify `.claude/settings.json` has 644 permissions
- [ ] Check error messages don't leak paths
- [ ] Ensure no credentials in code
- [ ] Verify `.gitignore` includes `.claude/`

**Phase 5 Complete**: ✅ Security audit passed, zero critical vulnerabilities

---

## ✅ Phase 6: Merge Execution (1-2 hours)

### Task 6.1: Pre-Merge Verification
- [ ] All previous phases complete ✓
- [ ] `git status` clean
- [ ] `npm test` passes 100%
- [ ] `npm run build` succeeds
- [ ] `npm run lint` zero warnings

### Task 6.2: Preparation Commit
- [ ] Stage all changes: `git add -A`
- [ ] Create commit with detailed message
- [ ] Note commit hash for rollback

### Task 6.3: Merge to Main
- [ ] Fetch latest main: `git fetch origin main`
- [ ] Check for conflicts: `git diff origin/main...HEAD`
- [ ] Switch to main: `git checkout main && git pull`
- [ ] Merge with message: `git merge --no-ff 004-comprehensive-context-management`
- [ ] Run `npm install` (in case of package-lock changes)
- [ ] Run `npm test` on main
- [ ] Run `npm run build` on main

### Task 6.4: Post-Merge Verification
- [ ] Install globally: `npm install -g .`
- [ ] Create test project: `cd /tmp/test-project`
- [ ] Run `mcp-toggle`
- [ ] Verify TUI renders correctly
- [ ] Test all navigation keys
- [ ] Test viewport scrolling with 50+ items
- [ ] Test blocking/unblocking
- [ ] Verify visual enhancements (cyan/bold)

### Task 6.5: Cleanup
- [ ] Verify merge in main: `git log main --oneline | grep "Merge branch"`
- [ ] Delete local branch: `git branch -d 004-comprehensive-context-management`
- [ ] Delete remote branch (if applicable)
- [ ] Tag merge commit: `git tag -a v0.4.2-merged -m "..."`
- [ ] Push tag: `git push origin v0.4.2-merged`

**Phase 6 Complete**: ✅ Merge successful, verified, and cleaned up

---

## 🎯 Final Verification

### All Quality Gates Passed
- ✅ Code Quality: No backup files, no dead code, lint clean
- ✅ Test Quality: 100% pass rate, >85% coverage
- ✅ Documentation: README accurate, CHANGELOG complete
- ✅ Security: Zero critical vulnerabilities
- ✅ Merge: No conflicts, tests pass on main

### Success Criteria Met
- ✅ Feature branch merged to main
- ✅ All tests passing on main branch
- ✅ No regressions introduced
- ✅ Documentation current
- ✅ Security verified

---

## 🚨 Rollback Plan (If Needed)

If issues discovered after merge:

```bash
# Find merge commit
git log main --oneline | head -5

# Revert merge (creates new commit)
git revert -m 1 <merge-commit-hash>

# Push rollback
git push origin main

# Document issue in GitHub
```

---

## 📊 Metrics

Track these metrics during execution:

| Metric | Target | Actual |
|--------|--------|--------|
| Test Pass Rate | 100% | ___ |
| Line Coverage | >85% | ___ |
| Branch Coverage | >75% | ___ |
| Lint Warnings | 0 | ___ |
| Build Time | <30s | ___ |
| Critical Vulnerabilities | 0 | ___ |
| High Vulnerabilities | 0 | ___ |
| Total Duration | 14-21h | ___ |

---

## 📝 Notes

Use this space to track issues or observations during execution:

-
-
-

---

**Last Updated**: 2025-10-11
**Status**: Ready for Execution
**Full Plan**: [PRE_MERGE_PREPARATION.md](PRE_MERGE_PREPARATION.md)

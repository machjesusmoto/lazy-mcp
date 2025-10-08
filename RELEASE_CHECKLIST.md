# Release Checklist for MCP Toggle v0.1.0

Complete checklist for releasing MCP Toggle to GitHub and npm.

## Pre-Release Verification ✅

All tasks completed:

- [x] **78 tests passing** (8 test suites)
- [x] **Build successful** (TypeScript → JavaScript in dist/)
- [x] **Documentation complete**:
  - [x] README.md with examples and troubleshooting
  - [x] CONTRIBUTING.md with development workflow
  - [x] CHANGELOG.md documenting v0.1.0
  - [x] LICENSE (MIT)
  - [x] GITHUB_SETUP.md guide
  - [x] NPM_PUBLISH.md guide
- [x] **Code quality**:
  - [x] All public functions have JSDoc
  - [x] Input validation on all core functions
  - [x] Error boundaries for TUI components
  - [x] Performance metrics (warns if >2s)
- [x] **Package configuration**:
  - [x] package.json with correct files array
  - [x] .npmignore excluding dev files
  - [x] bin/mcp-toggle executable configured
- [x] **CI/CD**:
  - [x] GitHub Actions workflow (.github/workflows/ci.yml)
  - [x] Tests on Node 18 and 20

## GitHub Setup (Do This First)

### Option 1: Using the Setup Script (Recommended)

```bash
cd /home/dtaylor/motodev/projects/mcp_toggle

# Run setup script with your GitHub username
./setup-github.sh YOUR_GITHUB_USERNAME

# Follow the instructions printed by the script
```

### Option 2: Manual Setup

Follow the detailed guide in [GITHUB_SETUP.md](GITHUB_SETUP.md).

## Release Steps

### 1. Create GitHub Repository

- [ ] Go to https://github.com/new
- [ ] Repository name: `mcp-toggle`
- [ ] Description: `CLI tool to manage Claude Code MCP servers and memory files`
- [ ] Visibility: **Public**
- [ ] **DO NOT** initialize with README, .gitignore, or license (we have these)
- [ ] Click "Create repository"

### 2. Push Code to GitHub

```bash
# If you used setup-github.sh, just run:
git push -u origin main

# If doing manually, follow GITHUB_SETUP.md
```

### 3. Verify CI Pipeline

- [ ] Go to https://github.com/YOUR_USERNAME/mcp-toggle/actions
- [ ] Verify CI workflow runs successfully
- [ ] Check both Node 18 and 20 tests pass

### 4. Configure Repository Settings

On GitHub repository settings page:

- [ ] Add topics: `claude-code`, `mcp`, `cli`, `tui`, `typescript`, `npm-package`
- [ ] Enable "Automatically delete head branches"
- [ ] (Optional) Add branch protection rules for `main`

### 5. Create GitHub Release

- [ ] Go to https://github.com/YOUR_USERNAME/mcp-toggle/releases/new
- [ ] Click "Choose a tag" → type `v0.1.0` → "Create new tag"
- [ ] Release title: `v0.1.0 - Initial Release`
- [ ] Description: Copy from CHANGELOG.md (sections under [0.1.0])
- [ ] Click "Publish release"

## npm Publishing (Do After GitHub)

### 1. Verify npm Account

- [ ] Have npm account (create at https://www.npmjs.com/signup)
- [ ] Email verified
- [ ] Two-factor authentication enabled

### 2. Pre-Publish Checks

```bash
cd /home/dtaylor/motodev/projects/mcp_toggle

# Clean install
rm -rf dist node_modules
npm install

# Run all checks
npm run lint
npm run build
npm test

# Dry run to see what will be published
npm pack --dry-run
```

### 3. Test Local Installation

```bash
# Create and test tarball
npm pack
npm install -g mcp-toggle-0.1.0.tgz
mcp-toggle --help
npm uninstall -g mcp-toggle
rm mcp-toggle-0.1.0.tgz
```

### 4. Publish to npm

```bash
# Login to npm
npm login

# Verify login
npm whoami

# Publish (requires 2FA code)
npm publish
```

### 5. Verify npm Publication

- [ ] Visit https://www.npmjs.com/package/mcp-toggle
- [ ] Test install: `npm install -g mcp-toggle`
- [ ] Test CLI: `mcp-toggle --help`
- [ ] Check version: `npm info mcp-toggle version`

## Post-Release Tasks

### Update Documentation

- [ ] Add npm badge to README.md:
  ```markdown
  [![npm version](https://badge.fury.io/js/mcp-toggle.svg)](https://www.npmjs.com/package/mcp-toggle)
  ```

- [ ] Add CI badge to README.md:
  ```markdown
  [![CI](https://github.com/YOUR_USERNAME/mcp-toggle/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/mcp-toggle/actions)
  ```

- [ ] Commit and push badge updates

### Announce Release

- [ ] GitHub Discussions (create announcement)
- [ ] Social media:
  - Twitter/X with hashtags: #ClaudeCode #MCP #CLI #TypeScript
  - Reddit: r/ClaudeAI (if appropriate)
  - Discord communities for Claude/AI tools
- [ ] Update any relevant documentation/wikis

### Monitor and Respond

- [ ] Watch GitHub for issues and PRs
- [ ] Monitor npm download stats
- [ ] Respond to community feedback
- [ ] Plan next iteration based on feedback

## Quick Reference

### Important URLs (Replace YOUR_USERNAME)

- **Repository**: https://github.com/YOUR_USERNAME/mcp-toggle
- **Issues**: https://github.com/YOUR_USERNAME/mcp-toggle/issues
- **Actions**: https://github.com/YOUR_USERNAME/mcp-toggle/actions
- **Releases**: https://github.com/YOUR_USERNAME/mcp-toggle/releases
- **npm Package**: https://www.npmjs.com/package/mcp-toggle

### Key Files

- `GITHUB_SETUP.md` - Detailed GitHub setup guide
- `NPM_PUBLISH.md` - Detailed npm publishing guide
- `CONTRIBUTING.md` - For contributors
- `CHANGELOG.md` - Version history
- `LICENSE` - MIT license

### Support Channels

For issues or questions:
- GitHub Issues: Report bugs, request features
- GitHub Discussions: Ask questions, share ideas
- Contributing: See CONTRIBUTING.md

## Success Criteria

Release is successful when:

- ✅ Code pushed to GitHub main branch
- ✅ CI pipeline passing on GitHub Actions
- ✅ v0.1.0 release created on GitHub
- ✅ Package published to npm
- ✅ Global installation works: `npm install -g mcp-toggle`
- ✅ CLI works: `mcp-toggle --help`
- ✅ Documentation accessible on GitHub
- ✅ Community can contribute (issues, PRs)

## Rollback Plan

If critical issues discovered after release:

1. **npm**: Deprecate version with message:
   ```bash
   npm deprecate mcp-toggle@0.1.0 "Critical bug found. Use v0.1.1 instead."
   ```

2. **Fix**: Create hotfix branch, fix issue, release v0.1.1

3. **GitHub**: Create new release v0.1.1 with bug fix notes

## Next Steps After v0.1.0

Consider for future releases:

- [ ] Add more comprehensive tests
- [ ] Add Windows-specific testing
- [ ] Add integration examples
- [ ] Create video tutorial
- [ ] Add telemetry (opt-in) for usage analytics
- [ ] Explore additional MCP management features
- [ ] Performance optimizations for large projects

---

**Current Status**: Ready for release! 🎉

All code, tests, and documentation are complete. Ready to push to GitHub and publish to npm.

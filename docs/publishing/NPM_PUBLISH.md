# npm Publishing Guide

Complete guide for publishing MCP Toggle to npm.

## Prerequisites

- npm account (create at https://www.npmjs.com/signup)
- Email verified on npm
- Two-factor authentication enabled (required for publishing)
- Package name `mcp-toggle` available (check at https://www.npmjs.com/package/mcp-toggle)

## Step 1: Verify Package Configuration

Check that `package.json` has correct information:

```json
{
  "name": "mcp-toggle",
  "version": "0.1.0",
  "description": "CLI tool to manage Claude Code MCP servers and memory files",
  "main": "dist/cli.js",
  "bin": {
    "mcp-toggle": "./bin/mcp-toggle"
  },
  "files": [
    "dist",
    "bin",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "keywords": [
    "claude-code",
    "mcp",
    "cli",
    "tui",
    "configuration",
    "developer-tools"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/mcp-toggle.git"
  }
}
```

## Step 2: Pre-Publish Verification

Run complete verification:

```bash
cd /home/dtaylor/motodev/projects/mcp_toggle

# Clean build
rm -rf dist node_modules
npm install

# Run all checks
npm run lint
npm run build
npm test

# Verify dist/ directory
ls -la dist/

# Verify what will be published (dry run)
npm pack --dry-run

# This shows:
# - Files to be included
# - Package size
# - Unpacked size
```

Expected output should show:
- `dist/` directory with .js and .d.ts files
- `bin/mcp-toggle` script
- `README.md`, `LICENSE`, `CHANGELOG.md`
- Total size < 500KB

## Step 3: Test Local Installation

Test the package locally before publishing:

```bash
# Create tarball
npm pack

# Install globally from tarball
npm install -g mcp-toggle-0.1.0.tgz

# Test the CLI
mcp-toggle --help
cd /tmp && mcp-toggle

# If it works, uninstall test version
npm uninstall -g mcp-toggle

# Clean up tarball
rm mcp-toggle-0.1.0.tgz
```

## Step 4: Login to npm

```bash
# Login (opens browser for authentication)
npm login

# Verify you're logged in
npm whoami

# Enable 2FA if not already enabled
npm profile enable-2fa auth-and-writes
```

## Step 5: Publish to npm

```bash
# Publish (requires 2FA code)
npm publish

# If package name is available, you'll see:
# + mcp-toggle@0.1.0
```

**First-time publish**: If the package name is already taken, you'll need to:
- Choose a different name (e.g., `@yourusername/mcp-toggle`)
- Or request the name if abandoned (https://www.npmjs.com/policies/disputes)

## Step 6: Verify Publication

```bash
# View on npm
open https://www.npmjs.com/package/mcp-toggle

# Install from npm to test
npm install -g mcp-toggle

# Test installation
mcp-toggle --help

# Check version
npm info mcp-toggle version
```

## Step 7: Post-Publish Tasks

1. **Add npm badge to README.md**:
   ```markdown
   [![npm version](https://badge.fury.io/js/mcp-toggle.svg)](https://www.npmjs.com/package/mcp-toggle)
   ```

2. **Update GitHub release** with npm install instructions

3. **Announce release**:
   - GitHub Discussions
   - Twitter/X
   - Reddit (r/ClaudeAI, r/programming)
   - Discord communities

## Future Releases

For subsequent releases:

```bash
# Update version in package.json and CHANGELOG.md
npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
npm version minor   # 0.1.0 → 0.2.0 (new features)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)

# This automatically:
# - Updates package.json version
# - Creates git tag
# - Commits the change

# Push with tags
git push && git push --tags

# Rebuild and publish
npm run build
npm test
npm publish
```

## Troubleshooting

### Error: Package name already exists

```bash
# Check if package exists
npm info mcp-toggle

# Options:
# 1. Use scoped package: @yourusername/mcp-toggle
# 2. Choose different name: mcp-toggle-cli
# 3. Request abandoned name: https://www.npmjs.com/policies/disputes
```

### Error: 402 Payment Required

You need to enable 2FA:

```bash
npm profile enable-2fa auth-and-writes
```

### Error: You must verify your email

Check email and click verification link, then try again.

### Package size too large

```bash
# Check what's being included
npm pack --dry-run

# Ensure .npmignore excludes:
# - src/ (source files)
# - tests/ (test files)
# - node_modules/
# - All dev files

# Only ship:
# - dist/ (compiled)
# - bin/ (executable)
# - README.md, LICENSE, CHANGELOG.md
```

## npm Scripts Reference

From `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src tests --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\" \"tests/**/*.{ts,tsx}\"",
    "prepublishOnly": "npm run build"
  }
}
```

The `prepublishOnly` script automatically runs before `npm publish`, ensuring you don't publish without building.

## Package Statistics

After publishing, monitor:

- **Downloads**: https://www.npmjs.com/package/mcp-toggle
- **Bundle size**: https://bundlephobia.com/package/mcp-toggle
- **Dependencies**: https://david-dm.org/yourusername/mcp-toggle

## Deprecation (if needed)

If you need to deprecate a version:

```bash
npm deprecate mcp-toggle@0.1.0 "This version has critical bugs. Please upgrade to 0.1.1"
```

## Unpublishing (emergency only)

**⚠️ Warning**: You can only unpublish within 72 hours, and only if no one depends on it.

```bash
npm unpublish mcp-toggle@0.1.0
```

After 72 hours, use deprecation instead.

---

## Quick Publish Checklist

- [ ] All tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Build successful: `npm run build`
- [ ] Version updated in package.json and CHANGELOG.md
- [ ] Git committed and tagged
- [ ] GitHub repository URLs correct in package.json
- [ ] Logged into npm: `npm whoami`
- [ ] 2FA enabled: `npm profile get`
- [ ] Dry run looks good: `npm pack --dry-run`
- [ ] Local install test passed
- [ ] Ready to publish: `npm publish`

## Success Criteria

After publishing, verify:

- ✅ Package appears on npmjs.com
- ✅ Can install globally: `npm install -g mcp-toggle`
- ✅ CLI works: `mcp-toggle --help`
- ✅ Version correct: `npm info mcp-toggle version`
- ✅ GitHub release created with same version
- ✅ CI badge shows passing on GitHub

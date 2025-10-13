# NPM Publishing Guide for lazy-mcp

This document outlines the steps to publish the lazy-mcp packages to NPM.

## Overview

The lazy-mcp monorepo contains 3 publishable packages:
1. **@lazy-mcp/plugin** - Main Claude Code plugin
2. **@lazy-mcp/shared** - Shared library used by plugin and CLI
3. **@lazy-mcp/cli** - Command-line tool

## Prerequisites

- NPM account with 2FA enabled (OTP required for publishing)
- Write access to the `@lazy-mcp` scope on NPM
- Clean git working directory (all changes committed)
- All tests passing (`npm test`)
- Build successful (`npm run build`)

## Publishing Order

**IMPORTANT**: Packages must be published in dependency order:

1. **@lazy-mcp/shared** (no dependencies on other workspace packages)
2. **@lazy-mcp/cli** (depends on @lazy-mcp/shared)
3. **@lazy-mcp/plugin** (depends on @lazy-mcp/shared)

## Step-by-Step Publishing

### 1. Verify Current State

```bash
# Ensure you're on the correct branch
git status

# Verify all tests pass
npm test

# Verify build succeeds
npm run build

# Check current versions
npm run version:check  # Shows current version in each package.json
```

### 2. Update Versions (if needed)

If this is a new release, update versions in all package.json files:

```bash
# Root package.json
# plugin/package.json
# shared/package.json
# cli/package.json

# Example: Update to 2.0.1
npm version patch --workspaces
```

### 3. Commit Version Changes

```bash
git add .
git commit -m "chore: bump version to 2.0.1"
git push
```

### 4. Publish @lazy-mcp/shared First

```bash
cd shared
npm publish --access public --otp <your-otp-code>
cd ..
```

### 5. Publish @lazy-mcp/cli

```bash
cd cli
npm publish --access public --otp <your-otp-code>
cd ..
```

### 6. Publish @lazy-mcp/plugin

```bash
cd plugin
npm publish --access public --otp <your-otp-code>
cd ..
```

### 7. Create Git Tag

```bash
git tag v2.0.1
git push --tags
```

### 8. Verify Publication

```bash
# Check that packages are published
npm view @lazy-mcp/plugin
npm view @lazy-mcp/shared
npm view @lazy-mcp/cli

# Verify installation works
npm install -g @lazy-mcp/plugin
```

## Troubleshooting

### OTP Errors

If you get an OTP error:
1. Generate a new OTP from your authenticator app
2. Try the publish command again immediately (OTP expires quickly)

### Version Already Exists

If version already exists on NPM:
1. Bump version number in package.json files
2. Commit the change
3. Try publishing again

### Permission Denied

Ensure you have:
1. NPM login active (`npm whoami` to check)
2. Access to @lazy-mcp scope (`npm access ls-collaborators @lazy-mcp`)
3. Run `npm login` if needed

### Workspace Dependency Issues

If CLI or plugin can't find @lazy-mcp/shared after publishing:
1. Ensure @lazy-mcp/shared was published successfully
2. Wait a few minutes for NPM registry to update
3. Try publishing dependent packages again

## Post-Publishing Checklist

- [ ] Verify all 3 packages appear on NPM
- [ ] Test installation: `npm install -g @lazy-mcp/plugin`
- [ ] Test CLI: `lazy-mcp --version`
- [ ] Update GitHub release notes
- [ ] Update README with new installation instructions
- [ ] Announce on relevant channels

## Quick Reference

```bash
# Full publishing workflow (with OTP)
cd shared && npm publish --access public --otp <code> && cd ..
cd cli && npm publish --access public --otp <code> && cd ..
cd plugin && npm publish --access public --otp <code> && cd ..
git tag v2.0.1 && git push --tags
```

## NPM Scripts Reference

```bash
npm run build              # Build all workspaces
npm test                   # Run all tests
npm run lint              # Lint all workspaces
npm run clean             # Clean build artifacts
npm install               # Install/update dependencies
```

## Notes

- The `--access public` flag is required for scoped packages (@lazy-mcp/*)
- OTP codes expire in ~30 seconds, generate fresh ones for each publish
- Publishing fails if version already exists (increment version first)
- Dry run is available: `npm publish --dry-run` to preview without publishing

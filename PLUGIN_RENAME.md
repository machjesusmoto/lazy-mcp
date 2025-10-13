# Plugin Package Rename

## Issue Encountered

When attempting to publish `lazy-mcp` to NPM, we discovered the name was already taken by GitLab's search team for their MCP proxy experiment.

## Solution

Renamed the plugin package to use the `@lazy-mcp` scope:
- **Old name**: `lazy-mcp`
- **New name**: `@lazy-mcp/plugin`

## Changes Made

### 1. Package Name
- Updated `plugin/package.json`: `"name": "@lazy-mcp/plugin"`

### 2. Documentation
- Updated `README.md`: Installation command now `npm install -g @lazy-mcp/plugin`
- Updated `NPM_PUBLISHING.md`: All references changed to `@lazy-mcp/plugin`

### 3. Verification
- ✅ Build successful: All workspaces compile
- ✅ Tests passing: 294 tests across all workspaces
- ✅ Version check working

## Current Package Structure

All packages now use the `@lazy-mcp` scope:

1. **@lazy-mcp/plugin** v2.0.1 - Claude Code plugin
2. **@lazy-mcp/shared** v2.0.1 - Shared library
3. **@lazy-mcp/cli** v0.5.3 - Command-line tool

## Publishing Instructions

You can now publish the plugin successfully:

```bash
cd plugin
npm publish --access public --otp <your-otp-code>
cd ..
```

The error should be resolved as the package is now under your `@lazy-mcp` organization scope.

## Verification

After publishing, verify with:
```bash
npm view @lazy-mcp/plugin
```

## Notes

- The GitLab package `lazy-mcp` (v1.1.4) remains on NPM
- Our plugin is now clearly namespaced under `@lazy-mcp`
- This actually provides better organization and branding
- No functionality changes - purely a naming update

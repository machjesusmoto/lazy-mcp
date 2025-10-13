# Ready to Publish - Quick Start Guide

## Current Status

✅ **All packages renamed and ready**
- `@lazy-mcp/plugin` v2.0.1
- `@lazy-mcp/shared` v2.0.1
- `@lazy-mcp/cli` v0.5.3

✅ **GitHub Actions configured**
- Publish workflow created
- CI workflow updated
- NPM_TOKEN secret added

✅ **Tests passing**
- 294 tests across all workspaces
- Build successful
- Ready for publication

## Quick Publish Commands

### Option A: Automated via GitHub Actions (Recommended)

**Step 1: Test with Manual Workflow Run**
```bash
# Go to: https://github.com/machjesusmoto/lazy-mcp/actions
# Click: "Publish to NPM" workflow
# Click: "Run workflow" dropdown
# Click: Green "Run workflow" button
# Watch it publish all 3 packages automatically
```

**Step 2: Verify on NPM**
```bash
npm view @lazy-mcp/plugin
npm view @lazy-mcp/shared
npm view @lazy-mcp/cli
```

**Step 3: Create Release (Optional, for future publishes)**
```bash
gh release create v2.0.1 \
  --title "v2.0.1 - Initial Release" \
  --notes "First automated release of lazy-mcp

## Features
- Agent-driven lazy-loading for Claude Code MCP tools
- Intelligent context optimization
- Registry-based tool recommendations
- Profile support for workflow management

## Packages
- @lazy-mcp/plugin v2.0.1
- @lazy-mcp/shared v2.0.1
- @lazy-mcp/cli v0.5.3"
```

### Option B: Manual Publish (If GitHub Actions Issues)

```bash
# Only use if automated workflow fails
cd shared && npm publish --access public --otp <code>
cd ../cli && npm publish --access public --otp <code>
cd ../plugin && npm publish --access public --otp <code>
cd ..
git tag v2.0.1 && git push --tags
```

## Verification Checklist

After publishing, verify:

- [ ] Visit https://www.npmjs.com/package/@lazy-mcp/plugin
- [ ] Check for green "provenance" badge (from GitHub Actions)
- [ ] Visit https://www.npmjs.com/package/@lazy-mcp/shared
- [ ] Visit https://www.npmjs.com/package/@lazy-mcp/cli
- [ ] Test CLI installation: `npm install -g @lazy-mcp/cli`
- [ ] Check CLI works: `lazy-mcp --version`
- [ ] Test plugin installation: `npm install -g @lazy-mcp/plugin`
- [ ] Plugin should be auto-detected by Claude Code

**Note**: The CLI package (`@lazy-mcp/cli`) provides the `lazy-mcp` command. The plugin package (`@lazy-mcp/plugin`) is for Claude Code integration and doesn't provide a CLI command.

## What Happens During Automated Publish

1. **Checkout** - Gets latest code from main branch
2. **Setup** - Installs Node.js 18
3. **Install** - Runs `npm ci` to install dependencies
4. **Test** - Runs all 294 tests (must pass)
5. **Build** - Compiles all TypeScript packages
6. **Publish Shared** - Publishes @lazy-mcp/shared with provenance
7. **Publish CLI** - Publishes @lazy-mcp/cli with provenance
8. **Publish Plugin** - Publishes @lazy-mcp/plugin with provenance
9. **Summary** - Creates job summary with results

Total time: ~2-3 minutes

## Troubleshooting

### If workflow fails:
1. Check Actions tab for error logs
2. Common issues:
   - Tests failing → Fix locally and push
   - Version already exists → Bump version in package.json files
   - NPM_TOKEN expired → Generate new token, update secret

### If you see "already published" error:
The packages may have been published in a previous attempt. Check:
```bash
npm view @lazy-mcp/plugin version
npm view @lazy-mcp/shared version
npm view @lazy-mcp/cli version
```

If versions match (2.0.1, 2.0.1, 0.5.3), they're already published!

## Post-Publish Tasks

After successful publish:

1. **Update README badges** (optional)
   ```markdown
   [![npm version](https://img.shields.io/npm/v/@lazy-mcp/plugin.svg)](https://www.npmjs.com/package/@lazy-mcp/plugin)
   ```

2. **Announce** - Share on relevant channels

3. **Monitor** - Watch for issues/feedback

4. **Document** - Update any external documentation

## For Future Releases

Once this initial publish is successful, future releases are even easier:

```bash
# 1. Bump versions in package.json files
# 2. Commit changes
# 3. Create release:
gh release create v2.0.2 --generate-notes

# That's it! Automatic publish happens.
```

---

**Everything is ready to go!** Just trigger the workflow when you return.

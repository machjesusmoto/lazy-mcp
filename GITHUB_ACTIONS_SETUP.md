# GitHub Actions Setup for Automated NPM Publishing

## Overview

This guide will help you set up automated NPM publishing using GitHub Actions. When you create a release on GitHub, the packages will automatically be published to NPM.

## Prerequisites

1. ✅ GitHub repository with admin access
2. ✅ NPM account with the `@lazy-mcp` organization
3. ⚠️ NPM Access Token (needs to be created)

## Step 1: Create NPM Access Token

### Option A: Using NPM Website (Recommended)
1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click "Generate New Token" → "Classic Token"
3. Select **"Automation"** type (bypasses 2FA for CI/CD)
4. Give it a name like "GitHub Actions - lazy-mcp"
5. Copy the token (you won't see it again!)

### Option B: Using NPM CLI
```bash
npm token create --type=automation
```

**IMPORTANT**:
- Automation tokens bypass 2FA (required for CI/CD)
- Keep this token secret - treat it like a password
- It has full access to publish under your account

## Step 2: Add Token to GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste your NPM automation token
6. Click **"Add secret"**

## Step 3: Review the Publish Workflow

The workflow file is already created at `.github/workflows/publish.yml`. It will:

1. ✅ Run on GitHub releases (automatic)
2. ✅ Run on manual trigger (workflow_dispatch)
3. ✅ Install dependencies and run tests
4. ✅ Build all packages
5. ✅ Publish in correct order (shared → cli → plugin)
6. ✅ Use NPM provenance for security

### Triggers

**Automatic (Recommended):**
- Create a GitHub release → packages auto-publish

**Manual:**
- Go to Actions tab → "Publish to NPM" → "Run workflow"

## Step 4: Update CI Workflow

Your existing `.github/workflows/ci.yml` has outdated checks for the old structure. Update it:

```yaml
# Replace the old checks with these:
      - name: Verify plugin build
        run: |
          if [ ! -d "plugin/dist" ]; then
            echo "Error: plugin/dist/ directory not created by build"
            exit 1
          fi

      - name: Verify CLI bin script
        working-directory: ./cli
        run: |
          if [ ! -f "bin/lazy-mcp" ]; then
            echo "Error: bin/lazy-mcp script not found"
            exit 1
          fi

      - name: Verify shared build
        run: |
          if [ ! -d "shared/dist" ]; then
            echo "Error: shared/dist/ directory not created by build"
            exit 1
          fi
```

## Step 5: Test the Setup

### Test Manually First
```bash
# Run workflow manually to test
1. Go to GitHub → Actions tab
2. Click "Publish to NPM" workflow
3. Click "Run workflow" button
4. Select branch (main)
5. Click green "Run workflow" button
```

### Test with Release (Production)
```bash
# Create a release to trigger auto-publish
1. Go to GitHub → Releases
2. Click "Draft a new release"
3. Create new tag: v2.0.1
4. Title: "v2.0.1"
5. Generate release notes (optional)
6. Click "Publish release"
7. Watch Actions tab for automatic publish
```

## Workflow Features

### Security
- ✅ Uses `id-token: write` for NPM provenance
- ✅ Provenance creates immutable build records
- ✅ Shows GitHub Actions as verified publisher on NPM
- ✅ Secrets never exposed in logs

### Publishing Order
The workflow publishes in dependency order:
1. `@lazy-mcp/shared` (no dependencies)
2. `@lazy-mcp/cli` (depends on shared)
3. `@lazy-mcp/plugin` (depends on shared)

### Error Handling
- If any package fails, workflow stops
- Previous successful publishes remain on NPM
- Check Actions logs for detailed error messages

## Comparison: Manual vs Automated

### Manual Publishing (Old Way)
```bash
# Requires OTP for each package
cd shared && npm publish --access public --otp <code>
cd cli && npm publish --access public --otp <code>
cd plugin && npm publish --access public --otp <code>
git tag v2.0.1 && git push --tags
```

### Automated Publishing (New Way)
```bash
# Just create a GitHub release
# Everything else happens automatically
```

## Troubleshooting

### "NPM_TOKEN not found"
- Verify secret is named exactly `NPM_TOKEN`
- Check secret is in repository settings, not organization
- Secret values are case-sensitive

### "401 Unauthorized"
- NPM token may have expired
- Generate new automation token
- Update GitHub secret with new token

### "403 Forbidden"
- Token doesn't have publish access to `@lazy-mcp` scope
- Verify you're a maintainer of the organization
- Check token has correct permissions

### "Package already exists"
- Version in package.json already published
- Bump version number before release
- Or unpublish the version (if published <72 hours ago)

### "Tests failed"
- Fix failing tests locally first
- Workflow won't publish if tests fail
- Check Actions logs for specific test failures

## Post-Setup Checklist

- [ ] NPM automation token created
- [ ] `NPM_TOKEN` added to GitHub secrets
- [ ] Updated `.github/workflows/ci.yml` with new checks
- [ ] Tested manual workflow run (dry run)
- [ ] Created test release to verify auto-publish
- [ ] Verified packages appear on NPM with provenance badges
- [ ] Updated documentation with new installation instructions

## Benefits of Automation

✅ **No more OTP codes** - Automation tokens bypass 2FA
✅ **Consistent process** - Same steps every time
✅ **Version tagging** - GitHub releases create git tags automatically
✅ **Build verification** - Tests must pass before publish
✅ **Provenance** - NPM shows verified GitHub Actions badge
✅ **Audit trail** - All publishes logged in Actions history

## Additional Resources

- [NPM Tokens Documentation](https://docs.npmjs.com/about-access-tokens)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

*Once set up, publishing is as simple as creating a GitHub release!*

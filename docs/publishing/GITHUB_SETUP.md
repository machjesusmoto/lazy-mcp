# GitHub Repository Setup Guide

This guide walks you through setting up the GitHub repository for MCP Toggle.

## Prerequisites

- GitHub account
- Git installed locally
- SSH key configured with GitHub (or use HTTPS)

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in repository details:
   - **Repository name**: `mcp-toggle`
   - **Description**: `CLI tool to manage Claude Code MCP servers and memory files`
   - **Visibility**: Public (recommended for npm packages)
   - **DO NOT** initialize with README, .gitignore, or license (we have these already)

## Step 2: Initial Git Setup (if not done)

```bash
cd /home/dtaylor/motodev/projects/mcp_toggle

# Initialize git repository (if not already initialized)
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: initial release v0.1.0

- MCP server enumeration from .claude.json hierarchy
- Memory file enumeration from .claude/memories/
- Interactive TUI for toggling blocked items
- Persistence to .claude/blocked.md
- Claude.md integration for automatic blocking
- 78 comprehensive tests with full coverage
- Complete documentation and contribution guidelines

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 3: Connect to GitHub

Replace `yourusername` with your actual GitHub username:

```bash
# Add remote (SSH - recommended)
git remote add origin git@github.com:yourusername/mcp-toggle.git

# Or if using HTTPS
# git remote add origin https://github.com/yourusername/mcp-toggle.git

# Verify remote
git remote -v
```

## Step 4: Push to GitHub

```bash
# Create main branch and push
git branch -M main
git push -u origin main
```

## Step 5: Update Repository URLs in package.json

After creating the repository, update the URLs in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/mcp-toggle.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/mcp-toggle/issues"
  },
  "homepage": "https://github.com/yourusername/mcp-toggle#readme"
}
```

Then commit the change:

```bash
git add package.json
git commit -m "docs: update repository URLs with actual GitHub username"
git push
```

## Step 6: Configure Repository Settings

On GitHub (https://github.com/yourusername/mcp-toggle/settings):

1. **General**:
   - Add topics: `claude-code`, `mcp`, `cli`, `tui`, `typescript`, `npm-package`
   - Enable "Automatically delete head branches" for PRs

2. **Branches**:
   - Set `main` as default branch
   - Add branch protection rules (optional):
     - Require status checks to pass (CI workflow)
     - Require branches to be up to date

3. **Actions**:
   - Verify "Allow all actions and reusable workflows" is enabled
   - CI workflow should run automatically on push

## Step 7: Create Initial Release

After pushing code:

1. Go to https://github.com/yourusername/mcp-toggle/releases/new
2. Click "Choose a tag" → type `v0.1.0` → "Create new tag"
3. Fill in release details:
   - **Release title**: `v0.1.0 - Initial Release`
   - **Description**: Copy from CHANGELOG.md (sections under [0.1.0])
4. Click "Publish release"

## Step 8: Verify CI Pipeline

1. Go to https://github.com/yourusername/mcp-toggle/actions
2. Verify the CI workflow runs successfully
3. Check that tests pass on both Node 18 and 20

## Step 9: Add Repository Badges (Optional)

Add to top of README.md:

```markdown
# MCP Toggle

[![CI](https://github.com/yourusername/mcp-toggle/workflows/CI/badge.svg)](https://github.com/yourusername/mcp-toggle/actions)
[![npm version](https://badge.fury.io/js/mcp-toggle.svg)](https://www.npmjs.com/package/mcp-toggle)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line tool to manage Claude Code MCP servers and memory files.
```

## Step 10: Publish to npm (After GitHub Setup)

See [NPM_PUBLISH.md](NPM_PUBLISH.md) for npm publishing instructions.

## Troubleshooting

### Permission Denied (SSH)

```bash
# Generate new SSH key if needed
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy output and add at https://github.com/settings/keys
```

### Remote Already Exists

```bash
# Remove existing remote
git remote remove origin

# Add correct remote
git remote add origin git@github.com:yourusername/mcp-toggle.git
```

### Push Rejected

```bash
# If remote has commits you don't have locally
git pull --rebase origin main
git push -u origin main
```

## Next Steps

After GitHub setup is complete:

1. ✅ Repository created and code pushed
2. ✅ CI pipeline running successfully
3. ✅ Initial release (v0.1.0) published
4. 📦 Publish to npm (see NPM_PUBLISH.md)
5. 📢 Announce on relevant platforms
6. 🐛 Monitor issues and respond to community feedback

## Useful Commands

```bash
# Check repository status
git status

# View commit history
git log --oneline -10

# Create new branch for features
git checkout -b feature/new-feature

# Push branch to GitHub
git push -u origin feature/new-feature

# Create PR: Go to GitHub and click "Compare & pull request"
```

## Repository Structure on GitHub

```
mcp-toggle/
├── .github/
│   └── workflows/
│       └── ci.yml          # Automated CI pipeline
├── bin/
│   └── mcp-toggle         # CLI executable
├── src/                   # Source code (TypeScript)
├── tests/                 # Test files
├── specs/                 # Feature specifications
├── dist/                  # Compiled JavaScript (gitignored, built by CI)
├── CHANGELOG.md           # Version history
├── CONTRIBUTING.md        # Contribution guidelines
├── README.md              # Project documentation
├── LICENSE                # MIT license
└── package.json           # Package configuration
```

---

**Quick Start Script** (run after Step 1):

```bash
#!/bin/bash
cd /home/dtaylor/motodev/projects/mcp_toggle
git init
git add .
git commit -m "feat: initial release v0.1.0"
git remote add origin git@github.com:YOURUSERNAME/mcp-toggle.git
git branch -M main
git push -u origin main
```

Replace `YOURUSERNAME` with your GitHub username before running.

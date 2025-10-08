#!/bin/bash
# GitHub Repository Setup Script for MCP Toggle
# Usage: ./setup-github.sh YOUR_GITHUB_USERNAME

set -e  # Exit on error

# Check if username provided
if [ -z "$1" ]; then
  echo "❌ Error: GitHub username required"
  echo "Usage: ./setup-github.sh YOUR_GITHUB_USERNAME"
  echo ""
  echo "Example: ./setup-github.sh machjesusmoto"
  exit 1
fi

GITHUB_USERNAME="$1"
REPO_NAME="mcp-toggle"

echo "🚀 Setting up GitHub repository for MCP Toggle"
echo "Username: $GITHUB_USERNAME"
echo "Repository: $REPO_NAME"
echo ""

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the project root."
  exit 1
fi

# Check if on feature branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  echo "⚠️  Currently on branch: $CURRENT_BRANCH"
  echo "This script will create/switch to 'main' branch."
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Update package.json with correct GitHub URLs
echo "📝 Updating package.json with GitHub URLs..."
sed -i.bak "s|https://github.com/yourusername/|https://github.com/$GITHUB_USERNAME/|g" package.json
rm package.json.bak

# Stage all files
echo "📦 Staging files..."
git add .

# Create initial commit if needed
if ! git rev-parse HEAD >/dev/null 2>&1; then
  echo "📝 Creating initial commit..."
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
else
  echo "✅ Commits already exist"
fi

# Create/switch to main branch
if git show-ref --verify --quiet refs/heads/main; then
  echo "✅ Main branch exists"
  git checkout main
else
  echo "📝 Creating main branch..."
  git branch -M main
fi

# Add GitHub remote
REMOTE_URL="git@github.com:$GITHUB_USERNAME/$REPO_NAME.git"
if git remote get-url origin >/dev/null 2>&1; then
  EXISTING_URL=$(git remote get-url origin)
  if [ "$EXISTING_URL" != "$REMOTE_URL" ]; then
    echo "⚠️  Existing remote 'origin' points to: $EXISTING_URL"
    echo "Updating to: $REMOTE_URL"
    git remote set-url origin "$REMOTE_URL"
  else
    echo "✅ Remote 'origin' already configured correctly"
  fi
else
  echo "📝 Adding remote 'origin'..."
  git remote add origin "$REMOTE_URL"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create GitHub repository:"
echo "   Go to: https://github.com/new"
echo "   - Repository name: $REPO_NAME"
echo "   - Description: CLI tool to manage Claude Code MCP servers and memory files"
echo "   - Visibility: Public"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo ""
echo "2. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "3. Create first release:"
echo "   Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/releases/new"
echo "   - Tag: v0.1.0"
echo "   - Title: v0.1.0 - Initial Release"
echo "   - Copy description from CHANGELOG.md"
echo ""
echo "4. Verify CI pipeline:"
echo "   Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/actions"
echo ""
echo "5. Publish to npm:"
echo "   See NPM_PUBLISH.md for instructions"
echo ""
echo "📚 Full documentation: GITHUB_SETUP.md"

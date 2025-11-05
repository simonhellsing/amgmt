#!/bin/bash

# Push to GitHub using Personal Access Token
# This script will prompt you for your GitHub Personal Access Token

echo "🚀 Pushing to GitHub..."
echo ""
echo "If you don't have a Personal Access Token yet:"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select 'repo' scope"
echo "4. Copy the token"
echo ""

read -p "Enter your GitHub Personal Access Token: " GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Token is required. Exiting."
    exit 1
fi

# Use token in the URL for authentication
git remote set-url origin https://${GITHUB_TOKEN}@github.com/simonhellsing/amgmt.git

echo ""
echo "📤 Pushing code..."
git push -u origin main

# Reset remote URL to remove token (for security)
git remote set-url origin https://github.com/simonhellsing/amgmt.git

echo ""
echo "✅ Done! Your code has been pushed to GitHub."
echo "🔗 View it at: https://github.com/simonhellsing/amgmt"


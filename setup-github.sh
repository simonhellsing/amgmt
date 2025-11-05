#!/bin/bash

# GitHub Setup Script
# Replace YOUR_USERNAME with your actual GitHub username

echo "🚀 Setting up GitHub repository..."
echo ""
echo "Please make sure you've created a GitHub repository first!"
echo "Go to: https://github.com/new"
echo ""
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter your repository name (default: amgmt): " REPO_NAME
REPO_NAME=${REPO_NAME:-amgmt}

echo ""
echo "📦 Adding remote origin..."
git remote add origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git 2>/dev/null || git remote set-url origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git

echo "🌿 Setting default branch to main..."
git branch -M main

echo "📤 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Your code is now on GitHub."
echo "📝 Next: Go to Vercel dashboard and import your repository for automatic deployments."



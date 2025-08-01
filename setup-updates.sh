#!/bin/bash

echo "🚀 Setting up Tauri Auto-Updates with GitHub Releases"
echo "=================================================="

# Check if Tauri CLI is installed
if ! command -v tauri &> /dev/null; then
    echo "❌ Tauri CLI not found. Installing..."
    npm install -g @tauri-apps/cli
fi

# Generate signing key if it doesn't exist
if [ ! -f ~/.tauri/tauri-key.pem ]; then
    echo "🔑 Generating new signing key..."
    tauri signer generate
    echo "✅ Signing key generated at ~/.tauri/tauri-key.pem"
else
    echo "✅ Signing key already exists"
fi

# Get the public key
echo "📋 Your public key (add this to tauri.conf.json):"
echo "=================================================="
tauri signer get-public-key
echo "=================================================="

# Get repository info
echo ""
echo "📝 Please provide your GitHub repository information:"
read -p "GitHub username: " GITHUB_USERNAME
read -p "Repository name: " REPO_NAME

# Update tauri.conf.json with the correct endpoint
echo "🔧 Updating tauri.conf.json..."
sed -i.bak "s/YOUR_USERNAME/$GITHUB_USERNAME/g" src-tauri/tauri.conf.json
sed -i.bak "s/YOUR_REPO/$REPO_NAME/g" src-tauri/tauri.conf.json

echo "✅ Updated tauri.conf.json with GitHub endpoint"

# Instructions for GitHub Secrets
echo ""
echo "🔐 Next steps:"
echo "1. Go to your GitHub repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "2. Go to Settings > Secrets and variables > Actions"
echo "3. Add a new repository secret:"
echo "   - Name: TAURI_PRIVATE_KEY"
echo "   - Value: (copy the contents of ~/.tauri/tauri-key.pem)"
echo ""
echo "4. To create a release, push a new tag:"
echo "   git tag v0.2.0"
echo "   git push origin v0.2.0"
echo ""
echo "🎉 Setup complete! Your app will now check for updates from GitHub Releases." 
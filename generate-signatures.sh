#!/bin/bash

echo "🔐 Generating signatures for latest.json"
echo "========================================"

# Check if Tauri CLI is installed
if ! command -v tauri &> /dev/null; then
    echo "❌ Tauri CLI not found. Please install it first:"
    echo "npm install -g @tauri-apps/cli"
    exit 1
fi

# Check if signing key exists
if [ ! -f ~/.tauri/tauri-key.pem ]; then
    echo "❌ Signing key not found. Please generate one first:"
    echo "tauri signer generate"
    exit 1
fi

# Function to get signature for a file
get_signature() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        echo "📝 Signing: $(basename "$file_path")"
        tauri signer sign "$file_path" | grep -o 'signature: .*' | cut -d' ' -f2
    else
        echo "⚠️  File not found: $file_path"
        echo "PLACEHOLDER_SIGNATURE"
    fi
}

# Get version from tauri.conf.json
VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version")
echo "📋 Version: $VERSION"

# Find built files
echo ""
echo "🔍 Looking for built files..."
DMG_X64=$(find src-tauri/target/release/bundle -name "*_x64.dmg" -type f 2>/dev/null | head -1)
DMG_ARM64=$(find src-tauri/target/release/bundle -name "*_arm64.dmg" -type f 2>/dev/null | head -1)
APPIMAGE=$(find src-tauri/target/release/bundle -name "*.AppImage" -type f 2>/dev/null | head -1)
EXE=$(find src-tauri/target/release/bundle -name "*.exe" -type f 2>/dev/null | head -1)

echo "Found files:"
echo "  macOS x64: $DMG_X64"
echo "  macOS ARM64: $DMG_ARM64"
echo "  Linux: $APPIMAGE"
echo "  Windows: $EXE"

# Get signatures
echo ""
echo "🔐 Generating signatures..."
DMG_X64_SIG=$(get_signature "$DMG_X64")
DMG_ARM64_SIG=$(get_signature "$DMG_ARM64")
APPIMAGE_SIG=$(get_signature "$APPIMAGE")
EXE_SIG=$(get_signature "$EXE")

# Set repository info
GITHUB_USERNAME="fktona"
REPO_NAME="projext-one"
echo ""
echo "📝 Using repository: $GITHUB_USERNAME/$REPO_NAME"

# Create latest.json
echo ""
echo "📄 Creating latest.json..."
cat > latest.json << EOF
{
  "version": "$VERSION",
  "notes": "Manual release",
  "pub_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "darwin-x86_64": {
      "signature": "$DMG_X64_SIG",
      "url": "https://github.com/$GITHUB_USERNAME/$REPO_NAME/releases/latest/download/Project-One_${VERSION}_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "$DMG_ARM64_SIG",
      "url": "https://github.com/$GITHUB_USERNAME/$REPO_NAME/releases/latest/download/Project-One_${VERSION}_arm64.dmg"
    },
    "linux-x86_64": {
      "signature": "$APPIMAGE_SIG",
      "url": "https://github.com/$GITHUB_USERNAME/$REPO_NAME/releases/latest/download/Project-One_${VERSION}_amd64.AppImage"
    },
    "windows-x86_64": {
      "signature": "$EXE_SIG",
      "url": "https://github.com/$GITHUB_USERNAME/$REPO_NAME/releases/latest/download/Project-One_${VERSION}_x64-setup.exe"
    }
  }
}
EOF

echo "✅ Generated latest.json with signatures:"
echo "========================================"
cat latest.json

echo ""
echo "📋 Next steps:"
echo "1. Upload this latest.json file to your GitHub release"
echo "2. Make sure all the referenced files are also uploaded to the release"
echo "3. Test the update in your app" 
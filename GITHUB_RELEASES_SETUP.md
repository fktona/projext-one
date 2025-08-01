# GitHub Releases Auto-Update Setup

This guide will help you set up automatic updates for your Tauri app using GitHub Releases.

## Prerequisites

- GitHub repository for your project
- Tauri CLI installed (`npm install -g @tauri-apps/cli`)
- Node.js and npm

## Quick Setup

### 1. Run the Setup Script

**On Windows:**
```powershell
.\setup-updates.ps1
```

**On macOS/Linux:**
```bash
chmod +x setup-updates.sh
./setup-updates.sh
```

The script will:
- Generate a signing key if needed
- Display your public key
- Update `tauri.conf.json` with your repository info
- Provide next steps

### 2. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the secret:
   - **Name**: `TAURI_PRIVATE_KEY`
   - **Value**: Copy the contents of `~/.tauri/tauri-key.pem`

### 3. Update Your Repository Info

Replace `YOUR_USERNAME` and `YOUR_REPO` in `src-tauri/tauri.conf.json`:

```json
{
  "updater": {
    "endpoints": [
      "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest"
    ]
  }
}
```

## How It Works

### GitHub Actions Workflow

The `.github/workflows/release.yml` workflow will:

1. **Trigger**: When you push a tag starting with `v` (e.g., `v0.2.0`)
2. **Build**: Create builds for Windows, macOS, and Linux
3. **Sign**: Sign all binaries with your private key
4. **Release**: Create a GitHub release with all assets

### Update Process

1. **User clicks "Check for Updates"** in system tray
2. **App queries** GitHub API for latest release
3. **If update available**: Shows notification with install option
4. **User clicks install**: Downloads and installs the update
5. **App restarts** with new version

## Creating a Release

### Method 1: Using Git Tags (Recommended)

```bash
# Update version in tauri.conf.json
# Then create and push a tag
git tag v0.2.0
git push origin v0.2.0
```

### Method 2: Manual Release

1. Build your app: `npm run tauri build`
2. Go to GitHub repository > **Releases**
3. Click **Create a new release**
4. Upload the built files from `src-tauri/target/release/bundle/`

## File Structure

```
your-app/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions workflow
├── src-tauri/
│   └── tauri.conf.json          # Updated with GitHub endpoint
├── components/
│   └── UpdateHandler.tsx        # Frontend update handler
├── setup-updates.sh             # Linux/macOS setup script
├── setup-updates.ps1            # Windows setup script
└── GITHUB_RELEASES_SETUP.md     # This file
```

## Testing Updates

### 1. Create a Test Release

```bash
# Update version to 0.2.0 in tauri.conf.json
git add .
git commit -m "Update to v0.2.0"
git tag v0.2.0
git push origin v0.2.0
```

### 2. Test the Update

1. Run your app with version 0.1.0
2. Right-click system tray icon
3. Click "Check for Updates"
4. Should see update notification for v0.2.0

## Troubleshooting

### Common Issues

**"Update check failed"**
- Check your GitHub repository URL in `tauri.conf.json`
- Ensure the repository is public or you have proper access

**"Failed to install update"**
- Check that the release assets are properly signed
- Verify the `TAURI_PRIVATE_KEY` secret is set correctly

**"No updates available"**
- Ensure you've created a GitHub release
- Check that the version in `tauri.conf.json` is lower than the release version

### Debug Mode

Enable debug logging by adding to your app:

```typescript
// In your main component
useEffect(() => {
  const checkUpdates = async () => {
    try {
      const { shouldUpdate, manifest } = await checkUpdate();
      console.log('Update check result:', { shouldUpdate, manifest });
    } catch (error) {
      console.error('Update check error:', error);
    }
  };
  
  checkUpdates();
}, []);
```

## Security Notes

- **Keep your private key secure**: Never commit `~/.tauri/tauri-key.pem` to your repository
- **Use GitHub Secrets**: Always store the private key as a GitHub secret
- **Verify signatures**: The app will verify update signatures before installing

## Next Steps

1. **Test the setup** with a small version bump
2. **Monitor the GitHub Actions** workflow for any issues
3. **Update your app's version** when ready to release
4. **Push a new tag** to trigger the release process

Your app will now automatically check for updates from GitHub Releases! 🎉 
# PowerShell script for setting up Tauri Auto-Updates with GitHub Releases

Write-Host "🚀 Setting up Tauri Auto-Updates with GitHub Releases" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if Tauri CLI is installed
try {
    $null = Get-Command tauri -ErrorAction Stop
    Write-Host "✅ Tauri CLI found" -ForegroundColor Green
}
catch {
    Write-Host "❌ Tauri CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @tauri-apps/cli
}

# Generate signing key if it doesn't exist
$keyPath = "$env:USERPROFILE\.tauri\tauri-key.pem"
if (-not (Test-Path $keyPath)) {
    Write-Host "🔑 Generating new signing key..." -ForegroundColor Yellow
    tauri signer generate
    Write-Host "✅ Signing key generated at $keyPath" -ForegroundColor Green
}
else {
    Write-Host "✅ Signing key already exists" -ForegroundColor Green
}

# Get the public key
Write-Host "📋 Your public key (add this to tauri.conf.json):" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
tauri signer get-public-key
Write-Host "==================================================" -ForegroundColor Cyan

# Get repository info
Write-Host ""
Write-Host "📝 Please provide your GitHub repository information:" -ForegroundColor Yellow
$GITHUB_USERNAME = Read-Host "GitHub username"
$REPO_NAME = Read-Host "Repository name"

# Update tauri.conf.json with the correct endpoint
Write-Host "🔧 Updating tauri.conf.json..." -ForegroundColor Yellow
$configPath = "src-tauri\tauri.conf.json"
$config = Get-Content $configPath -Raw
$config = $config -replace "YOUR_USERNAME", $GITHUB_USERNAME
$config = $config -replace "YOUR_REPO", $REPO_NAME
$config | Set-Content $configPath

Write-Host "✅ Updated tauri.conf.json with GitHub endpoint" -ForegroundColor Green

# Instructions for GitHub Secrets
Write-Host ""
Write-Host "🔐 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to your GitHub repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor White
Write-Host "2. Go to Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "3. Add a new repository secret:" -ForegroundColor White
Write-Host "   - Name: TAURI_PRIVATE_KEY" -ForegroundColor White
Write-Host "   - Value: (copy the contents of $keyPath)" -ForegroundColor White
Write-Host ""
Write-Host "4. To create a release, push a new tag:" -ForegroundColor White
Write-Host "   git tag v0.2.0" -ForegroundColor White
Write-Host "   git push origin v0.2.0" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Setup complete! Your app will now check for updates from GitHub Releases." -ForegroundColor Green 
# RAG System Setup Script for Windows
# This script helps set up the RAG (Retrieval-Augmented Generation) system

Write-Host "🚀 Setting up RAG System for ScreenPipe AI Analyzer" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if Docker is installed
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow

$dockerInstalled = $false
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
        $dockerInstalled = $true
    }
} catch {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
}

if (-not $dockerInstalled) {
    Write-Host "`n📥 Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "After installation, restart this script." -ForegroundColor Yellow
    Read-Host "Press Enter to continue..."
    exit
}

# Check if Ollama is installed
$ollamaInstalled = $false
try {
    $ollamaVersion = ollama --version 2>$null
    if ($ollamaVersion) {
        Write-Host "✅ Ollama is installed: $ollamaVersion" -ForegroundColor Green
        $ollamaInstalled = $true
    }
} catch {
    Write-Host "❌ Ollama is not installed" -ForegroundColor Red
}

if (-not $ollamaInstalled) {
    Write-Host "`n📥 Installing Ollama..." -ForegroundColor Yellow
    try {
        # Download and install Ollama
        Invoke-WebRequest -Uri "https://ollama.ai/download/ollama-windows-amd64.exe" -OutFile "ollama-installer.exe"
        Start-Process -FilePath "ollama-installer.exe" -Wait
        Remove-Item "ollama-installer.exe" -Force
        Write-Host "✅ Ollama installed successfully" -ForegroundColor Green
        $ollamaInstalled = $true
    } catch {
        Write-Host "❌ Failed to install Ollama automatically" -ForegroundColor Red
        Write-Host "Please install Ollama manually from: https://ollama.ai/download" -ForegroundColor Yellow
    }
}

# Start Ollama service
if ($ollamaInstalled) {
    Write-Host "`n🔧 Starting Ollama service..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "✅ Ollama service started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start Ollama service" -ForegroundColor Red
    }
}

# Pull required Ollama models
Write-Host "`n📥 Downloading AI models..." -ForegroundColor Yellow

$models = @("gemma3n:latest", "nomic-embed-text")

foreach ($model in $models) {
    Write-Host "Downloading $model..." -ForegroundColor Cyan
    try {
        ollama pull $model
        Write-Host "✅ $model downloaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download $model" -ForegroundColor Red
    }
}

# Start Qdrant vector database
Write-Host "`n🗄️ Starting Qdrant vector database..." -ForegroundColor Yellow

try {
    # Stop existing Qdrant container if running
    docker stop qdrant-rag 2>$null
    docker rm qdrant-rag 2>$null
    
    # Start new Qdrant container
    docker run -d --name qdrant-rag -p 6333:6333 -p 6334:6334 qdrant/qdrant
    Start-Sleep -Seconds 5
    
    # Test Qdrant connection
    $qdrantResponse = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method Get -ErrorAction SilentlyContinue
    if ($qdrantResponse) {
        Write-Host "✅ Qdrant vector database started successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start Qdrant" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to start Qdrant vector database" -ForegroundColor Red
    Write-Host "Please ensure Docker is running and try again" -ForegroundColor Yellow
}

# Test system connectivity
Write-Host "`n🔍 Testing system connectivity..." -ForegroundColor Yellow

# Test Ollama
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction SilentlyContinue
    if ($ollamaResponse) {
        Write-Host "✅ Ollama API is accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Ollama API is not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Ollama API is not accessible" -ForegroundColor Red
}

# Test Qdrant
try {
    $qdrantResponse = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method Get -ErrorAction SilentlyContinue
    if ($qdrantResponse) {
        Write-Host "✅ Qdrant API is accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Qdrant API is not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Qdrant API is not accessible" -ForegroundColor Red
}

Write-Host "`n🎉 RAG System Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Build your Tauri application: npm run tauri build" -ForegroundColor White
Write-Host "2. Start your application" -ForegroundColor White
Write-Host "3. Navigate to the RAG Analyzer page" -ForegroundColor White
Write-Host "4. Ingest your ScreenPipe data files" -ForegroundColor White
Write-Host "5. Start asking questions about your data!" -ForegroundColor White

Write-Host "`n📚 For more information, see RAG_SETUP.md" -ForegroundColor Cyan
Write-Host "🐛 For troubleshooting, check the logs above" -ForegroundColor Cyan

Read-Host "`nPress Enter to exit..." 
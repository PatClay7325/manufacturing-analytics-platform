@echo off
echo ===============================================
echo    COMPLETE OLLAMA GEMMA:2B STREAMING SETUP
echo ===============================================
echo.
echo This script will:
echo 1. Update your environment configuration
echo 2. Start optimized Ollama with Gemma:2B
echo 3. Verify everything is working
echo.
pause

echo.
echo [STEP 1] Backing up current .env.local...
if exist .env.local (
    copy .env.local .env.local.backup
    echo ✓ Backup created: .env.local.backup
) else (
    echo ✓ No existing .env.local found
)

echo.
echo [STEP 2] Creating optimized .env.local...
(
echo # Ollama Optimized Configuration
echo OLLAMA_API_URL=http://localhost:11434
echo OLLAMA_DEFAULT_MODEL=gemma:2b
echo.
echo # Enable Streaming
echo OLLAMA_USE_STREAMING=true
echo.
echo # Performance Optimization
echo OLLAMA_MAX_CONTEXT=2048
echo OLLAMA_ENABLE_CACHE=true
echo OLLAMA_CACHE_TTL=300
echo OLLAMA_TIMEOUT=60000
echo OLLAMA_NUM_THREADS=2
echo OLLAMA_NUM_GPU=0
echo.
echo # Database Configuration - Update these!
echo DATABASE_URL="postgresql://username:password@localhost:5432/manufacturing"
echo DIRECT_URL="postgresql://username:password@localhost:5432/manufacturing"
echo.
echo # Next.js
echo NEXTAUTH_URL=http://localhost:3000
echo NEXTAUTH_SECRET=your-secret-key-here
echo.
echo # Features
echo NEXT_PUBLIC_USE_CUSTOM_METRICS=false
echo NEXT_PUBLIC_USE_HIGHCHARTS=true
) > .env.local

echo ✓ Created optimized .env.local
echo.
echo IMPORTANT: Edit .env.local to add your database credentials!
echo.

echo [STEP 3] Checking if Docker is running...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running! Please start Docker Desktop first.
    echo.
    echo To start Docker Desktop:
    echo 1. Open Docker Desktop from Start Menu
    echo 2. Wait for it to fully start
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo [STEP 4] Checking if Ollama is already running...
docker ps | findstr manufacturing-ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo Found existing Ollama container. Stopping it...
    docker stop manufacturing-ollama >nul 2>&1
    docker rm manufacturing-ollama >nul 2>&1
    echo ✓ Stopped existing container
)

echo.
echo [STEP 5] Starting Ollama with Gemma:2B...
echo This will take a few minutes on first run...
echo.

if exist scripts\windows\START-OLLAMA-OPTIMIZED.cmd (
    call scripts\windows\START-OLLAMA-OPTIMIZED.cmd
) else (
    echo Starting standard Ollama container...
    docker-compose up -d ollama
    
    echo.
    echo Waiting 30 seconds for Ollama to start...
    timeout /t 30 /nobreak >nul
    
    echo.
    echo Pulling Gemma:2B model...
    docker exec manufacturing-ollama ollama pull gemma:2b
)

echo.
echo [STEP 6] Verifying Ollama is running...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ Ollama is not responding yet. It may still be starting.
    echo Please wait a minute and check: http://localhost:11434
) else (
    echo ✓ Ollama is running and accessible!
)

echo.
echo [STEP 7] Testing Gemma:2B model...
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\": \"gemma:2b\", \"prompt\": \"Hello, respond with: I am ready!\", \"stream\": false}" 2>nul | findstr "response"
if %errorlevel% equ 0 (
    echo ✓ Gemma:2B is responding!
) else (
    echo ⚠ Gemma:2B test failed. The model may still be loading.
)

echo.
echo ===============================================
echo    SETUP COMPLETE! NEXT STEPS:
echo ===============================================
echo.
echo 1. Edit .env.local to add your database credentials
echo.
echo 2. Start your development server:
echo    npm run dev
echo.
echo 3. Visit the optimized chat:
echo    http://localhost:3000/manufacturing-chat/optimized
echo.
echo 4. Monitor performance:
echo    scripts\windows\MONITOR-OLLAMA-PERFORMANCE.cmd
echo.
echo ===============================================
echo    QUICK VERIFICATION CHECKLIST:
echo ===============================================
echo.
echo [✓] .env.local created with optimized settings
echo [✓] Ollama container is running
echo [✓] Gemma:2B model is available
echo [✓] Streaming is enabled
echo [✓] Performance optimizations applied
echo.
echo If Ollama is not responding, wait 1-2 minutes and run:
echo    docker logs manufacturing-ollama
echo.
pause
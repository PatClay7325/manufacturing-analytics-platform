@echo off
echo ===============================================
echo    UPDATE ENVIRONMENT FOR OLLAMA
echo ===============================================
echo.

echo [1] Checking which Ollama container is running...
docker ps --format "{{.Names}}" | findstr ollama >temp_container.txt
set /p CONTAINER_NAME=<temp_container.txt
del temp_container.txt

if "%CONTAINER_NAME%"=="" (
    echo ❌ No Ollama container found!
    echo Please start Ollama first.
    pause
    exit /b 1
)

echo ✅ Found container: %CONTAINER_NAME%
echo.

echo [2] Updating .env.local with correct settings...
if exist .env.local (
    echo Backing up existing .env.local to .env.local.backup
    copy .env.local .env.local.backup >nul
)

(
echo # Ollama Configuration - Auto-updated
echo OLLAMA_API_URL=http://localhost:11434
echo OLLAMA_DEFAULT_MODEL=gemma:2b
echo.
echo # Streaming enabled for better performance
echo OLLAMA_USE_STREAMING=true
echo.
echo # Performance Settings
echo OLLAMA_MAX_CONTEXT=2048
echo OLLAMA_ENABLE_CACHE=true
echo OLLAMA_CACHE_TTL=300
echo OLLAMA_TIMEOUT=60000
echo OLLAMA_NUM_THREADS=2
echo OLLAMA_NUM_GPU=0
echo.
echo # Database - UPDATE THESE VALUES!
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
echo DIRECT_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
echo.
echo # Auth
echo NEXTAUTH_URL=http://localhost:3000
echo NEXTAUTH_SECRET=your-secret-key-here
echo.
echo # Features
echo NEXT_PUBLIC_USE_CUSTOM_METRICS=false
echo NEXT_PUBLIC_USE_HIGHCHARTS=true
echo.
echo # Node.js optimization
echo NODE_OPTIONS="--max-old-space-size=2048"
) > .env.local

echo ✅ Updated .env.local
echo.

echo [3] Testing Ollama connection...
timeout /t 2 /nobreak >nul

curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama API is accessible!
    
    echo.
    echo [4] Checking for Gemma:2B model...
    docker exec %CONTAINER_NAME% ollama list | findstr gemma:2b >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Gemma:2B is installed!
    ) else (
        echo ⚠️  Gemma:2B not found. Installing now...
        docker exec %CONTAINER_NAME% ollama pull gemma:2b
    )
) else (
    echo ⚠️  Ollama API not responding yet
    echo.
    echo Please wait a minute and try again, or check:
    echo   docker logs %CONTAINER_NAME%
)

echo.
echo ===============================================
echo    ENVIRONMENT SETUP COMPLETE
echo ===============================================
echo.
echo ✅ .env.local has been updated
echo ✅ Container name: %CONTAINER_NAME%
echo.
echo Next steps:
echo 1. Edit .env.local to add your PostgreSQL credentials
echo 2. Run: npm run dev
echo 3. Visit: http://localhost:3000/manufacturing-chat
echo.
echo To verify Ollama is working:
echo   curl http://localhost:11434/api/tags
echo.
pause
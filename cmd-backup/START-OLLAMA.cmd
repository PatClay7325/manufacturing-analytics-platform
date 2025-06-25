@echo off
echo ===============================================
echo    START OLLAMA CONTAINER
echo ===============================================
echo.

echo [1] Checking if Docker is running...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running!
    echo.
    echo Please start Docker Desktop first:
    echo 1. Open Docker Desktop from Start Menu
    echo 2. Wait for it to fully start (system tray icon)
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)
echo ✅ Docker is running

echo.
echo [2] Checking for existing Ollama container...
docker ps -a | findstr manufacturing-ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo Found existing container. Checking status...
    docker ps | findstr manufacturing-ollama >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Ollama is already running!
        echo.
        echo Container status:
        docker ps --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ) else (
        echo Container exists but is stopped. Starting it...
        docker start manufacturing-ollama
        echo ✅ Ollama container started!
    )
) else (
    echo No existing container found. Creating new one...
    echo.
    echo [3] Starting Ollama with docker-compose...
    docker-compose up -d ollama
    
    if %errorlevel% equ 0 (
        echo ✅ Ollama container created and started!
    ) else (
        echo ❌ Failed to start Ollama container
        echo.
        echo Try running manually:
        echo   docker-compose up -d ollama
        pause
        exit /b 1
    )
)

echo.
echo [4] Waiting for Ollama to be ready...
echo This may take 10-30 seconds...
timeout /t 5 /nobreak >nul

set attempts=0
:CHECK_OLLAMA
set /a attempts+=1
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama is ready and responding!
    goto :OLLAMA_READY
) else (
    if %attempts% lss 10 (
        echo    Waiting for Ollama to start... (attempt %attempts%/10)
        timeout /t 3 /nobreak >nul
        goto :CHECK_OLLAMA
    ) else (
        echo ⚠️  Ollama is taking longer than expected to start
        echo    Check the logs below for any errors:
        echo.
        docker logs manufacturing-ollama --tail 20
        goto :END_SCRIPT
    )
)

:OLLAMA_READY
echo.
echo [5] Checking installed models...
docker exec manufacturing-ollama ollama list 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Could not list models. Ollama may still be initializing.
) else (
    echo.
    echo ✅ Models listed above
)

echo.
echo [6] Checking for Gemma:2B...
docker exec manufacturing-ollama ollama list 2>nul | findstr "gemma:2b" >nul
if %errorlevel% equ 0 (
    echo ✅ Gemma:2B is installed
) else (
    echo ⚠️  Gemma:2B not found. Installing it now...
    echo    This will take a few minutes on first download...
    docker exec manufacturing-ollama ollama pull gemma:2b
    if %errorlevel% equ 0 (
        echo ✅ Gemma:2B installed successfully!
    ) else (
        echo ❌ Failed to install Gemma:2B
    )
)

:END_SCRIPT
echo.
echo ===============================================
echo    OLLAMA STATUS
echo ===============================================
echo.
echo Container: manufacturing-ollama
echo API URL:   http://localhost:11434
echo.
echo Useful commands:
echo - View logs:    docker logs manufacturing-ollama
echo - Stop Ollama:  docker stop manufacturing-ollama  
echo - List models:  docker exec manufacturing-ollama ollama list
echo - Pull model:   docker exec manufacturing-ollama ollama pull [model-name]
echo.
echo To test Ollama:
echo   curl http://localhost:11434/api/tags
echo.
pause
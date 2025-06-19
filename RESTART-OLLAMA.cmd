@echo off
echo ===============================================
echo    RESTART OLLAMA CONTAINER
echo ===============================================
echo.

echo [1] Stopping Ollama container...
docker stop manufacturing-ollama >nul 2>&1
echo ✅ Stopped

echo.
echo [2] Starting Ollama container...
docker start manufacturing-ollama

if %errorlevel% equ 0 (
    echo ✅ Ollama container restarted successfully!
    echo.
    echo [3] Waiting for API to be ready...
    timeout /t 5 /nobreak >nul
    
    curl -s http://localhost:11434/api/tags >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Ollama API is responding!
    ) else (
        echo ⚠️  API not ready yet. Give it a few more seconds...
    )
) else (
    echo ❌ Failed to restart Ollama container
    echo.
    echo Trying to create new container...
    docker-compose up -d ollama
)

echo.
echo Current status:
docker ps --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
pause
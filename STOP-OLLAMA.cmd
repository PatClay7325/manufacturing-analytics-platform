@echo off
echo ===============================================
echo    STOP OLLAMA CONTAINER
echo ===============================================
echo.

echo Stopping Ollama container...
docker stop manufacturing-ollama

if %errorlevel% equ 0 (
    echo ✅ Ollama container stopped successfully!
) else (
    echo ❌ Failed to stop Ollama container
    echo.
    echo Container may not be running. Current status:
    docker ps -a --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}"
)

echo.
pause
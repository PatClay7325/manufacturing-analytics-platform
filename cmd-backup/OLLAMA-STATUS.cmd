@echo off
echo ===============================================
echo    OLLAMA CONTAINER STATUS
echo ===============================================
echo.

echo [1] Docker Container Status:
echo --------------------------------
docker ps -a --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}"

echo.
echo [2] Ollama API Status:
echo --------------------------------
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ API is responding at http://localhost:11434
) else (
    echo ❌ API is not responding
)

echo.
echo [3] Installed Models:
echo --------------------------------
docker exec manufacturing-ollama ollama list 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Cannot list models. Container may be stopped or starting.
)

echo.
echo [4] Container Resource Usage:
echo --------------------------------
docker stats manufacturing-ollama --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo.
echo [5] Recent Logs (last 10 lines):
echo --------------------------------
docker logs manufacturing-ollama --tail 10 2>&1

echo.
echo ===============================================
echo Quick Actions:
echo - Start:   START-OLLAMA.cmd
echo - Stop:    STOP-OLLAMA.cmd
echo - Restart: RESTART-OLLAMA.cmd
echo ===============================================
echo.
pause
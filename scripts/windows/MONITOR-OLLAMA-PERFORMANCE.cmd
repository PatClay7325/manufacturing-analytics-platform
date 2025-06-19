@echo off
echo ===============================================
echo    OLLAMA PERFORMANCE MONITOR
echo ===============================================
echo.

:MENU
echo Select monitoring option:
echo [1] Real-time resource usage
echo [2] Test response time
echo [3] Check model status
echo [4] View recent logs
echo [5] Memory usage details
echo [6] Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto RESOURCE_USAGE
if "%choice%"=="2" goto TEST_RESPONSE
if "%choice%"=="3" goto MODEL_STATUS
if "%choice%"=="4" goto VIEW_LOGS
if "%choice%"=="5" goto MEMORY_DETAILS
if "%choice%"=="6" goto END

:RESOURCE_USAGE
echo.
echo Real-time Resource Usage (Press Ctrl+C to stop):
echo ================================================
docker stats manufacturing-ollama-optimized
goto MENU

:TEST_RESPONSE
echo.
echo Testing Response Time...
echo ========================
echo.
set start=%time%
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\": \"gemma:2b\", \"prompt\": \"What is OEE? Answer in one sentence.\", \"stream\": false}" -w "\n\nResponse Time: %%{time_total}s\n"
echo.
pause
goto MENU

:MODEL_STATUS
echo.
echo Model Status:
echo =============
curl -s http://localhost:11434/api/tags | jq -r ".models[] | \"Model: \" + .name + \" Size: \" + (.size/1073741824|tostring) + \"GB\""
echo.
echo Currently Loaded Models:
curl -s http://localhost:11434/api/ps | jq -r ".models[] | \"- \" + .name + \" (\" + .size + \")\""
echo.
pause
goto MENU

:VIEW_LOGS
echo.
echo Recent Logs (last 20 lines):
echo ============================
docker logs manufacturing-ollama-optimized --tail 20
echo.
pause
goto MENU

:MEMORY_DETAILS
echo.
echo Memory Usage Details:
echo ====================
docker exec manufacturing-ollama-optimized ps aux | findstr ollama
echo.
echo Container Memory Limit:
docker inspect manufacturing-ollama-optimized | jq -r ".[0].HostConfig.Memory / 1073741824" | findstr /R "[0-9]"
echo GB
echo.
pause
goto MENU

:END
echo.
echo Exiting monitor...
exit /b
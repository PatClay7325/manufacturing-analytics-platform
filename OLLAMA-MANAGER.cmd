@echo off
:MENU
cls
echo ===============================================
echo    OLLAMA CONTAINER MANAGER
echo ===============================================
echo.
echo [1] Start Ollama Container
echo [2] Stop Ollama Container
echo [3] Restart Ollama Container
echo [4] Show Status
echo [5] View Logs
echo [6] List Models
echo [7] Pull Gemma:2B Model
echo [8] Test Ollama API
echo [9] Open Shell in Container
echo [0] Exit
echo.
set /p choice="Select an option (0-9): "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" goto LOGS
if "%choice%"=="6" goto MODELS
if "%choice%"=="7" goto PULL_GEMMA
if "%choice%"=="8" goto TEST_API
if "%choice%"=="9" goto SHELL
if "%choice%"=="0" goto EXIT

echo Invalid option. Please try again.
pause
goto MENU

:START
echo.
echo Starting Ollama...
docker-compose up -d ollama
if %errorlevel% equ 0 (
    echo ✅ Ollama started successfully!
) else (
    docker start manufacturing-ollama
)
pause
goto MENU

:STOP
echo.
echo Stopping Ollama...
docker stop manufacturing-ollama
echo ✅ Ollama stopped
pause
goto MENU

:RESTART
echo.
echo Restarting Ollama...
docker restart manufacturing-ollama
echo ✅ Ollama restarted
pause
goto MENU

:STATUS
echo.
echo Container Status:
echo -----------------
docker ps -a --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo Resource Usage:
echo ---------------
docker stats manufacturing-ollama --no-stream
pause
goto MENU

:LOGS
echo.
echo Recent Logs (press Ctrl+C to stop):
echo ------------------------------------
docker logs manufacturing-ollama --follow --tail 50
pause
goto MENU

:MODELS
echo.
echo Installed Models:
echo -----------------
docker exec manufacturing-ollama ollama list
pause
goto MENU

:PULL_GEMMA
echo.
echo Pulling Gemma:2B model...
echo This may take several minutes on first download...
docker exec manufacturing-ollama ollama pull gemma:2b
if %errorlevel% equ 0 (
    echo ✅ Gemma:2B installed successfully!
) else (
    echo ❌ Failed to install Gemma:2B
)
pause
goto MENU

:TEST_API
echo.
echo Testing Ollama API...
echo ---------------------
echo.
echo 1. Checking API endpoint:
curl -s http://localhost:11434/api/tags
echo.
echo.
echo 2. Testing Gemma:2B:
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\": \"gemma:2b\", \"prompt\": \"Hello! Respond with: Ollama is working!\", \"stream\": false}"
echo.
pause
goto MENU

:SHELL
echo.
echo Opening shell in Ollama container...
echo Type 'exit' to return to this menu.
echo.
docker exec -it manufacturing-ollama /bin/bash
pause
goto MENU

:EXIT
echo.
echo Exiting Ollama Manager...
exit /b
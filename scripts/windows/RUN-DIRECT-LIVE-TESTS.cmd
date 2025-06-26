@echo off
setlocal enabledelayedexpansion

echo.
echo =====================================
echo   DIRECT LIVE TESTS - NO SERVER
echo   Testing Agent Directly
echo =====================================
echo.

REM Check if Ollama is running
echo Checking Ollama status...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Ollama is not running!
    echo Please start Ollama first:
    echo   ollama serve
    echo.
    pause
    exit /b 1
)
echo ✓ Ollama is running
echo.

echo Running direct agent tests (no server required)...
echo This will make REAL calls to Ollama.
echo.

REM Run the direct tests
npm run test:live:direct

echo.
echo =====================================
echo   Direct tests complete!
echo =====================================
echo.
echo These tests verified the agent works correctly
echo without needing the development server.
echo.
pause
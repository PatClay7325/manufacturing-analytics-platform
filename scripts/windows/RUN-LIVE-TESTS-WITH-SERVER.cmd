@echo off
setlocal enabledelayedexpansion

echo.
echo =====================================
echo   LIVE TESTS WITH DEV SERVER
echo   Starting server and running tests
echo =====================================
echo.

REM Check if Ollama is running
echo Checking Ollama status...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Ollama is not running!
    echo Please start Ollama first in another terminal:
    echo   ollama serve
    echo.
    pause
    exit /b 1
)
echo ✓ Ollama is running

REM Check if dev server is already running
echo Checking if dev server is already running...
curl -s http://localhost:3000/api/health-check >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Dev server already running
    echo.
    echo Running tests...
    npm run test:live
) else (
    echo.
    echo Dev server not running. Starting it now...
    echo.
    echo IMPORTANT: This will start the dev server in the background.
    echo After tests complete, you'll need to stop it manually (Ctrl+C).
    echo.
    pause
    
    REM Start dev server in background
    start "Next.js Dev Server" /min cmd /c "npm run dev"
    
    echo Waiting for server to start (30 seconds)...
    timeout /t 30 /nobreak >nul
    
    REM Verify server started
    curl -s http://localhost:3000/api/health-check >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Dev server failed to start!
        echo Check the dev server window for errors.
        pause
        exit /b 1
    )
    
    echo ✓ Dev server is ready
    echo.
    echo Running tests...
    npm run test:live
    
    echo.
    echo =====================================
    echo Tests complete!
    echo.
    echo IMPORTANT: Dev server is still running.
    echo To stop it, close the "Next.js Dev Server" window
    echo or press Ctrl+C in that window.
    echo =====================================
)

echo.
pause
@echo off
setlocal enabledelayedexpansion

echo.
echo =====================================
echo   LIVE JEST TESTS - NO MOCKS
echo   100%% Real Ollama and Database
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

REM Check if dev server is running
echo Checking development server...
curl -s http://localhost:3000/api/health-check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Development server not detected at localhost:3000
    echo Some API tests may fail. Start it with: npm run dev
    echo.
)

echo.
echo Starting live Jest tests...
echo This will make REAL calls to Ollama and the database.
echo Tests may take 30-60 seconds per query.
echo.

REM Run the live tests
npm run test:live

if %errorlevel% neq 0 (
    echo.
    echo =====================================
    echo   SOME TESTS FAILED
    echo =====================================
    echo.
    echo This is expected during development.
    echo Check the output above for details.
) else (
    echo.
    echo =====================================
    echo   ALL TESTS PASSED! 
    echo =====================================
)

echo.
pause
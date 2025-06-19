@echo off
echo === OLLAMA SETUP FOR CHAT TESTING ===
echo.

echo [1] Checking if Ollama is already running...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo Ollama is already running ✓
    echo.
    echo Checking for tinyllama model...
    curl -s http://localhost:11434/api/tags | findstr "tinyllama" >nul 2>&1
    if %errorlevel% equ 0 (
        echo tinyllama model is available ✓
        echo.
        echo Ollama is ready for chat testing!
        pause
        exit /b 0
    ) else (
        echo tinyllama model not found
        goto PULL_MODEL
    )
)

echo Ollama is not running
echo.

echo [2] Starting Ollama in Docker...
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo Ollama container might already exist, trying to start it...
    docker start ollama >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Failed to start Ollama
        echo.
        echo Try running manually:
        echo   docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
        pause
        exit /b 1
    )
)

echo Waiting for Ollama to start (10 seconds)...
timeout /t 10 /nobreak >nul

:PULL_MODEL
echo.
echo [3] Pulling tinyllama model...
docker exec ollama ollama pull tinyllama

if %errorlevel% neq 0 (
    echo ERROR: Failed to pull tinyllama model
    echo.
    echo Try running manually:
    echo   docker exec ollama ollama pull tinyllama
    pause
    exit /b 1
)

echo.
echo [4] Verifying setup...
curl -s http://localhost:11434/api/tags | findstr "tinyllama" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ✓ Ollama is running on http://localhost:11434
    echo ✓ tinyllama model is available
    echo.
    echo Chat AI testing is ready!
) else (
    echo WARNING: Setup completed but model verification failed
    echo Chat may fall back to database queries
)

echo.
pause
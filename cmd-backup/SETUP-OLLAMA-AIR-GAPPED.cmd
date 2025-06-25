@echo off
echo ========================================
echo Air-Gapped Ollama Setup for Manufacturing Chat
echo ========================================
echo.

:: Check if Ollama is installed
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Ollama is not installed!
    echo.
    echo Please install Ollama first:
    echo 1. Download installer from https://ollama.ai
    echo 2. Run the installer
    echo 3. Restart this script
    echo.
    pause
    exit /b 1
)

echo Ollama found. Starting setup...
echo.

:: Start Ollama service
echo Starting Ollama service...
start /B ollama serve

:: Wait for service to start
echo Waiting for Ollama to start...
timeout /t 5 /nobreak >nul

:: Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Ollama service may not be running properly
    echo Trying to start manually...
    start cmd /k ollama serve
    timeout /t 5 /nobreak >nul
)

echo.
echo Downloading optimized models for air-gapped use...
echo.

:: Download fast model (2B parameters)
echo [1/3] Downloading Gemma 2B (fastest responses)...
ollama pull gemma:2b-instruct-q4_K_M

:: Download balanced model (7B parameters)
echo.
echo [2/3] Downloading Mistral 7B (balanced performance)...
ollama pull mistral:7b-instruct-q4_K_M

:: Download code model (optional)
echo.
echo [3/3] Downloading CodeLlama 7B (for code queries)...
ollama pull codellama:7b-instruct-q4_K_M

echo.
echo ========================================
echo Model Download Complete!
echo ========================================
echo.
echo Models installed:
ollama list

echo.
echo ========================================
echo Performance Optimization
echo ========================================
echo.

:: Set environment variables for optimal performance
setx OLLAMA_NUM_PARALLEL 2
setx OLLAMA_MAX_LOADED_MODELS 2
setx OLLAMA_KEEP_ALIVE "24h"
setx OLLAMA_HOST "127.0.0.1:11434"

echo Environment variables set for optimal performance.
echo.

:: Create cache directory
if not exist "cache" mkdir cache
echo Cache directory created.
echo.

:: Install npm dependencies
echo Installing required npm packages...
call npm install

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Keep this window open (Ollama is running)
echo 2. In a new terminal, run: npm run dev
echo 3. Navigate to: http://localhost:3000/ai-chat
echo.
echo Performance tips:
echo - First response may be slow (model loading)
echo - Subsequent responses will be much faster
echo - Cache will improve response times
echo.
echo Press any key to keep Ollama running...
pause >nul
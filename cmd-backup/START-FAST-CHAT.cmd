@echo off
echo ========================================
echo Fast Chat Setup for Manufacturing Platform
echo ========================================
echo.

:: Check if Ollama is installed
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not installed!
    echo.
    echo Please install Ollama from: https://ollama.ai/download
    echo.
    pause
    exit /b 1
)

:: Start Ollama service
echo Starting Ollama service...
start /B ollama serve

:: Wait for Ollama to start
echo Waiting for Ollama to start...
timeout /t 3 /nobreak >nul

:: Check if Ollama is running
curl -s http://127.0.0.1:11434/api/tags >nul 2>nul
if %errorlevel% neq 0 (
    echo Ollama is starting up, please wait...
    timeout /t 5 /nobreak >nul
)

:: Pull fast model if not exists
echo.
echo Checking for gemma:2b model...
ollama list | findstr "gemma:2b" >nul
if %errorlevel% neq 0 (
    echo Downloading gemma:2b (fast, lightweight model)...
    echo This may take a few minutes on first run...
    ollama pull gemma:2b
) else (
    echo gemma:2b model already installed!
)

:: Test the model
echo.
echo Testing the model...
echo {"model": "gemma:2b", "prompt": "Say hello", "stream": false} | curl -s -X POST http://127.0.0.1:11434/api/generate -d @- | findstr "response" >nul
if %errorlevel% equ 0 (
    echo.
    echo ✓ Chat service is ready!
    echo.
    echo You can now use the chat at: http://localhost:3000/ai-chat
    echo Using fast endpoint: /api/chat/fast
    echo.
) else (
    echo.
    echo ⚠ Model test failed. Please check Ollama logs.
    echo.
)

echo Press any key to exit...
pause >nul
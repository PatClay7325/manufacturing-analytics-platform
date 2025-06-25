@echo off
echo ======================================
echo Complete Ollama Setup for AI Chat
echo ======================================
echo.

REM Kill any existing Ollama processes
echo Stopping any existing Ollama processes...
taskkill /F /IM ollama.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Set the host to match .env.local
echo Setting Ollama host to 127.0.0.1:11434...
set OLLAMA_HOST=127.0.0.1:11434

REM Start Ollama in background
echo Starting Ollama service...
start /B ollama serve

echo Waiting for Ollama to start...
timeout /t 5 /nobreak >nul

REM Test connection
echo.
echo Testing connection...
:retry
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for Ollama to start...
    timeout /t 2 /nobreak >nul
    goto retry
)

echo ✓ Ollama is running!
echo.

REM Check for gemma:2b model
echo Checking for gemma:2b model...
ollama list | findstr "gemma:2b" >nul 2>&1
if %errorlevel%==0 (
    echo ✓ gemma:2b model is already installed
) else (
    echo Installing gemma:2b model (this may take a few minutes)...
    ollama pull gemma:2b
    if %errorlevel%==0 (
        echo ✓ Model installed successfully!
    ) else (
        echo ✗ Failed to install model. Please try manually: ollama pull gemma:2b
    )
)

echo.
echo ======================================
echo ✓ Ollama Setup Complete!
echo ======================================
echo.
echo Ollama API: http://127.0.0.1:11434
echo Default Model: gemma:2b
echo.
echo You can now use the AI Chat at:
echo http://localhost:3000/ai-chat
echo.
echo To test the chat API:
echo curl http://localhost:3000/api/chat/test
echo.
pause
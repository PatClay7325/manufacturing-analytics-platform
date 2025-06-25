@echo off
echo ======================================
echo Starting Ollama for AI Chat
echo ======================================
echo.

REM Check if Ollama is already running
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo Ollama is already running!
    goto :check_model
)

echo Starting Ollama service...
start /B ollama serve

echo Waiting for Ollama to start...
timeout /t 5 /nobreak >nul

:check_model
echo.
echo Checking for gemma:2b model...
ollama list | findstr "gemma:2b" >nul 2>&1
if %errorlevel%==0 (
    echo ✓ gemma:2b model is already installed
) else (
    echo Installing gemma:2b model...
    echo This may take a few minutes on first download...
    ollama pull gemma:2b
)

echo.
echo ======================================
echo ✓ Ollama is ready!
echo ======================================
echo.
echo You can now use the AI Chat at:
echo http://localhost:3000/ai-chat
echo.
echo Available models:
ollama list
echo.
pause
@echo off
echo ======================================
echo AI Chat Connection Test
echo ======================================
echo.

echo 1. Testing Ollama connection...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Ollama is running
    echo.
    echo    Available models:
    curl -s http://localhost:11434/api/tags | findstr "name"
) else (
    echo    ✗ Ollama is NOT running
    echo.
    echo    To fix:
    echo    1. Open a new terminal
    echo    2. Run: ollama serve
    echo    3. Wait 5 seconds and try again
)

echo.
echo 2. Testing Chat API endpoint...
curl -s http://localhost:3000/api/chat/test
if %errorlevel%==0 (
    echo.
    echo    ✓ Chat API is accessible
) else (
    echo    ✗ Chat API not responding
)

echo.
echo ======================================
echo Quick Fix Steps:
echo ======================================
echo.
echo 1. Start Ollama:
echo    ollama serve
echo.
echo 2. Pull the model:
echo    ollama pull gemma:2b
echo.
echo 3. Visit the chat:
echo    http://localhost:3000/ai-chat
echo.
pause
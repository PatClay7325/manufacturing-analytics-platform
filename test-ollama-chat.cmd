@echo off
echo Testing Ollama Chat API...
echo.

echo 1. Checking Ollama status...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Ollama is running
) else (
    echo    ✗ Ollama is NOT running
    echo    Please run: ollama serve
    pause
    exit /b 1
)

echo.
echo 2. Testing chat endpoint...
curl -X POST http://127.0.0.1:11434/api/chat -H "Content-Type: application/json" -d "{\"model\": \"gemma:2b\", \"messages\": [{\"role\": \"user\", \"content\": \"Say hello\"}], \"stream\": false}" -s > chat_response.json

echo.
echo 3. Response received:
type chat_response.json

echo.
echo.
echo If you see a JSON response with "message" content, Ollama is working correctly!
echo.
pause
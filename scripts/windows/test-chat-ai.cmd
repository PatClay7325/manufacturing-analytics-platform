@echo off
echo =====================================================
echo    TEST CHAT AI CONNECTION
echo =====================================================
echo.

echo [1] Testing Ollama direct connection...
echo.

curl -X POST http://localhost:11434/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"tinyllama\", \"messages\": [{\"role\": \"user\", \"content\": \"What is 2+2?\"}], \"stream\": false}"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Ollama is not responding!
    echo.
    echo Please ensure:
    echo 1. Docker is running
    echo 2. Ollama container is running: docker ps
    echo 3. Tinyllama model is installed
    echo.
    echo To fix:
    echo   docker start ollama
    echo   docker exec ollama ollama pull tinyllama
    pause
    exit /b 1
)

echo.
echo.
echo ✓ Ollama is working!
echo.

echo [2] Testing Chat API endpoint...
echo.

curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\": \"test-session\", \"messages\": [{\"role\": \"user\", \"content\": \"Show me the enterprise OEE\"}]}"

echo.
echo.
echo [3] Chat AI Status:
echo.
echo If you see a proper response above, the chat AI is working!
echo If you see the fallback message about "unable to connect", then:
echo.
echo 1. Restart your dev server (Ctrl+C then npm run dev)
echo 2. Make sure .env.local has:
echo    OLLAMA_API_URL=http://localhost:11434
echo    OLLAMA_MODEL=tinyllama
echo.
pause
@echo off
echo ===============================================
echo    STREAMING CHAT DEBUGGING
echo ===============================================
echo.

echo [1] Checking Ollama container...
docker ps --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo [2] Testing Ollama API directly...
curl -s -X POST http://localhost:11434/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"gemma:2b\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello\"}],\"stream\":false}" ^
  | jq -r ".message.content" 2>nul || echo "Ollama API test failed"
echo.

echo [3] Available models in Ollama...
curl -s http://localhost:11434/api/tags | jq -r ".models[].name" 2>nul || echo "No models found"
echo.

echo ===============================================
echo    NEXT STEPS
echo ===============================================
echo.
echo 1. Start your Next.js dev server:
echo    npm run dev
echo.
echo 2. Visit the test page:
echo    http://localhost:3000/test-chat
echo.
echo 3. Try each test button to see which endpoints work
echo.
echo 4. For the optimized chat page, visit:
echo    http://localhost:3000/manufacturing-chat/optimized
echo.
echo If streaming doesn't work, check:
echo - Browser console for errors
echo - Network tab to see the actual responses
echo - Terminal running 'npm run dev' for server errors
echo.
pause
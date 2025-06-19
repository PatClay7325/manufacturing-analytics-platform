@echo off
echo === SIMPLE OLLAMA FIX ===
echo.

echo Step 1: Check if Ollama is accessible...
curl -s http://localhost:11434/api/version

echo.
echo Step 2: If you see a version above, Ollama is running!
echo         Now we just need to install tinyllama...
echo.

echo Step 3: Try to install tinyllama (multiple methods)...
echo.

echo Method A: Via Docker...
docker exec ollama ollama pull tinyllama 2>nul

echo Method B: Via direct Ollama command...
ollama pull tinyllama 2>nul

echo Method C: Force pull with curl...
curl -X POST http://localhost:11434/api/pull -d "{\"name\": \"tinyllama\"}" 2>nul

echo.
echo Step 4: List available models...
curl -s http://localhost:11434/api/tags

echo.
echo Step 5: Test tinyllama...
curl -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"tinyllama\", \"prompt\": \"Hello\", \"stream\": false}"

echo.
echo.
echo FINAL STEPS:
echo 1. If you see a response above, Ollama is working!
echo 2. Make sure .env.local has:
echo    OLLAMA_API_URL=http://localhost:11434
echo    OLLAMA_MODEL=tinyllama
echo 3. RESTART your dev server (Ctrl+C then npm run dev)
echo 4. Test at http://localhost:3000/manufacturing-chat
echo.
pause
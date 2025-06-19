@echo off
echo === OLLAMA STATUS CHECK ===
echo.

echo [1] Docker containers:
docker ps | findstr "ollama"
echo.

echo [2] Ollama models:
docker exec ollama ollama list 2>nul
echo.

echo [3] Test tinyllama:
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\": \"tinyllama\", \"prompt\": \"Say hello\", \"stream\": false}" 2>nul
echo.
echo.

echo [4] Port check:
netstat -an | findstr "11434" | findstr "LISTENING"
echo.

echo If you see:
echo - Ollama container running ✓
echo - tinyllama in model list ✓ 
echo - Response from test ✓
echo - Port 11434 listening ✓
echo.
echo Then Ollama is properly set up!
echo.
pause
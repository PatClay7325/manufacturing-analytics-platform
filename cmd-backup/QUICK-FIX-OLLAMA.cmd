@echo off
echo ===============================================
echo    QUICK FIX FOR OLLAMA
echo ===============================================
echo.

echo Your Ollama container (manufacturing-ollama-optimized) is running!
echo Let's make sure everything is working...
echo.

echo [1] Waiting for Ollama to fully initialize (30 seconds)...
timeout /t 30 /nobreak

echo.
echo [2] Checking Ollama API...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:11434/api/tags
echo.

echo [3] Installing Gemma:2B if needed...
docker exec manufacturing-ollama-optimized ollama pull gemma:2b 2>nul
if %errorlevel% equ 0 (
    echo ✅ Gemma:2B is ready!
) else (
    echo Trying alternative approach...
    docker exec manufacturing-ollama-optimized sh -c "ollama pull gemma:2b"
)

echo.
echo [4] Creating test model...
docker exec manufacturing-ollama-optimized sh -c "echo 'FROM gemma:2b' | ollama create test-gemma -" 2>nul

echo.
echo [5] Quick test...
curl -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"gemma:2b\", \"prompt\": \"Hello\", \"stream\": false}" ^
  --connect-timeout 5 ^
  --max-time 30

echo.
echo.
echo If you see a response above, Ollama is working!
echo.
echo Next: Run UPDATE-ENV-FOR-OLLAMA.cmd to update your .env.local
echo.
pause
@echo off
echo =====================================================
echo    FIX CHAT AI CONNECTION
echo =====================================================
echo.

echo [1] Checking Ollama service...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not running!
    echo Starting Ollama...
    docker start ollama 2>nul || docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
    timeout /t 10 /nobreak >nul
)

echo.
echo [2] Checking available models...
echo Available models in Ollama:
curl -s http://localhost:11434/api/tags | findstr "name"

echo.
echo [3] Updating environment variables...
echo OLLAMA_API_URL="http://localhost:11434" >> .env.local
echo OLLAMA_MODEL="tinyllama" >> .env.local

echo.
echo [4] Creating a temporary fix for the hardcoded model...
echo.

REM Create a patch file to fix the model name
echo const OLLAMA_MODEL = process.env.OLLAMA_MODEL ^|^| 'tinyllama'; > temp-fix.txt

echo.
echo [5] Testing Ollama connection...
curl -X POST http://localhost:11434/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"tinyllama\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}], \"stream\": false}" >nul 2>&1

if %errorlevel% equ 0 (
    echo ✓ Ollama is responding correctly
) else (
    echo ❌ Ollama test failed
    echo.
    echo Trying to pull tinyllama model...
    docker exec ollama ollama pull tinyllama
)

echo.
echo [6] Restarting the development server...
echo.
echo Please restart your dev server for changes to take effect:
echo 1. Press Ctrl+C in the terminal running npm run dev
echo 2. Run: npm run dev
echo.
echo The chat should now work with AI responses!
echo.
pause
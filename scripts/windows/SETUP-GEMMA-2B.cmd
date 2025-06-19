@echo off
echo ===============================================
echo    SETUP GEMMA:2B FOR MANUFACTURING CHAT
echo ===============================================
echo.

echo [1] Checking if Ollama is running...
curl -s http://localhost:11434/api/tags > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not running!
    echo Please start Ollama first with: ollama serve
    echo.
    pause
    exit /b 1
)

echo ✓ Ollama is running
echo.

echo [2] Pulling Gemma:2b model...
echo This may take a few minutes on first download...
ollama pull gemma:2b

if %errorlevel% neq 0 (
    echo ERROR: Failed to pull Gemma:2b model
    pause
    exit /b 1
)

echo.
echo ✓ Gemma:2b model downloaded successfully
echo.

echo [3] Testing Gemma:2b model...
echo "Testing model with a simple query..."
echo.

curl -X POST http://localhost:11434/api/generate -d "{\"model\": \"gemma:2b\", \"prompt\": \"Hello, testing Gemma 2B. Please respond briefly.\", \"stream\": false}" -H "Content-Type: application/json"

echo.
echo.
echo ===============================================
echo    CONFIGURATION COMPLETE
echo ===============================================
echo.
echo Gemma:2b is now ready to use!
echo.
echo To use it in your Manufacturing Analytics Platform:
echo 1. Update your .env file:
echo    OLLAMA_DEFAULT_MODEL=gemma:2b
echo.
echo 2. Or update .env.local:
echo    OLLAMA_DEFAULT_MODEL=gemma:2b
echo.
echo 3. Restart your development server
echo.
pause
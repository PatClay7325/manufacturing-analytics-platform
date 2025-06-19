@echo off
echo ===============================================
echo    CHECK OLLAMA CONFIGURATION
echo ===============================================
echo.

echo [1] Checking Ollama service status...
curl -s http://localhost:11434/api/tags > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is NOT running
    echo    Start it with: ollama serve
) else (
    echo ✅ Ollama is running on port 11434
)

echo.
echo [2] Available models:
echo.
curl -s http://localhost:11434/api/tags | jq -r ".models[].name" 2>nul || (
    echo Unable to list models. Make sure jq is installed or check manually with:
    echo curl http://localhost:11434/api/tags
)

echo.
echo [3] Current environment configuration:
echo.
echo Checking .env files for OLLAMA settings...
echo.

if exist .env (
    echo From .env:
    findstr /i "OLLAMA" .env
    echo.
)

if exist .env.local (
    echo From .env.local:
    findstr /i "OLLAMA" .env.local
    echo.
)

if exist .env.production (
    echo From .env.production:
    findstr /i "OLLAMA" .env.production
    echo.
)

echo.
echo [4] To use Gemma:2b model:
echo    1. Run SETUP-GEMMA-2B.cmd to download the model
echo    2. Add to your .env.local file:
echo       OLLAMA_DEFAULT_MODEL=gemma:2b
echo    3. Restart your development server
echo.

pause
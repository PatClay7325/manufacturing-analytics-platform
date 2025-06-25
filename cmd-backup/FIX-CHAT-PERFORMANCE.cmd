@echo off
echo ===================================
echo Chat Performance Fix Script
echo ===================================

REM 1. Check if Ollama is installed
echo.
echo [1/5] Checking Ollama installation...
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not installed!
    echo Please install Ollama from https://ollama.ai/download
    pause
    exit /b 1
)
echo ✓ Ollama is installed

REM 2. Start Ollama service
echo.
echo [2/5] Starting Ollama service...
start /B ollama serve
timeout /t 5 /nobreak >nul
echo ✓ Ollama service started

REM 3. Pull the lightweight model
echo.
echo [3/5] Pulling Gemma 2B model (this may take a few minutes)...
ollama pull gemma2:2b
if %errorlevel% neq 0 (
    echo ERROR: Failed to pull model
    echo Trying alternative model...
    ollama pull tinyllama
)
echo ✓ Model downloaded

REM 4. Test Ollama connection
echo.
echo [4/5] Testing Ollama connection...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to Ollama
    echo Please ensure Ollama is running on port 11434
    pause
    exit /b 1
)
echo ✓ Ollama is accessible

REM 5. Update environment configuration
echo.
echo [5/5] Updating environment configuration...
if not exist .env.local (
    copy .env.local.example .env.local >nul 2>&1
)

REM Add optimized settings
echo. >> .env.local
echo # Performance optimizations added by fix script >> .env.local
echo OLLAMA_API_URL=http://localhost:11434 >> .env.local
echo OLLAMA_DEFAULT_MODEL=gemma2:2b >> .env.local
echo OLLAMA_USE_STREAMING=true >> .env.local
echo OLLAMA_MAX_CONTEXT=1024 >> .env.local
echo OLLAMA_TIMEOUT=30000 >> .env.local
echo OLLAMA_NUM_THREADS=4 >> .env.local
echo NEXT_PUBLIC_DISABLE_MOCKS=true >> .env.local
echo ✓ Environment configured

echo.
echo ===================================
echo Performance fixes applied!
echo ===================================
echo.
echo Next steps:
echo 1. Restart your development server (npm run dev)
echo 2. Test the chat at http://localhost:3000/ai-chat
echo 3. Monitor the console for performance logs
echo.
echo Tips for best performance:
echo - Use simple, direct questions
echo - Avoid very long conversations
echo - Clear chat history periodically
echo.
pause
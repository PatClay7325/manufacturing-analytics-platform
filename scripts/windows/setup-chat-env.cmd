@echo off
echo =====================================================
echo    SETUP CHAT ENVIRONMENT
echo =====================================================
echo.

echo [1] Creating .env.local with proper AI settings...

echo # Database Configuration > .env.local
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing" >> .env.local
echo DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing" >> .env.local
echo. >> .env.local
echo # AI/Ollama Configuration >> .env.local
echo OLLAMA_API_URL="http://localhost:11434" >> .env.local
echo OLLAMA_MODEL="tinyllama" >> .env.local
echo. >> .env.local
echo # API Configuration >> .env.local
echo NEXT_PUBLIC_API_URL="http://localhost:3000/api" >> .env.local

echo.
echo [2] Verifying Ollama is running with tinyllama...

docker exec ollama ollama list 2>nul | findstr "tinyllama" >nul
if %errorlevel% neq 0 (
    echo Pulling tinyllama model...
    docker exec ollama ollama pull tinyllama
) else (
    echo ✓ Tinyllama model is already installed
)

echo.
echo [3] Environment setup complete!
echo.
echo IMPORTANT: You must restart your dev server for changes to take effect!
echo.
echo 1. Stop the current dev server (Ctrl+C)
echo 2. Run: npm run dev
echo 3. Test chat at: http://localhost:3000/manufacturing-chat
echo.
echo The chat should now provide AI responses instead of the fallback message.
echo.
pause
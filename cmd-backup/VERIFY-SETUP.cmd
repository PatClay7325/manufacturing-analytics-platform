@echo off
echo ===============================================
echo    VERIFY OLLAMA STREAMING SETUP
echo ===============================================
echo.

set PASS=0
set FAIL=0

echo [1] Checking environment configuration...
if exist .env.local (
    findstr "OLLAMA_USE_STREAMING=true" .env.local >nul
    if %errorlevel% equ 0 (
        echo ✓ Streaming is enabled
        set /a PASS+=1
    ) else (
        echo ❌ Streaming is not enabled
        set /a FAIL+=1
    )
    
    findstr "OLLAMA_DEFAULT_MODEL=gemma:2b" .env.local >nul
    if %errorlevel% equ 0 (
        echo ✓ Gemma:2B is set as default model
        set /a PASS+=1
    ) else (
        echo ❌ Gemma:2B is not set as default
        set /a FAIL+=1
    )
    
    findstr "OLLAMA_MAX_CONTEXT=2048" .env.local >nul
    if %errorlevel% equ 0 (
        echo ✓ Context optimization is enabled
        set /a PASS+=1
    ) else (
        echo ❌ Context optimization is not enabled
        set /a FAIL+=1
    )
) else (
    echo ❌ .env.local not found!
    set /a FAIL+=3
)

echo.
echo [2] Checking Docker and Ollama...
docker ps | findstr manufacturing-ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Ollama container is running
    set /a PASS+=1
) else (
    echo ❌ Ollama container is not running
    set /a FAIL+=1
)

echo.
echo [3] Checking Ollama API...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Ollama API is accessible
    set /a PASS+=1
) else (
    echo ❌ Ollama API is not responding
    set /a FAIL+=1
)

echo.
echo [4] Checking Gemma:2B model...
curl -s http://localhost:11434/api/tags 2>nul | findstr "gemma:2b" >nul
if %errorlevel% equ 0 (
    echo ✓ Gemma:2B model is installed
    set /a PASS+=1
) else (
    echo ❌ Gemma:2B model is not installed
    set /a FAIL+=1
)

echo.
echo [5] Testing streaming response...
echo Testing streaming capability...
curl -X POST http://localhost:11434/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"gemma:2b\", \"messages\": [{\"role\": \"user\", \"content\": \"Say 'Streaming works!'\"}], \"stream\": true}" ^
  2>nul | findstr "content" >nul
if %errorlevel% equ 0 (
    echo ✓ Streaming responses work
    set /a PASS+=1
) else (
    echo ❌ Streaming test failed
    set /a FAIL+=1
)

echo.
echo ===============================================
echo    VERIFICATION RESULTS
echo ===============================================
echo.
echo Passed: %PASS% checks
echo Failed: %FAIL% checks
echo.

if %FAIL% equ 0 (
    echo 🎉 ALL CHECKS PASSED! Your setup is complete.
    echo.
    echo You can now:
    echo 1. Run: npm run dev
    echo 2. Visit: http://localhost:3000/manufacturing-chat
    echo 3. Enjoy fast, streaming responses!
) else (
    echo ⚠ Some checks failed. Please:
    echo.
    if not exist .env.local (
        echo - Run COMPLETE-SETUP.cmd to create .env.local
    )
    docker ps | findstr manufacturing-ollama >nul 2>&1
    if %errorlevel% neq 0 (
        echo - Start Ollama: docker-compose up -d ollama
    )
    curl -s http://localhost:11434/api/tags 2>nul | findstr "gemma:2b" >nul
    if %errorlevel% neq 0 (
        echo - Install Gemma:2B: docker exec manufacturing-ollama ollama pull gemma:2b
    )
)

echo.
pause
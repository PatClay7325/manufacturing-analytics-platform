@echo off
echo ===============================================
echo    SIMPLE OLLAMA SETUP
echo ===============================================
echo.

echo [1] Cleaning up any existing containers...
docker stop manufacturing-ollama manufacturing-ollama-optimized 2>nul
docker rm manufacturing-ollama manufacturing-ollama-optimized 2>nul
echo ✓ Cleanup complete

echo.
echo [2] Starting Ollama with simple configuration...
docker run -d ^
  --name manufacturing-ollama ^
  -p 11434:11434 ^
  -v ollama:/root/.ollama ^
  --restart always ^
  ollama/ollama

if %errorlevel% neq 0 (
    echo ❌ Failed to start Ollama
    echo.
    echo Trying with docker-compose...
    docker-compose up -d ollama
)

echo.
echo [3] Waiting for Ollama to start...
echo This may take up to 60 seconds...

set attempts=0
:WAIT_LOOP
set /a attempts+=1
if %attempts% gtr 20 goto TIMEOUT

timeout /t 3 /nobreak >nul
curl -s http://localhost:11434 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama is running!
    goto INSTALL_MODEL
)
echo    Waiting... (attempt %attempts%/20)
goto WAIT_LOOP

:TIMEOUT
echo ⚠️  Ollama is taking longer than expected
echo Checking logs...
docker logs manufacturing-ollama --tail 20
goto CHECK_ANYWAY

:INSTALL_MODEL
echo.
echo [4] Installing Gemma:2B model...
docker exec manufacturing-ollama ollama pull gemma:2b
if %errorlevel% equ 0 (
    echo ✅ Gemma:2B installed successfully!
) else (
    echo ⚠️  Model installation failed, but you can install it later
)

:CHECK_ANYWAY
echo.
echo [5] Final status check...
docker ps --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo [6] Testing API...
curl http://localhost:11434/api/tags 2>nul

echo.
echo ===============================================
echo    SETUP SUMMARY
echo ===============================================
echo.
echo Container: manufacturing-ollama
echo API URL: http://localhost:11434
echo Model: gemma:2b
echo.
echo To test manually:
echo   curl http://localhost:11434/api/tags
echo.
echo To check logs:
echo   docker logs manufacturing-ollama
echo.
echo To enter container:
echo   docker exec -it manufacturing-ollama /bin/bash
echo.
pause
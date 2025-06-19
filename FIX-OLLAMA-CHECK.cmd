@echo off
echo ===============================================
echo    CHECKING OLLAMA SETUP
echo ===============================================
echo.

echo [1] Looking for Ollama containers...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr ollama
echo.

echo [2] Checking which container is actually running...
docker ps | findstr ollama >temp_ollama.txt
set /p CONTAINER_NAME=<temp_ollama.txt
del temp_ollama.txt

if "%CONTAINER_NAME%"=="" (
    echo ❌ No Ollama container found running
    pause
    exit /b 1
)

echo Found Ollama container running!
echo.

echo [3] Testing Ollama API on port 11434...
curl -s http://localhost:11434 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama API is responding!
) else (
    echo ❌ Ollama API not responding on default port
    echo.
    echo Checking container logs...
    docker logs manufacturing-ollama-optimized --tail 20
)

echo.
echo [4] Listing available models...
docker exec manufacturing-ollama-optimized ollama list
if %errorlevel% neq 0 (
    echo.
    echo Trying alternative container name...
    docker exec manufacturing-ollama ollama list
)

echo.
echo [5] Testing Gemma:2B model directly...
docker exec manufacturing-ollama-optimized ollama run gemma:2b "Say 'Hello, I am working!'" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Gemma:2B may still be loading or needs to be pulled
    echo.
    echo Pulling Gemma:2B now...
    docker exec manufacturing-ollama-optimized ollama pull gemma:2b
)

echo.
echo [6] Testing API with curl...
curl -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"gemma:2b\", \"prompt\": \"Test response\", \"stream\": false}" ^
  --max-time 30

echo.
echo ===============================================
echo    DIAGNOSTICS COMPLETE
echo ===============================================
echo.
echo If Ollama is not responding:
echo 1. Wait 1-2 more minutes for model to load
echo 2. Check Docker Desktop - ensure no resource limits
echo 3. Try: docker restart manufacturing-ollama-optimized
echo.
pause
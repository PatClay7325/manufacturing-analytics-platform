@echo off
echo ===============================================
echo    TEST OLLAMA API
echo ===============================================
echo.

echo [1] Basic connectivity test...
echo Testing: http://localhost:11434
curl -I http://localhost:11434 2>nul | findstr "200 OK"
if %errorlevel% equ 0 (
    echo ✅ Ollama server is responding
) else (
    echo ❌ Ollama server not responding
    echo.
    echo Checking if container is running...
    docker ps | findstr ollama
    pause
    exit /b 1
)

echo.
echo [2] API endpoint test...
echo Testing: http://localhost:11434/api/tags
curl -s http://localhost:11434/api/tags > test_result.json 2>nul
if exist test_result.json (
    type test_result.json | findstr "models" >nul
    if %errorlevel% equ 0 (
        echo ✅ API is working!
        echo.
        echo Available models:
        type test_result.json
    ) else (
        echo ❌ API returned unexpected response
        type test_result.json
    )
    del test_result.json
) else (
    echo ❌ Could not reach API
)

echo.
echo [3] Testing Gemma:2B model...
echo Sending test prompt...
echo.

curl -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"gemma:2b\", \"prompt\": \"Say hello in 5 words or less\", \"stream\": false}" ^
  --max-time 60 ^
  -w "\n\nResponse time: %%{time_total}s\n" 2>nul

echo.
echo [4] Testing streaming capability...
echo.
echo Sending streaming request (you should see text appear gradually)...
echo.

curl -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"gemma:2b\", \"prompt\": \"Count from 1 to 5 slowly\", \"stream\": true}" ^
  --no-buffer 2>nul

echo.
echo.
echo ===============================================
echo    TEST RESULTS
echo ===============================================
echo.
echo If all tests passed, Ollama is ready to use!
echo.
echo If tests failed:
echo 1. Ensure Docker is running
echo 2. Check container: docker ps
echo 3. View logs: docker logs manufacturing-ollama-optimized
echo 4. Restart: docker restart manufacturing-ollama-optimized
echo.
pause
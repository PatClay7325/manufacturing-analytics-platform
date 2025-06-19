@echo off
echo ===============================================
echo    START OPTIMIZED OLLAMA FOR LOW RESOURCES
echo ===============================================
echo.
echo This configuration is optimized for:
echo - Limited RAM (4GB or less for Ollama)
echo - CPU-only inference
echo - Streaming responses
echo - Response caching
echo.

echo [1] Checking system resources...
wmic OS get TotalVisibleMemorySize /value | find "=" 
wmic cpu get NumberOfCores /value | find "="
echo.

echo [2] Stopping any existing Ollama containers...
docker stop manufacturing-ollama 2>nul
docker stop manufacturing-ollama-optimized 2>nul
docker rm manufacturing-ollama 2>nul
docker rm manufacturing-ollama-optimized 2>nul

echo.
echo [3] Creating local data directory...
if not exist "ollama-data" mkdir ollama-data

echo.
echo [4] Copying optimized environment file...
copy .env.ollama-optimized .env.local
echo Updated .env.local with optimized settings

echo.
echo [5] Starting optimized Ollama container...
docker-compose -f docker/compose/docker-compose.ollama-optimized.yml up -d

echo.
echo [6] Waiting for Ollama to initialize (this may take 1-2 minutes)...
timeout /t 20 /nobreak >nul

echo.
echo [7] Checking Ollama status...
curl -s http://localhost:11434/api/tags
if %errorlevel% neq 0 (
    echo.
    echo ⚠ Ollama is still starting. Checking logs...
    docker logs manufacturing-ollama-optimized --tail 20
) else (
    echo.
    echo ✅ Ollama is running!
)

echo.
echo ===============================================
echo    OPTIMIZED OLLAMA SETUP COMPLETE
echo ===============================================
echo.
echo Performance optimizations applied:
echo ✓ CPU-only mode (no GPU required)
echo ✓ Limited to 4GB RAM maximum
echo ✓ Single model in memory
echo ✓ Streaming responses enabled
echo ✓ Response caching enabled
echo ✓ Reduced context window (2048 tokens)
echo.
echo Your app will now use these optimized settings.
echo.
echo To monitor performance:
echo   docker stats manufacturing-ollama-optimized
echo.
echo To view logs:
echo   docker logs manufacturing-ollama-optimized
echo.
pause
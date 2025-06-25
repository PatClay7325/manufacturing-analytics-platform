@echo off
echo ======================================
echo Ollama Connection Diagnostics
echo ======================================
echo.

echo Testing Ollama on different addresses...
echo.

echo 1. Testing http://localhost:11434
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Ollama responds on localhost:11434
) else (
    echo    ✗ No response on localhost:11434
)

echo.
echo 2. Testing http://127.0.0.1:11434
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Ollama responds on 127.0.0.1:11434
) else (
    echo    ✗ No response on 127.0.0.1:11434
)

echo.
echo 3. Checking if Ollama process is running...
tasklist /FI "IMAGENAME eq ollama*" 2>NUL | find /I /N "ollama">NUL
if %errorlevel%==0 (
    echo    ✓ Ollama process found
) else (
    echo    ✗ Ollama process NOT found
)

echo.
echo ======================================
echo To Start Ollama:
echo ======================================
echo.
echo Option 1 - Normal start:
echo   ollama serve
echo.
echo Option 2 - With specific host:
echo   set OLLAMA_HOST=127.0.0.1:11434
echo   ollama serve
echo.
echo Option 3 - In background:
echo   start /B ollama serve
echo.
echo After starting, run:
echo   ollama pull gemma:2b
echo.
pause
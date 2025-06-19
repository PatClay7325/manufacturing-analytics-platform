@echo off
echo =====================================================
echo    FIX OLLAMA PORT CONFLICT
echo =====================================================
echo.

echo [1] Checking what's using port 11434...
netstat -ano | findstr :11434
echo.

echo [2] Checking for existing Ollama containers...
docker ps -a | findstr ollama
echo.

echo [3] Stopping and removing old Ollama containers...
docker stop ollama 2>nul
docker rm ollama 2>nul
echo Old containers cleaned up

echo.
echo [4] Checking if port is free now...
netstat -ano | findstr :11434 >nul 2>&1
if %errorlevel% equ 0 (
    echo Port 11434 is still in use!
    echo.
    echo Trying to find the process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :11434 ^| findstr LISTENING') do (
        echo Process ID using port: %%a
        tasklist | findstr %%a
    )
    echo.
    echo You may need to manually stop this process or use a different port
) else (
    echo Port 11434 is now free ✓
)

echo.
echo [5] Starting fresh Ollama container...
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama

if %errorlevel% neq 0 (
    echo.
    echo Failed to start Ollama. Trying alternative port 11435...
    docker run -d --name ollama -p 11435:11434 -v ollama:/root/.ollama ollama/ollama
    
    echo.
    echo IMPORTANT: Ollama is now running on port 11435
    echo Update your .env.local file:
    echo    OLLAMA_API_URL=http://localhost:11435
)

echo.
echo [6] Waiting for Ollama to start...
timeout /t 10 /nobreak >nul

echo.
echo [7] Installing tinyllama model...
docker exec ollama ollama pull tinyllama

echo.
echo [8] Verifying installation...
docker exec ollama ollama list

echo.
echo [9] Testing Ollama...
docker exec ollama ollama run tinyllama "Hello, I am ready to help with manufacturing data!"

echo.
echo =====================================================
echo    OLLAMA SETUP COMPLETE
echo =====================================================
echo.
pause
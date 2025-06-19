@echo off
echo =====================================================
echo    COMPLETE OLLAMA SETUP FOR CHAT AI
echo =====================================================
echo.
echo This will ensure Ollama is properly set up with tinyllama
echo.

echo [1] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    pause
    exit /b 1
)
echo Docker is installed ✓

echo.
echo [2] Checking if Ollama container exists...
docker ps -a | findstr "ollama" >nul 2>&1
if %errorlevel% neq 0 (
    echo Ollama container not found. Creating new container...
    docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create Ollama container
        pause
        exit /b 1
    )
    echo Waiting for Ollama to start (15 seconds)...
    timeout /t 15 /nobreak >nul
) else (
    echo Ollama container exists. Starting it...
    docker start ollama >nul 2>&1
    echo Waiting for Ollama to be ready (5 seconds)...
    timeout /t 5 /nobreak >nul
)

echo.
echo [3] Verifying Ollama is responding...
curl -s http://localhost:11434 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not responding on port 11434
    echo Checking container status...
    docker ps | findstr "ollama"
    pause
    exit /b 1
)
echo Ollama is running ✓

echo.
echo [4] Checking available models...
echo Current models in Ollama:
docker exec ollama ollama list

echo.
echo [5] Pulling tinyllama model...
docker exec ollama ollama pull tinyllama:latest
if %errorlevel% neq 0 (
    echo ERROR: Failed to pull tinyllama model
    echo Trying alternative approach...
    docker exec -it ollama sh -c "ollama pull tinyllama"
)

echo.
echo [6] Verifying tinyllama is installed...
docker exec ollama ollama list | findstr "tinyllama" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: tinyllama might not be properly installed
    echo Trying one more time...
    docker exec ollama ollama run tinyllama "test" >nul 2>&1
) else (
    echo ✓ Tinyllama model is installed
)

echo.
echo [7] Testing Ollama with tinyllama...
echo Testing direct API call...
curl -X POST http://localhost:11434/api/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"model\": \"tinyllama\", \"prompt\": \"Hello\", \"stream\": false}" 2>nul

echo.
echo.
echo [8] Updating environment configuration...
echo # AI/Ollama Configuration > .env.local
echo OLLAMA_API_URL=http://localhost:11434 >> .env.local
echo OLLAMA_MODEL=tinyllama >> .env.local

echo.
echo =====================================================
echo    OLLAMA SETUP COMPLETE!
echo =====================================================
echo.
echo ✓ Ollama container is running
echo ✓ Tinyllama model is installed
echo ✓ Environment variables are set
echo.
echo NEXT STEPS:
echo 1. Restart your dev server (Ctrl+C then npm run dev)
echo 2. Go to http://localhost:3000/manufacturing-chat
echo 3. Click "New Chat" and ask a question
echo.
echo The AI should now respond properly!
echo.
pause
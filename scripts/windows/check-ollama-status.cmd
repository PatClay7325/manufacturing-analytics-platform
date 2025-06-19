@echo off
echo === OLLAMA STATUS CHECK ===
echo.

echo [1] Testing if Ollama is already running...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Ollama is ALREADY RUNNING on port 11434!
    echo.
    
    echo [2] Checking available models...
    curl -s http://localhost:11434/api/tags
    echo.
    
    echo [3] Testing tinyllama model...
    curl -X POST http://localhost:11434/api/generate ^
      -H "Content-Type: application/json" ^
      -d "{\"model\": \"tinyllama\", \"prompt\": \"Hello\", \"stream\": false}"
    
    echo.
    echo.
    if %errorlevel% neq 0 (
        echo Model not found. Installing tinyllama...
        
        echo [4] Finding Ollama process/container...
        docker ps | findstr ollama
        
        REM If it's a Docker container
        docker exec ollama ollama pull tinyllama 2>nul
        
        REM If it's a local installation
        ollama pull tinyllama 2>nul
    )
    
    echo.
    echo OLLAMA IS WORKING! Just restart your dev server.
) else (
    echo ❌ Ollama is NOT running on port 11434
    echo.
    echo Run: fix-ollama-port-conflict.cmd
)

echo.
pause
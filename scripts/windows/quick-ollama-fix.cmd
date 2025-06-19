@echo off
echo === QUICK OLLAMA FIX ===
echo.

echo Starting Ollama container...
docker start ollama 2>nul || docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama

timeout /t 5 /nobreak >nul

echo.
echo Pulling tinyllama (this may take a few minutes)...
docker exec ollama ollama pull tinyllama

echo.
echo Testing...
docker exec ollama ollama run tinyllama "Hello world"

echo.
echo If you see a response above, Ollama is working!
echo Now restart your dev server.
echo.
pause
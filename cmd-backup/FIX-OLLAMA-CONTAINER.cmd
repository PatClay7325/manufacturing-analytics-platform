@echo off
echo ===============================================
echo    OLLAMA CONTAINER FIX
echo ===============================================
echo.

echo [1] Checking current container status...
docker ps -a --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo.

echo [2] Checking if Ollama service is running inside container...
docker exec manufacturing-ollama ps aux 2>nul | findstr ollama || echo No Ollama process found
echo.

echo [3] Starting Ollama service if needed...
docker exec manufacturing-ollama /bin/sh -c "ollama serve &" 2>nul
timeout /t 3 /nobreak >nul
echo.

echo [4] Verifying Gemma:2B is available...
docker exec manufacturing-ollama ollama list 2>nul || echo Could not list models
echo.

echo [5] Testing API endpoint from inside container...
docker exec manufacturing-ollama /bin/sh -c "wget -qO- http://localhost:11434/api/tags | head -20" 2>nul || echo API test failed
echo.

echo [6] If still not working, let's restart with explicit serve command...
echo Stopping container...
docker stop manufacturing-ollama 2>nul
docker rm manufacturing-ollama 2>nul
echo.

echo Starting new container with explicit serve command...
docker run -d ^
  --name manufacturing-ollama ^
  -p 11434:11434 ^
  -v ollama:/root/.ollama ^
  --restart always ^
  ollama/ollama serve

echo.
echo Waiting for Ollama to start (30 seconds)...
timeout /t 30 /nobreak

echo.
echo [7] Installing Gemma:2B...
docker exec manufacturing-ollama ollama pull gemma:2b
echo.

echo [8] Final test...
powershell -Command "$body = @{model='gemma:2b'; prompt='Hello'; stream=$false} | ConvertTo-Json; Invoke-RestMethod -Uri 'http://localhost:11434/api/generate' -Method Post -Body $body -ContentType 'application/json'"
echo.
pause
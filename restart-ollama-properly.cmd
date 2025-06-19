@echo off
echo ===============================================
echo    RESTART OLLAMA WITH PROPER CONFIGURATION
echo ===============================================
echo.

echo [1] Stopping existing container...
docker stop manufacturing-ollama 2>nul
docker rm manufacturing-ollama 2>nul
echo Done.
echo.

echo [2] Starting Ollama with explicit serve command...
docker run -d ^
  --name manufacturing-ollama ^
  -p 11434:11434 ^
  -v ollama:/root/.ollama ^
  -e OLLAMA_HOST=0.0.0.0 ^
  --restart unless-stopped ^
  ollama/ollama

echo.
echo [3] Waiting for container to start...
timeout /t 5 /nobreak >nul
echo.

echo [4] Starting Ollama serve inside container...
docker exec -d manufacturing-ollama ollama serve
timeout /t 5 /nobreak >nul
echo.

echo [5] Checking if Ollama is running...
docker exec manufacturing-ollama ps aux | findstr ollama
echo.

echo [6] Pulling Gemma:2B model...
docker exec manufacturing-ollama ollama pull gemma:2b
echo.

echo [7] Testing the API...
echo Testing models endpoint...
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags'; Write-Host 'SUCCESS! Models:' $r.models.name -ForegroundColor Green } catch { Write-Host 'FAILED:' $_.Exception.Message -ForegroundColor Red }"
echo.

echo [8] Testing chat with Gemma:2B...
powershell -Command "$body = '{\"model\":\"gemma:2b\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello\"}],\"stream\":false}'; try { $r = Invoke-RestMethod -Uri 'http://localhost:11434/api/chat' -Method Post -Body $body -ContentType 'application/json'; Write-Host 'Chat Response:' $r.message.content -ForegroundColor Green } catch { Write-Host 'Chat failed:' $_.Exception.Message -ForegroundColor Red }"
echo.

echo ===============================================
echo    SETUP COMPLETE
echo ===============================================
echo.
echo If everything worked above, you can now:
echo 1. Run: npm run dev
echo 2. Visit: http://localhost:3000/test-chat
echo 3. Or visit: http://localhost:3000/manufacturing-chat/optimized
echo.
pause
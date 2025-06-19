@echo off
echo ===============================================
echo    OLLAMA STREAMING CHAT TEST
echo ===============================================
echo.

echo [1] Checking Ollama container status...
docker ps --filter "name=manufacturing-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo [2] Testing Ollama models endpoint...
echo Testing: http://localhost:11434/api/tags
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -Method Get; Write-Host 'SUCCESS: Ollama is responding'; Write-Host 'Models found:' $response.models.name } catch { Write-Host 'ERROR: Cannot connect to Ollama' }"
echo.

echo [3] Testing Ollama chat endpoint...
echo Sending test message to Gemma:2B...
powershell -Command "$body = @{model='gemma:2b'; messages=@(@{role='user'; content='Say hello'}); stream=$false} | ConvertTo-Json -Depth 10; try { $response = Invoke-RestMethod -Uri 'http://localhost:11434/api/chat' -Method Post -Body $body -ContentType 'application/json'; Write-Host 'SUCCESS: Chat response:' $response.message.content } catch { Write-Host 'ERROR: Chat test failed -' $_.Exception.Message }"
echo.

echo ===============================================
echo    NEXT STEPS
echo ===============================================
echo.
echo If tests above succeeded:
echo.
echo 1. Start your Next.js dev server:
echo    npm run dev
echo.
echo 2. Visit the test page:
echo    http://localhost:3000/test-chat
echo.
echo 3. Visit the optimized chat:
echo    http://localhost:3000/manufacturing-chat/optimized
echo.
echo If Ollama is not responding:
echo - Check Docker Desktop is running
echo - Try: docker restart manufacturing-ollama
echo - Check logs: docker logs manufacturing-ollama
echo.
pause
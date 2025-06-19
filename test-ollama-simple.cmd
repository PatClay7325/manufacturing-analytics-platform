@echo off
echo ===============================================
echo    SIMPLE OLLAMA TEST
echo ===============================================
echo.

echo Testing Ollama at http://localhost:11434
echo.

echo [1] Checking if port 11434 is open...
powershell -Command "Test-NetConnection -ComputerName localhost -Port 11434"
echo.

echo [2] Testing models endpoint...
powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -UseBasicParsing).Content } catch { Write-Host 'Connection failed:' $_.Exception.Message -ForegroundColor Red }"
echo.

echo [3] Let's check what's listening on port 11434...
netstat -an | findstr :11434
echo.

echo [4] Checking Docker logs...
docker logs manufacturing-ollama --tail 20
echo.

pause
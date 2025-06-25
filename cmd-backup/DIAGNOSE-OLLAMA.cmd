@echo off
echo ===============================================
echo    OLLAMA DIAGNOSTICS
echo ===============================================
echo.

echo [1] All Docker containers:
docker ps -a --filter "name=ollama" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
echo.

echo [2] Container details:
docker inspect manufacturing-ollama-optimized 2>nul | findstr "Status"
echo.

echo [3] Container logs (last 50 lines):
echo ----------------------------------------
docker logs manufacturing-ollama-optimized --tail 50 2>&1
echo ----------------------------------------
echo.

echo [4] Docker compose status:
docker-compose ps
echo.

echo [5] Port availability:
netstat -an | findstr "11434"
echo.

echo [6] Docker system info:
docker system df
echo.

echo ===============================================
echo    DIAGNOSIS COMPLETE
echo ===============================================
echo.
echo Common issues:
echo - If container shows "Exited", it crashed on startup
echo - If no logs, container never started properly  
echo - If port 11434 is in use, another service is blocking it
echo.
echo Recommended action:
echo Run: FIX-OLLAMA-CONTAINER.cmd
echo.
pause
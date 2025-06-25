@echo off
echo.
echo ==================================================
echo Checking Monitoring Services Status
echo ==================================================
echo.

echo [1] Current Docker containers:
docker ps -a | findstr "loki jaeger postgres"

echo.
echo [2] Checking if services exist but are stopped:
docker ps -a | findstr "Exited"

echo.
echo [3] Testing service endpoints:
echo.
echo Loki (http://localhost:3100):
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:3100/ready 2>nul || echo Not accessible

echo.
echo Jaeger (http://localhost:16686):
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:16686/ 2>nul || echo Not accessible

echo.
echo [4] Checking for port conflicts:
netstat -an | findstr ":3100 :16686"

echo.
echo ==================================================
echo Recommended Actions:
echo ==================================================
echo.
echo If services are not running, try:
echo 1. docker-compose down
echo 2. docker-compose up -d postgres loki jaeger
echo.
pause
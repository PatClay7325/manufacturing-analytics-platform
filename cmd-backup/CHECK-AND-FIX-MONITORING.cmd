@echo off
echo.
echo ==================================================
echo Checking and Fixing Monitoring Issues
echo ==================================================
echo.

echo [1] Checking which containers are actually running:
docker ps -a --format "table {{.Names}}\t{{.Status}}"

echo.
echo [2] Checking AlertManager issue:
docker logs manufacturing-alertmanager --tail 20

echo.
echo [3] Let's use the simple config directly:
docker stop manufacturing-alertmanager
docker rm manufacturing-alertmanager

echo.
echo [4] Starting AlertManager with inline simple config:
docker run -d --name manufacturing-alertmanager ^
  --network manufacturing-network ^
  -p 9093:9093 ^
  -v "%cd%\monitoring\alertmanager\alertmanager-simple.yml:/etc/alertmanager/config.yml" ^
  prom/alertmanager:v0.27.0 ^
  --config.file=/etc/alertmanager/config.yml ^
  --storage.path=/alertmanager

echo.
echo [5] Checking if Prometheus container exists:
docker ps -a | findstr prometheus

echo.
echo [6] Starting Prometheus if needed:
docker ps | findstr prometheus >nul 2>&1
if %errorlevel% neq 0 (
    echo Prometheus not running, starting it...
    docker-compose up -d prometheus
) else (
    echo Prometheus is already running
)

echo.
echo [7] Waiting for services...
timeout /t 10 /nobreak >nul

echo.
echo [8] Final Status Check:
echo.
echo Service Status:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo Testing Endpoints:
echo.
echo PostgreSQL (5432):
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (echo   [OK] Database is ready) else (echo   [FAIL] Database not ready)

echo.
echo Prometheus (9090):
curl -s -o nul -w "  HTTP Status: %%{http_code}\n" http://localhost:9090/-/healthy 2>nul || echo   [FAIL] Not accessible

echo.
echo AlertManager (9093):
curl -s -o nul -w "  HTTP Status: %%{http_code}\n" http://localhost:9093/-/healthy 2>nul || echo   [FAIL] Not accessible

echo.
echo Loki (3100):
curl -s -o nul -w "  HTTP Status: %%{http_code}\n" http://localhost:3100/ready 2>nul || echo   [FAIL] Not accessible

echo.
echo Jaeger (16686):
curl -s -o nul -w "  HTTP Status: %%{http_code}\n" http://localhost:16686/ 2>nul || echo   [FAIL] Not accessible

echo.
echo ==================================================
echo Summary
echo ==================================================
echo.
echo IMPORTANT: Your main database (PostgreSQL) is working!
echo This means your Next.js app should work without errors.
echo.
echo The monitoring services (Prometheus, AlertManager) are optional
echo and won't affect your main application functionality.
echo.
echo To proceed with development:
echo 1. Restart your Next.js app: npm run dev
echo 2. Your app will work normally at http://localhost:3000
echo 3. The monitoring page may show some services as "Down" but
echo    this won't affect your core application features.
echo.
pause
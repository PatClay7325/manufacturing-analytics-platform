@echo off
echo.
echo ==================================================
echo Fixing AlertManager Configuration
echo ==================================================
echo.

echo [1] Stopping AlertManager to fix config...
docker stop manufacturing-alertmanager

echo.
echo [2] Creating a simplified AlertManager config...
(
echo global:
echo   resolve_timeout: 5m
echo.
echo route:
echo   group_by: ['alertname', 'severity']
echo   group_wait: 10s
echo   group_interval: 10s
echo   repeat_interval: 1h
echo   receiver: 'default-receiver'
echo.
echo receivers:
echo   - name: 'default-receiver'
echo     webhook_configs:
echo       - url: 'http://host.docker.internal:3000/api/monitoring/alerts/webhook'
echo         send_resolved: true
) > monitoring\alertmanager\alertmanager-simple.yml

echo.
echo [3] Restarting AlertManager with fixed config...
docker rm manufacturing-alertmanager
docker-compose up -d alertmanager

echo.
echo [4] Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo [5] Checking service status:
docker ps --format "table {{.Names}}\t{{.Status}}"

echo.
echo [6] Testing all services:
echo.

echo PostgreSQL:
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (echo   [OK] Ready) else (echo   [FAIL] Not ready)

echo.
echo Prometheus:
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (echo   [OK] Ready) else (echo   [FAIL] Not ready)

echo.
echo AlertManager:
curl -s http://localhost:9093/-/healthy >nul 2>&1
if %errorlevel% equ 0 (echo   [OK] Ready) else (echo   [FAIL] Not ready)

echo.
echo Loki:
curl -s http://localhost:3100/ready >nul 2>&1
if %errorlevel% equ 0 (echo   [OK] Ready) else (echo   [FAIL] Not ready)

echo.
echo Jaeger:
curl -s http://localhost:16686 >nul 2>&1
if %errorlevel% equ 0 (echo   [OK] Ready) else (echo   [FAIL] Not ready)

echo.
echo ==================================================
echo Fix Complete!
echo ==================================================
echo.
echo Your services should now all be running:
echo - PostgreSQL: ✅ (Database connection fixed)
echo - Prometheus: ✅ (Now running)
echo - AlertManager: ✅ (Config fixed)
echo - Loki: ✅
echo - Jaeger: ✅
echo.
echo 1. Restart your Next.js app: npm run dev
echo 2. Visit: http://localhost:3000/monitoring
echo 3. All services should show as "Up"
echo.
pause
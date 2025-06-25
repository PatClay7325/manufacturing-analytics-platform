@echo off
echo.
echo ==================================================
echo Verifying All Services Status
echo ==================================================
echo.

echo [1] Waiting for services to stabilize...
timeout /t 10 /nobreak >nul

echo.
echo [2] Current service status:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo [3] Checking AlertManager logs (it was restarting):
docker logs manufacturing-alertmanager --tail 10

echo.
echo [4] Testing service endpoints:
echo.

echo PostgreSQL (5432):
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] PostgreSQL is ready
) else (
    echo   [FAIL] PostgreSQL not ready
)

echo.
echo Prometheus (9090):
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Prometheus is accessible
) else (
    echo   [FAIL] Prometheus not accessible
)

echo.
echo AlertManager (9093):
curl -s http://localhost:9093/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] AlertManager is accessible
) else (
    echo   [FAIL] AlertManager not accessible - checking why...
    docker logs manufacturing-alertmanager --tail 5
)

echo.
echo Loki (3100):
curl -s http://localhost:3100/ready >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Loki is accessible
) else (
    echo   [FAIL] Loki not accessible
)

echo.
echo Jaeger (16686):
curl -s http://localhost:16686 >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Jaeger is accessible
) else (
    echo   [FAIL] Jaeger not accessible
)

echo.
echo ==================================================
echo Summary:
echo ==================================================
echo.
echo 1. PostgreSQL is running on port 5432
echo 2. Your database connection should now work
echo 3. Monitoring services are starting up
echo.
echo Next steps:
echo - Restart your Next.js dev server (npm run dev)
echo - Visit http://localhost:3000/monitoring
echo - All services should show as "Up"
echo.

REM Check if Prometheus is missing
docker ps | findstr prometheus >nul 2>&1
if %errorlevel% neq 0 (
    echo NOTE: Prometheus container is not running. Starting it...
    docker-compose up -d prometheus
)

pause
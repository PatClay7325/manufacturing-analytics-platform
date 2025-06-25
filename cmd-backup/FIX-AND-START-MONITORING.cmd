@echo off
echo.
echo ==================================================
echo Fixing and Starting Monitoring Services
echo ==================================================
echo.

echo [1/5] Cleaning up any existing Loki/Jaeger containers...
docker rm -f manufacturing-loki manufacturing-jaeger 2>nul

echo.
echo [2/5] Starting PostgreSQL, Loki and Jaeger together...
docker-compose up -d postgres loki jaeger

echo.
echo [3/5] Waiting for containers to be created...
timeout /t 5 /nobreak >nul

echo.
echo [4/5] Checking container status...
docker ps | findstr "postgres loki jaeger"

echo.
echo [5/5] Waiting for services to be ready...
echo.

REM Check Loki
echo Checking Loki service...
set LOKI_READY=0
for /L %%i in (1,1,30) do (
    curl -s http://localhost:3100/ready >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Loki is ready!
        set LOKI_READY=1
        goto :check_jaeger
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Loki... (%%i/30)
)
if %LOKI_READY% equ 0 (
    echo [ERROR] Loki failed to start
    echo.
    echo Checking Loki logs:
    docker logs manufacturing-loki --tail 10
)

:check_jaeger
echo.
echo Checking Jaeger service...
set JAEGER_READY=0
for /L %%i in (1,1,30) do (
    curl -s http://localhost:16686/ >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Jaeger is ready!
        set JAEGER_READY=1
        goto :final_status
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Jaeger... (%%i/30)
)
if %JAEGER_READY% equ 0 (
    echo [ERROR] Jaeger failed to start
    echo.
    echo Checking Jaeger logs:
    docker logs manufacturing-jaeger --tail 10
)

:final_status
echo.
echo ==================================================
echo Final Status:
echo ==================================================
echo.
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ==================================================
echo Service URLs:
echo ==================================================
echo.
if %LOKI_READY% equ 1 (
    echo   [OK] Loki:      http://localhost:3100
) else (
    echo   [FAIL] Loki:    Not accessible
)

if %JAEGER_READY% equ 1 (
    echo   [OK] Jaeger UI: http://localhost:16686
) else (
    echo   [FAIL] Jaeger:  Not accessible
)

echo.
echo   Monitoring Page: http://localhost:3000/monitoring
echo.
echo ==================================================
echo.

if %LOKI_READY% equ 1 if %JAEGER_READY% equ 1 (
    echo [SUCCESS] All monitoring services are ready!
    echo.
    echo Please refresh your monitoring page at http://localhost:3000/monitoring
) else (
    echo [WARNING] Some services failed to start.
    echo.
    echo Try running: docker-compose logs loki jaeger
)

echo.
pause
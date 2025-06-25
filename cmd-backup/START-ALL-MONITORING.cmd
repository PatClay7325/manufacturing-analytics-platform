@echo off
echo.
echo ==================================================
echo Starting Complete Monitoring Stack
echo ==================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/5] Cleaning up any existing containers...
docker rm -f manufacturing-loki manufacturing-jaeger manufacturing-alertmanager 2>nul

echo.
echo [2/5] Starting all monitoring services...
docker-compose up -d postgres prometheus alertmanager loki jaeger

echo.
echo [3/5] Waiting for containers to be created...
timeout /t 5 /nobreak >nul

echo.
echo [4/5] Container status:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr "postgres prometheus alertmanager loki jaeger"

echo.
echo [5/5] Checking service health...
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
set POSTGRES_READY=0
for /L %%i in (1,1,10) do (
    docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] PostgreSQL is ready!
        set POSTGRES_READY=1
        goto :check_prometheus
    )
    timeout /t 1 /nobreak >nul
)
if %POSTGRES_READY% equ 0 echo [WARN] PostgreSQL not ready yet

:check_prometheus
echo.
echo Checking Prometheus...
set PROMETHEUS_READY=0
curl -s http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Prometheus is ready!
    set PROMETHEUS_READY=1
) else (
    echo [WARN] Prometheus not accessible yet
)

echo.
echo Checking AlertManager...
set ALERTMANAGER_READY=0
for /L %%i in (1,1,20) do (
    curl -s http://localhost:9093/-/healthy >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] AlertManager is ready!
        set ALERTMANAGER_READY=1
        goto :check_loki
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for AlertManager... (%%i/20)
)
if %ALERTMANAGER_READY% equ 0 (
    echo [ERROR] AlertManager failed to start
    echo Checking logs...
    docker logs manufacturing-alertmanager --tail 10
)

:check_loki
echo.
echo Checking Loki...
set LOKI_READY=0
for /L %%i in (1,1,20) do (
    curl -s http://localhost:3100/ready >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Loki is ready!
        set LOKI_READY=1
        goto :check_jaeger
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Loki... (%%i/20)
)
if %LOKI_READY% equ 0 (
    echo [ERROR] Loki failed to start
    echo Checking logs...
    docker logs manufacturing-loki --tail 10
)

:check_jaeger
echo.
echo Checking Jaeger...
set JAEGER_READY=0
for /L %%i in (1,1,20) do (
    curl -s http://localhost:16686/ >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Jaeger is ready!
        set JAEGER_READY=1
        goto :final_status
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Jaeger... (%%i/20)
)
if %JAEGER_READY% equ 0 (
    echo [ERROR] Jaeger failed to start
    echo Checking logs...
    docker logs manufacturing-jaeger --tail 10
)

:final_status
echo.
echo ==================================================
echo Service Status Summary:
echo ==================================================
echo.

if %POSTGRES_READY% equ 1 (
    echo   [OK] PostgreSQL:    http://localhost:5432
) else (
    echo   [FAIL] PostgreSQL:  Not ready
)

if %PROMETHEUS_READY% equ 1 (
    echo   [OK] Prometheus:    http://localhost:9090
) else (
    echo   [FAIL] Prometheus:  Not accessible
)

if %ALERTMANAGER_READY% equ 1 (
    echo   [OK] AlertManager:  http://localhost:9093
) else (
    echo   [FAIL] AlertManager: Not accessible
)

if %LOKI_READY% equ 1 (
    echo   [OK] Loki:          http://localhost:3100
) else (
    echo   [FAIL] Loki:        Not accessible
)

if %JAEGER_READY% equ 1 (
    echo   [OK] Jaeger UI:     http://localhost:16686
) else (
    echo   [FAIL] Jaeger:      Not accessible
)

echo.
echo   Platform Monitoring: http://localhost:3000/monitoring
echo.
echo ==================================================
echo.

REM Count successful services
set /a SUCCESS_COUNT=0
if %POSTGRES_READY% equ 1 set /a SUCCESS_COUNT+=1
if %PROMETHEUS_READY% equ 1 set /a SUCCESS_COUNT+=1
if %ALERTMANAGER_READY% equ 1 set /a SUCCESS_COUNT+=1
if %LOKI_READY% equ 1 set /a SUCCESS_COUNT+=1
if %JAEGER_READY% equ 1 set /a SUCCESS_COUNT+=1

echo [SUMMARY] %SUCCESS_COUNT%/5 monitoring services are running
echo.

if %SUCCESS_COUNT% equ 5 (
    echo [SUCCESS] All monitoring services are ready!
    echo.
    echo Please refresh your monitoring page at http://localhost:3000/monitoring
    echo All services should now show as "Up" / "Operational"
) else (
    echo [WARNING] Some services failed to start properly.
    echo.
    echo Troubleshooting:
    echo - Check Docker logs: docker-compose logs
    echo - Restart failed services: docker-compose restart [service-name]
    echo - Check port conflicts: netstat -an ^| findstr "9090 9093 3100 16686"
)

echo.
pause
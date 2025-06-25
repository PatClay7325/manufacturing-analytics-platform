@echo off
echo.
echo ==================================================
echo Starting Monitoring Services (Loki and Jaeger)
echo ==================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Checking existing containers...
docker ps -a | findstr "loki jaeger"

echo.
echo [2/4] Starting Loki and Jaeger containers...
REM Don't recreate network, just start the services
docker-compose up -d --no-recreate loki jaeger

echo.
echo [3/4] Waiting for services to be ready...
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
    echo Checking container logs...
    docker logs manufacturing-loki --tail 20
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
        goto :show_status
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Jaeger... (%%i/30)
)
if %JAEGER_READY% equ 0 (
    echo [ERROR] Jaeger failed to start
    echo Checking container logs...
    docker logs manufacturing-jaeger --tail 20
)

:show_status
echo.
echo [4/4] Service Status:
echo.
docker ps | findstr "loki jaeger postgres"

echo.
echo ==================================================
echo Service URLs:
echo ==================================================
echo.
echo   Loki:      http://localhost:3100
echo   Jaeger UI: http://localhost:16686
echo.
echo   Monitoring Page: http://localhost:3000/monitoring
echo.
echo ==================================================
echo.

if %LOKI_READY% equ 1 if %JAEGER_READY% equ 1 (
    echo [SUCCESS] All monitoring services are ready!
    echo.
    echo Please refresh your monitoring page to see the updated status.
) else (
    echo [WARNING] Some services failed to start properly.
    echo.
    echo Troubleshooting tips:
    echo 1. Check if ports 3100 and 16686 are already in use
    echo 2. Run: docker logs manufacturing-loki
    echo 3. Run: docker logs manufacturing-jaeger
)

echo.
pause
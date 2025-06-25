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

echo [1/3] Starting Loki and Jaeger containers...
docker-compose up -d loki jaeger

echo.
echo [2/3] Waiting for services to be ready...
echo.

REM Check Loki
echo Checking Loki service...
set LOKI_READY=0
for /L %%i in (1,1,30) do (
    curl -s http://localhost:3100/ready >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] Loki is ready!
        set LOKI_READY=1
        goto :check_jaeger
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Loki... (%%i/30)
)
if %LOKI_READY% equ 0 (
    echo [ERROR] Loki failed to start
)

:check_jaeger
echo.
echo Checking Jaeger service...
set JAEGER_READY=0
for /L %%i in (1,1,30) do (
    curl -s http://localhost:16686/ >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] Jaeger is ready!
        set JAEGER_READY=1
        goto :show_status
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for Jaeger... (%%i/30)
)
if %JAEGER_READY% equ 0 (
    echo [ERROR] Jaeger failed to start
)

:show_status
echo.
echo [3/3] Service Status:
echo.
docker-compose ps loki jaeger

echo.
echo ==================================================
echo Service URLs:
echo ==================================================
echo.
echo   Loki UI:   http://localhost:3100
echo   Jaeger UI: http://localhost:16686
echo.
echo   Monitoring Page: http://localhost:3000/monitoring
echo.
echo ==================================================
echo.

if %LOKI_READY% equ 1 if %JAEGER_READY% equ 1 (
    echo [SUCCESS] All monitoring services are ready!
) else (
    echo [WARNING] Some services failed to start properly.
)

echo.
pause
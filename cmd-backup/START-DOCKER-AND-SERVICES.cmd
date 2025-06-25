@echo off
echo.
echo ==================================================
echo Docker Desktop Not Running - Quick Fix Guide
echo ==================================================
echo.

echo [STEP 1] Please start Docker Desktop:
echo.
echo   1. Click the Windows Start button
echo   2. Type "Docker Desktop" and click to open it
echo   3. Wait for the Docker whale icon to appear in your system tray
echo   4. The whale should be steady (not animated) when ready
echo.
echo Press any key AFTER Docker Desktop is fully started...
pause >nul

echo.
echo [STEP 2] Verifying Docker is ready...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker is still not ready. Please ensure:
    echo   - Docker Desktop is fully started
    echo   - The whale icon in system tray is not animated
    echo   - You may need to wait 30-60 seconds
    echo.
    echo Press any key to try again...
    pause >nul
    goto :verify_docker
)

:verify_docker
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is still not responding. 
    echo Please restart Docker Desktop and run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is running!

echo.
echo [STEP 3] Starting PostgreSQL database...
docker-compose up -d postgres

echo.
echo [STEP 4] Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

set POSTGRES_READY=0
for /L %%i in (1,1,30) do (
    docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] PostgreSQL is ready!
        set POSTGRES_READY=1
        goto :start_monitoring
    )
    timeout /t 2 /nobreak >nul
    echo.   Waiting for PostgreSQL... (%%i/30)
)

:start_monitoring
echo.
echo [STEP 5] Starting all monitoring services...
docker-compose up -d prometheus alertmanager loki jaeger

echo.
echo [STEP 6] Final status check...
timeout /t 5 /nobreak >nul

echo.
echo ==================================================
echo Service Status:
echo ==================================================
docker ps --format "table {{.Names}}\t{{.Status}}"

echo.
echo ==================================================
echo ✅ SUCCESS! Services are running
echo ==================================================
echo.
echo Your application should now work without database errors!
echo.
echo Access your services at:
echo   - Application: http://localhost:3000
echo   - Monitoring: http://localhost:3000/monitoring
echo   - Prometheus: http://localhost:9090
echo   - AlertManager: http://localhost:9093
echo   - Loki: http://localhost:3100
echo   - Jaeger: http://localhost:16686
echo.
echo If you still see database errors in your Next.js app:
echo 1. Restart your Next.js dev server (Ctrl+C and npm run dev)
echo 2. Check your .env.local has:
echo    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public"
echo.
pause
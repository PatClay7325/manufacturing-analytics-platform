@echo off
echo.
echo ==================================================
echo Fixing Database and Starting Monitoring Services
echo ==================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Checking database status...
docker ps | findstr postgres

echo.
echo [2/4] Starting PostgreSQL if not running...
docker-compose up -d postgres

echo.
echo [3/4] Waiting for PostgreSQL to be ready...
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

if %POSTGRES_READY% equ 0 (
    echo [ERROR] PostgreSQL failed to start
    echo.
    echo Checking PostgreSQL logs:
    docker logs manufacturing-postgres --tail 20
    echo.
    echo Trying to recreate PostgreSQL container...
    docker-compose down postgres
    docker-compose up -d postgres
    timeout /t 10 /nobreak
)

:start_monitoring
echo.
echo [4/4] Starting monitoring services...
docker-compose up -d prometheus alertmanager loki jaeger

echo.
echo Waiting for all services to start...
timeout /t 10 /nobreak >nul

echo.
echo ==================================================
echo Service Status:
echo ==================================================
echo.
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ==================================================
echo Quick Health Check:
echo ==================================================
echo.

REM Test PostgreSQL connection
echo Testing PostgreSQL connection...
docker exec manufacturing-postgres psql -U postgres -c "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL connection successful
) else (
    echo [FAIL] PostgreSQL connection failed
)

echo.
echo ==================================================
echo Next Steps:
echo ==================================================
echo.
echo 1. If you see database errors in your app, update .env.local:
echo    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public"
echo.
echo 2. Run database migrations if needed:
echo    npx prisma migrate deploy
echo.
echo 3. Access services:
echo    - PostgreSQL: localhost:5432
echo    - Prometheus: http://localhost:9090
echo    - AlertManager: http://localhost:9093
echo    - Loki: http://localhost:3100
echo    - Jaeger: http://localhost:16686
echo    - Monitoring: http://localhost:3000/monitoring
echo.
pause
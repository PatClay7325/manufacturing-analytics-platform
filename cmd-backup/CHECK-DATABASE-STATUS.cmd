@echo off
echo.
echo ==================================================
echo Checking Database and Docker Status
echo ==================================================
echo.

echo [1] Docker Desktop Status:
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop.
    echo.
    echo To start Docker Desktop:
    echo 1. Open Docker Desktop from Start Menu
    echo 2. Wait for it to fully start (whale icon in system tray)
    echo 3. Run this script again
    pause
    exit /b 1
) else (
    echo [OK] Docker is running
)

echo.
echo [2] PostgreSQL Container Status:
docker ps -a | findstr postgres

echo.
echo [3] All Running Containers:
docker ps

echo.
echo [4] Checking port 5432:
netstat -an | findstr :5432

echo.
echo [5] Docker Network Status:
docker network ls | findstr manufacturing

echo.
echo [6] Checking .env files for DATABASE_URL:
echo.
echo .env.local:
type .env.local | findstr DATABASE_URL 2>nul || echo DATABASE_URL not found in .env.local

echo.
echo .env:
type .env | findstr DATABASE_URL 2>nul || echo DATABASE_URL not found in .env

echo.
echo ==================================================
echo Diagnostic Summary:
echo ==================================================
echo.

REM Check if postgres container exists
docker ps -a | findstr postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo [ISSUE] PostgreSQL container does not exist
    echo.
    echo SOLUTION: Run the following command:
    echo docker-compose up -d postgres
) else (
    REM Check if postgres is running
    docker ps | findstr postgres >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ISSUE] PostgreSQL container exists but is not running
        echo.
        echo SOLUTION: Run the following commands:
        echo docker start manufacturing-postgres
        echo OR
        echo docker-compose up -d postgres
    ) else (
        echo [OK] PostgreSQL container is running
        echo.
        echo If you still see connection errors, check:
        echo 1. Your DATABASE_URL in .env.local
        echo 2. Try: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public"
    )
)

echo.
pause
@echo off
echo === Running E2E Tests with Real PostgreSQL Data ===
echo.

echo [1] Checking PostgreSQL connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    echo Please run setup-docker-postgres-final.cmd first
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

echo.
echo [2] Checking if database has data...
for /f %%i in ('docker exec manufacturing-postgres psql -U postgres -d manufacturing -t -c "SELECT COUNT(*) FROM \"Alert\";"') do set ALERT_COUNT=%%i
echo Found %ALERT_COUNT% alerts in database

if %ALERT_COUNT% EQU 0 (
    echo WARNING: No alerts found in database!
    echo Please run setup-real-data.cmd to seed the database
    pause
    exit /b 1
)

echo.
echo [3] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [4] Running ALL E2E tests...
echo.
npx playwright test

echo.
echo === Test Report ===
echo.
echo To view detailed test report, run:
echo npx playwright show-report
echo.
pause
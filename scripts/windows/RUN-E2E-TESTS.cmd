@echo off
echo === E2E Test Runner ===
echo.
echo Make sure you have TWO terminals open:
echo   Terminal 1: Run start-dev-server.cmd
echo   Terminal 2: Run this script
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo [1] Checking prerequisites...

REM Check PostgreSQL
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    echo Please run setup-docker-postgres-final.cmd first
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

REM Check dev server
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Dev server is not running on http://localhost:3000
    echo.
    echo Please open a NEW terminal and run:
    echo   start-dev-server.cmd
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)
echo Dev server is running ✓

REM Check if data exists
echo.
echo [2] Checking database data...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) as alert_count FROM \"Alert\";" 2>&1 | findstr /R "[0-9]" >nul
if %errorlevel% neq 0 (
    echo WARNING: No data found in database
    echo Running setup-real-data.cmd...
    call setup-real-data.cmd
)
echo Database has data ✓

echo.
echo [3] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [4] Choose test mode:
echo.
echo   1. Run ALL tests (headless)
echo   2. Run ALL tests (with visible browser)
echo   3. Run only failing tests
echo   4. Debug mode (step through tests)
echo   5. Run tests sequentially (slower but more stable)
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo Running all tests in headless mode...
    npx playwright test
) else if "%choice%"=="2" (
    echo.
    echo Running all tests with visible browser...
    npx playwright test --headed
) else if "%choice%"=="3" (
    echo.
    echo Running only previously failing tests...
    npx playwright test tests/e2e/alerts.spec.ts tests/e2e/navigation.spec.ts tests/e2e/manufacturing-chat.spec.ts --headed
) else if "%choice%"=="4" (
    echo.
    echo Opening debug mode...
    echo Use the Playwright Inspector to step through tests
    npx playwright test --debug
) else if "%choice%"=="5" (
    echo.
    echo Running tests sequentially...
    npx playwright test --workers=1 --reporter=list
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

echo.
echo === Test run complete ===
echo.
echo To view detailed HTML report:
echo   npx playwright show-report
echo.
pause
@echo off
echo === Running E2E Tests with Visible Browsers (Real Data) ===
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
echo [2] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [3] Running E2E tests with visible browsers...
echo You will see the browsers open and run the tests.
echo.

npx playwright test --headed

echo.
echo === Tests Complete ===
echo.
echo Test results saved in: playwright-report\index.html
echo To view the report run: npx playwright show-report
echo.
pause
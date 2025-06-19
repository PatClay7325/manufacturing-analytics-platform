@echo off
echo === Running Playwright Tests with Database ===
echo.

echo Setting environment variables...
set DATABASE_URL=postgresql://postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo Checking PostgreSQL connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running or not accessible!
    echo Please run: setup-postgres-clean.cmd first
    pause
    exit /b 1
)

echo PostgreSQL is running and accessible!
echo.

echo Running Playwright tests...
npm run test:e2e

echo.
echo === Test run complete! ===
echo.
echo To view the HTML report, run:
echo npx playwright show-report
echo.
pause
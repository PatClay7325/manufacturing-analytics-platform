@echo off
echo === Debug E2E Tests with Real Data ===
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
set PWDEBUG=1

echo.
echo [3] Starting Playwright in DEBUG mode...
echo.
echo This will open the Playwright Inspector where you can:
echo - Step through tests
echo - See browser state
echo - Debug selectors
echo.

npx playwright test --debug

echo.
echo === Debug Session Complete ===
echo.
pause
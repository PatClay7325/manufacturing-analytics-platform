@echo off
echo === Running E2E Tests to Check Fixes ===
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
echo [2] Checking if dev server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Dev server is not running on http://localhost:3000
    echo Please run start-dev-server.cmd in another terminal first
    pause
    exit /b 1
)
echo Dev server is running ✓

echo.
echo [3] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [4] Running specific failing tests...
echo.

echo Testing alerts page...
npx playwright test tests/e2e/alerts.spec.ts --reporter=list

echo.
echo Testing navigation...
npx playwright test tests/e2e/navigation.spec.ts --reporter=list

echo.
echo Testing manufacturing chat...
npx playwright test tests/e2e/manufacturing-chat.spec.ts --reporter=list

echo.
echo === Test Run Complete ===
echo.
echo To run all tests, use: run-e2e-tests-headed-real-data.cmd
echo.
pause
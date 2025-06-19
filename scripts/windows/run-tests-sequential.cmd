@echo off
echo === Running Tests Sequentially ===
echo.

echo [1] Checking prerequisites...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Dev server is not running!
    echo Please run start-dev-server.cmd first
    pause
    exit /b 1
)
echo Dev server is running ✓

echo.
echo [2] Setting environment...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [3] Running tests sequentially...
echo.

echo Testing alerts...
npx playwright test tests/e2e/alerts.spec.ts --workers=1 --reporter=line

echo.
echo Testing navigation...
npx playwright test tests/e2e/navigation.spec.ts --workers=1 --reporter=line

echo.
echo Testing manufacturing chat...
npx playwright test tests/e2e/manufacturing-chat.spec.ts --workers=1 --reporter=line

echo.
echo === Test Summary ===
pause
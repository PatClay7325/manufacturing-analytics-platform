@echo off
echo === Testing Previously Failing Tests ===
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
echo [2] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [3] Running previously failing tests...
echo.

echo Testing specific tests that were failing:
echo - Alert details test
echo - AI chat multiple turns test  
echo - Mobile navigation test
echo.

npx playwright test ^
  --grep "displays alert details|handles multiple conversation turns|main navigation links work" ^
  --reporter=list

echo.
echo === Test Results ===
echo.
echo If tests are still failing, run with debug mode:
echo   npx playwright test --debug --grep "displays alert details"
echo.
pause
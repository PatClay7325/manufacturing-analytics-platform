@echo off
echo === RUNNING TESTS WITHOUT INTEGRATION ===
echo.
echo This will run:
echo - All unit tests
echo - All E2E tests
echo - Skip integration tests (due to database conflicts)
echo.

echo [1] Setting environment...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [2] Running unit tests...
echo.
call npx vitest run --config vitest.config.ts --reporter=verbose

if %errorlevel% neq 0 (
    echo.
    echo Unit tests failed!
    set /p continue="Continue to E2E tests? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo [3] Checking dev server for E2E tests...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo Dev server not running!
    echo Please run start-dev-server.cmd in another terminal
    pause
    exit /b 1
)

echo.
echo [4] Running E2E tests...
echo.
call npx playwright test --reporter=list

echo.
echo ========================================
echo TEST SUMMARY
echo ========================================
echo.
echo Unit Tests: Check output above
echo Integration Tests: SKIPPED (database conflicts)
echo E2E Tests: Check output above
echo.
echo To fix integration tests, consider:
echo 1. Using a separate test database
echo 2. Running fix-integration-tests.cmd
echo.
pause
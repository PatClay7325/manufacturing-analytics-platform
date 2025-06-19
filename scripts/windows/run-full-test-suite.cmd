@echo off
echo === FULL PROJECT TEST SUITE ===
echo.
echo This will run ALL tests: Unit, Integration, and E2E
echo.

echo [1] Checking prerequisites...
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b 1
)
echo Node.js installed ✓

REM Check PostgreSQL
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    echo Run: setup-docker-postgres-final.cmd
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

REM Check if database has data
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) FROM \"Alert\";" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Database might not have data
    echo Consider running: setup-real-data.cmd
)

echo.
echo [2] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo ========================================
echo PHASE 1: UNIT TESTS (Vitest)
echo ========================================
echo.

echo Running unit tests...
call npm run test:unit

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Unit tests failed!
    echo Continue anyway? (Ctrl+C to cancel)
    pause
)

echo.
echo ========================================
echo PHASE 2: INTEGRATION TESTS (Vitest)
echo ========================================
echo.

echo Running integration tests...
call npm run test:integration

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Integration tests failed!
    echo Continue anyway? (Ctrl+C to cancel)
    pause
)

echo.
echo ========================================
echo PHASE 3: E2E TESTS (Playwright)
echo ========================================
echo.

REM Check dev server
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo Dev server is not running!
    echo.
    echo Starting dev server in background...
    start /B npm run dev
    echo Waiting for server to start (15 seconds)...
    timeout /t 15 /nobreak >nul
)

echo Running E2E tests...
call npm run test:e2e

echo.
echo ========================================
echo PHASE 4: TEST COVERAGE
echo ========================================
echo.

echo Generating coverage report...
call npm run test:coverage

echo.
echo ========================================
echo TEST SUMMARY
echo ========================================
echo.
echo All test phases completed!
echo.
echo View reports:
echo - Unit test results: Check console output above
echo - E2E test report: npx playwright show-report
echo - Coverage report: Open coverage/index.html
echo.
echo Common issues:
echo - If unit tests fail: Check component imports and mocks
echo - If integration tests fail: Check database connection
echo - If E2E tests fail: Ensure dev server is running
echo.
pause
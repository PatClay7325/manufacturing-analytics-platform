@echo off
echo =====================================================
echo    COMPREHENSIVE TEST SUITE - TEST EVERYTHING
echo =====================================================
echo.
echo This will test EVERYTHING in the project:
echo - Unit tests (components, hooks, utils)
echo - Integration tests (API, database, services)
echo - E2E tests (UI, navigation, chat)
echo - Chat functionality (with/without AI)
echo.
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

cls
echo =====================================================
echo    PHASE 1: ENVIRONMENT SETUP
echo =====================================================
echo.

REM Set environment variables
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo [1] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)
node --version
echo.

echo [2] Checking PostgreSQL...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL not running!
    echo Please run: setup-docker-postgres-final.cmd
    pause
    exit /b 1
)
echo PostgreSQL is running ✓
echo.

echo [3] Checking database data...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -t -c "SELECT COUNT(*) FROM \"Alert\";" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: No data in database
    echo Running data setup...
    call setup-real-data.cmd
)
echo Database has data ✓
echo.

echo [4] Checking Ollama AI service...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Ollama not running - Chat AI features will be limited
    echo Chat will fall back to database queries
) else (
    echo Ollama AI service available ✓
)
echo.

echo =====================================================
echo    PHASE 2: UNIT TESTS (Vitest)
echo =====================================================
echo.
echo Running all unit tests...
echo.

call npx vitest run --reporter=verbose

if %errorlevel% neq 0 (
    echo.
    echo UNIT TESTS FAILED!
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo =====================================================
echo    PHASE 3: INTEGRATION TESTS (Vitest)
echo =====================================================
echo.
echo Running integration tests (requires database)...
echo.

call npx vitest run --config vitest.config.integration.ts --reporter=verbose

if %errorlevel% neq 0 (
    echo.
    echo INTEGRATION TESTS FAILED!
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo =====================================================
echo    PHASE 4: START DEV SERVER
echo =====================================================
echo.

REM Check if dev server is already running
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting development server...
    start /B npm run dev
    echo Waiting for server to start (20 seconds)...
    timeout /t 20 /nobreak
    
    REM Verify server started
    curl -s http://localhost:3000 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Dev server failed to start!
        pause
        exit /b 1
    )
) else (
    echo Dev server already running ✓
)
echo.

echo =====================================================
echo    PHASE 5: E2E TESTS (Playwright)
echo =====================================================
echo.
echo Running ALL E2E tests including chat...
echo.

call npx playwright test --reporter=list

if %errorlevel% neq 0 (
    echo.
    echo E2E TESTS FAILED!
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo =====================================================
echo    PHASE 6: CHAT API TESTS
echo =====================================================
echo.
echo Testing chat API directly...
echo.

if exist scripts\test-chat-api.ts (
    call npx tsx scripts/test-chat-api.ts
) else (
    echo Chat API test script not found, skipping...
)

echo.
echo =====================================================
echo    PHASE 7: TEST COVERAGE REPORT
echo =====================================================
echo.
echo Generating coverage report...
echo.

call npx vitest run --coverage

echo.
echo =====================================================
echo    PHASE 8: TYPE CHECKING
echo =====================================================
echo.
echo Running TypeScript type check...
echo.

call npx tsc --noEmit

echo.
echo =====================================================
echo    FINAL TEST SUMMARY
echo =====================================================
echo.
echo Test Results:
echo ------------
echo.

REM Count test files
echo Test file counts:
for /f %%i in ('dir /s /b src\__tests__\*.test.ts* 2^>nul ^| find /c ".test."') do set unit_count=%%i
for /f %%i in ('dir /s /b src\__tests__\integration\*.test.ts 2^>nul ^| find /c ".test."') do set int_count=%%i
for /f %%i in ('dir /s /b tests\e2e\*.spec.ts 2^>nul ^| find /c ".spec."') do set e2e_count=%%i

echo - Unit test files: %unit_count%
echo - Integration test files: %int_count%
echo - E2E test files: %e2e_count%
echo.

echo Reports available:
echo -----------------
echo - Playwright HTML report: npx playwright show-report
echo - Coverage report: coverage\index.html
echo - Test results: Check console output above
echo.

echo Common issues and fixes:
echo -----------------------
echo - PostgreSQL not running: Run setup-docker-postgres-final.cmd
echo - No test data: Run setup-real-data.cmd
echo - Dev server issues: Kill process on port 3000 and retry
echo - Ollama not running: Docker run ollama with tinyllama model
echo - Test timeouts: Increase timeout in test files
echo.

echo =====================================================
echo    ALL TESTS COMPLETED
echo =====================================================
echo.
pause
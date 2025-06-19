@echo off
echo === Manufacturing Analytics Platform - Test Runner ===
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

echo.
echo Select test mode:
echo.
echo 1. Run all E2E tests (headless)
echo 2. Run E2E tests with visible browsers
echo 3. Open Playwright UI (interactive mode)
echo 4. Run specific test file
echo 5. Debug tests
echo 6. View last test report
echo 7. Run unit tests (Vitest)
echo 8. Run integration tests
echo.

set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" (
    echo.
    echo Running all E2E tests in headless mode...
    npm run test:e2e
    goto END
)

if "%choice%"=="2" (
    echo.
    echo Running E2E tests with visible browsers...
    npx playwright test --headed
    goto END
)

if "%choice%"=="3" (
    echo.
    echo Opening Playwright UI...
    npm run test:e2e:ui
    goto END
)

if "%choice%"=="4" (
    echo.
    echo Available test files:
    echo - tests/e2e/navigation.spec.ts
    echo - tests/e2e/equipment.spec.ts
    echo - tests/e2e/manufacturing-chat.spec.ts
    echo.
    set /p testfile="Enter test file name: "
    echo.
    echo Running %testfile%...
    npx playwright test %testfile% --headed
    goto END
)

if "%choice%"=="5" (
    echo.
    echo Starting debug mode...
    npm run test:e2e:debug
    goto END
)

if "%choice%"=="6" (
    echo.
    echo Opening test report...
    npx playwright show-report
    goto END
)

if "%choice%"=="7" (
    echo.
    echo Running unit tests...
    npm run test:unit
    goto END
)

if "%choice%"=="8" (
    echo.
    echo Running integration tests...
    npm run test:integration
    goto END
)

echo Invalid choice!

:END
echo.
pause
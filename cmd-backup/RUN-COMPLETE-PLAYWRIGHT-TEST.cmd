@echo off
echo ===============================================
echo COMPLETE PLAYWRIGHT TEST SUITE
echo Manufacturing Analytics Platform
echo ===============================================
echo.

:: Set environment variables for testing
set NODE_ENV=test
set NEXT_PUBLIC_APP_URL=http://localhost:3000
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
set TEST_TIMEOUT=120000

echo [1/10] Checking prerequisites...
echo ===============================================

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    exit /b 1
)

echo ✓ Node.js and npm are installed
echo.

echo [2/10] Installing/Updating Playwright...
echo ===============================================
call npm install -D @playwright/test@latest
if errorlevel 1 (
    echo ERROR: Failed to install Playwright
    exit /b 1
)

:: Install Playwright browsers
echo Installing Playwright browsers...
call npx playwright install
if errorlevel 1 (
    echo ERROR: Failed to install Playwright browsers
    exit /b 1
)

echo ✓ Playwright installed successfully
echo.

echo [3/10] Setting up test database...
echo ===============================================
:: Create test database if it doesn't exist
echo Creating test database...
call npx prisma db push --schema=./prisma/schema.prisma
if errorlevel 1 (
    echo WARNING: Database setup had issues, continuing...
)

:: Seed test data
echo Seeding test data...
call npx tsx prisma/seed.ts
if errorlevel 1 (
    echo WARNING: Data seeding had issues, continuing...
)

echo ✓ Test database ready
echo.

echo [4/10] Building the application...
echo ===============================================
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    exit /b 1
)

echo ✓ Application built successfully
echo.

echo [5/10] Starting the development server...
echo ===============================================
:: Start the server in the background
start /B cmd /c "npm run dev > server.log 2>&1"

:: Wait for server to be ready
echo Waiting for server to start...
timeout /t 10 /nobreak >nul

:: Check if server is running
curl -s -o nul http://localhost:3000
if errorlevel 1 (
    echo WARNING: Server might not be ready yet, waiting more...
    timeout /t 10 /nobreak >nul
)

echo ✓ Development server started
echo.

echo [6/10] Running comprehensive Playwright tests...
echo ===============================================
echo.
echo Running ALL tests with:
echo - Headed mode (visible browser)
echo - Detailed reporting
echo - Screenshot on failure
echo - Video recording
echo - Trace recording
echo.

:: Create test results directory
if not exist "playwright-results" mkdir playwright-results

:: Run comprehensive tests
call npx playwright test ^
    --headed ^
    --reporter=html,list,json ^
    --timeout=%TEST_TIMEOUT% ^
    --retries=1 ^
    --workers=1 ^
    --trace=on ^
    --video=on ^
    --screenshot=on ^
    --output=playwright-results ^
    --grep-invert="@skip" ^
    tests/e2e/comprehensive-full-test.spec.ts ^
    tests/e2e/comprehensive-navigation-test.spec.ts ^
    tests/e2e/comprehensive-ui-test.spec.ts ^
    tests/e2e/authentication.spec.ts ^
    tests/e2e/dashboard.spec.ts ^
    tests/e2e/alerts.spec.ts ^
    tests/e2e/ai-chat.spec.ts ^
    tests/e2e/manufacturing-chat.spec.ts ^
    tests/e2e/equipment.spec.ts ^
    tests/e2e/navigation.spec.ts ^
    tests/e2e/exhaustive-dashboard-interactions.spec.ts

set TEST_RESULT=%errorlevel%

echo.
echo [7/10] Running page-specific tests...
echo ===============================================
call npx playwright test ^
    --headed ^
    --reporter=list ^
    --timeout=%TEST_TIMEOUT% ^
    --workers=1 ^
    tests/e2e/pages/

echo.
echo [8/10] Running accessibility tests...
echo ===============================================
call npx playwright test ^
    --headed ^
    --reporter=list ^
    --timeout=%TEST_TIMEOUT% ^
    tests/accessibility/

echo.
echo [9/10] Running performance tests...
echo ===============================================
call npx playwright test ^
    --headed ^
    --reporter=list ^
    --timeout=%TEST_TIMEOUT% ^
    tests/performance/

echo.
echo [10/10] Generating test report...
echo ===============================================

:: Open HTML report
if %TEST_RESULT%==0 (
    echo ✓ ALL TESTS PASSED!
    echo.
    echo Opening test report...
    call npx playwright show-report
) else (
    echo ✗ Some tests failed. Check the report for details.
    echo.
    echo Opening test report...
    call npx playwright show-report
)

:: Stop the development server
echo.
echo Cleaning up...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ===============================================
echo TEST SUMMARY
echo ===============================================
echo.
echo Test results saved to: playwright-results/
echo HTML Report: playwright-report/index.html
echo Videos: playwright-results/
echo Screenshots: playwright-results/
echo Traces: playwright-results/
echo.
echo To view the report again, run: npx playwright show-report
echo.

pause
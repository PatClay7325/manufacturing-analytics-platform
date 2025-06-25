@echo off
setlocal enabledelayedexpansion

echo ===============================================
echo COMPLETE PLAYWRIGHT TEST SUITE (DEBUG VERSION)
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

:: Check Node.js with better error handling
echo Checking Node.js...
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo Found Node.js version: !NODE_VERSION!

:: Check npm
echo Checking npm...
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version 2^>^&1') do set NPM_VERSION=%%i
echo Found npm version: !NPM_VERSION!

echo Prerequisites check passed!
echo.

echo [2/10] Installing/Updating Playwright...
echo ===============================================
echo Installing @playwright/test...
call npm install -D @playwright/test@latest
if !errorlevel! neq 0 (
    echo ERROR: Failed to install Playwright
    echo Try running: npm install
    pause
    exit /b 1
)

:: Install Playwright browsers
echo Installing Playwright browsers...
call npx playwright install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install Playwright browsers
    pause
    exit /b 1
)

echo Playwright installed successfully!
echo.

echo [3/10] Checking database connection...
echo ===============================================
:: Check if PostgreSQL is running
echo Checking PostgreSQL connection...
call npx prisma db push --schema=./prisma/schema.prisma --skip-generate --accept-data-loss
if !errorlevel! neq 0 (
    echo WARNING: Database connection failed
    echo Make sure PostgreSQL is running on localhost:5432
    echo Continuing without database...
)

echo.

echo [4/10] Building the application...
echo ===============================================
echo This may take a few minutes...
call npm run build
if !errorlevel! neq 0 (
    echo ERROR: Build failed
    echo Try running: npm install
    pause
    exit /b 1
)

echo Build completed successfully!
echo.

echo [5/10] Starting the development server...
echo ===============================================
:: Kill any existing Node processes on port 3000
echo Checking for existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Start the server
echo Starting Next.js development server...
start /B cmd /c "npm run dev"

:: Wait for server with better checking
echo Waiting for server to start...
set RETRIES=0
:wait_for_server
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3000
if !errorlevel! neq 0 (
    set /a RETRIES+=1
    if !RETRIES! lss 15 (
        echo Still waiting... (!RETRIES!/15)
        goto wait_for_server
    ) else (
        echo ERROR: Server failed to start after 30 seconds
        echo Check if port 3000 is available
        pause
        exit /b 1
    )
)

echo Server is ready!
echo.

echo [6/10] Creating test directories...
echo ===============================================
if not exist "playwright-results" mkdir playwright-results
if not exist "playwright-report" mkdir playwright-report
echo.

echo [7/10] Running Playwright tests...
echo ===============================================
echo Running tests in headed mode (visible browser)...
echo.

:: First, let's check what test files exist
echo Available test files:
dir /b tests\e2e\*.spec.ts 2>nul
if !errorlevel! neq 0 (
    echo No test files found in tests\e2e\
    echo Creating a basic test...
    if not exist "tests\e2e" mkdir tests\e2e
    call :create_basic_test
)

echo.
echo Starting test execution...
echo.

:: Run the tests
call npx playwright test --list
call npx playwright test --headed --reporter=html,list --timeout=60000

set TEST_RESULT=!errorlevel!

echo.
echo [8/10] Test Results
echo ===============================================
if !TEST_RESULT! equ 0 (
    echo ALL TESTS PASSED!
) else (
    echo Some tests failed. Check the report for details.
)

echo.
echo [9/10] Opening test report...
echo ===============================================
call npx playwright show-report

echo.
echo [10/10] Cleanup
echo ===============================================
echo Stopping development server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ===============================================
echo TEST EXECUTION COMPLETE
echo ===============================================
echo.
echo Test artifacts:
echo - HTML Report: playwright-report\index.html
echo - Screenshots: playwright-results\
echo.
echo To run tests again: npx playwright test
echo To see last report: npx playwright show-report
echo.
pause
exit /b 0

:create_basic_test
(
echo import { test, expect } from '@playwright/test';
echo.
echo test('basic test', async ({ page }) =^> {
echo   await page.goto('http://localhost:3000');
echo   await expect(page).toHaveTitle(/Manufacturing/);
echo });
) > tests\e2e\basic.spec.ts
exit /b 0
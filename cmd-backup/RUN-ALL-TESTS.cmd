@echo off
echo ===============================================
echo MANUFACTURING ANALYTICS - COMPLETE TEST SUITE
echo ===============================================
echo.

:: Check if npm is available
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not found. Please install Node.js
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: Install Playwright if needed
if not exist "node_modules\@playwright\test" (
    echo Installing Playwright...
    call npm install -D @playwright/test
    call npx playwright install
)

:: Kill any process on port 3000
echo Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1

:: Start the dev server
echo Starting development server...
start /B npm run dev

:: Wait for server
echo Waiting for server to start (15 seconds)...
timeout /t 15

:: Run different test suites
echo.
echo ===============================================
echo Running E2E Tests from tests/e2e directory
echo ===============================================
if exist "tests\e2e" (
    echo Running comprehensive tests...
    call npx playwright test tests/e2e --reporter=list
)

echo.
echo ===============================================
echo Running Integration Tests
echo ===============================================
if exist "src\__tests__" (
    echo Running vitest integration tests...
    call npm run test
)

echo.
echo ===============================================
echo Running Specific Feature Tests
echo ===============================================

:: AI Chat Tests
echo.
echo Testing AI Chat features...
call npx playwright test --grep "chat|ai|assistant" --reporter=list

:: Dashboard Tests
echo.
echo Testing Dashboard features...
call npx playwright test --grep "dashboard" --reporter=list

:: Authentication Tests
echo.
echo Testing Authentication...
call npx playwright test --grep "auth|login" --reporter=list

:: Alert Tests
echo.
echo Testing Alerts...
call npx playwright test --grep "alert" --reporter=list

echo.
echo ===============================================
echo Generating HTML Report
echo ===============================================
call npx playwright show-report

:: Cleanup
echo.
echo Cleaning up...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ===============================================
echo TEST EXECUTION COMPLETE
echo ===============================================
echo.
echo View test results:
echo - HTML Report: playwright-report\index.html
echo - Run specific test: npx playwright test [filename]
echo - Debug mode: npx playwright test --debug
echo - UI mode: npx playwright test --ui
echo.
pause
@echo off
echo === Running Playwright Tests on Windows ===
echo.

REM Kill any existing Node processes on port 3000
echo Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Killing process %%a on port 3000
    taskkill /F /PID %%a 2>nul
)

echo.
echo Starting development server and running tests...
echo.

REM Set environment variables for Windows
set NODE_ENV=development
set PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

REM Run the tests
echo Running Playwright E2E tests...
npm run test:e2e

echo.
echo === Test Results ===
echo.
echo If tests failed, check:
echo 1. Ensure the dev server is running (npm run dev)
echo 2. Check if Ollama is running for chat tests
echo 3. Review the HTML report: npx playwright show-report
echo.
pause
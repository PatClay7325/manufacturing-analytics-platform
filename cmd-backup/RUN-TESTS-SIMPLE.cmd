@echo off
echo ===============================================
echo SIMPLE PLAYWRIGHT TEST RUNNER
echo ===============================================
echo.

:: First ensure dependencies are installed
echo Installing dependencies...
call npm install

echo.
echo Installing Playwright...
call npm install -D @playwright/test
call npx playwright install chromium

echo.
echo Starting development server...
start /B npm run dev

echo.
echo Waiting for server (10 seconds)...
timeout /t 10

echo.
echo Running Playwright tests...
echo.

:: Run tests with simple output
call npx playwright test --reporter=list

echo.
echo ===============================================
echo To view detailed report run:
echo npx playwright show-report
echo ===============================================
echo.
pause
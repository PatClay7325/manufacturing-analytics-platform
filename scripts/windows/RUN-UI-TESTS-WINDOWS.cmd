@echo off
echo ===============================================
echo    COMPREHENSIVE UI TESTS FOR WINDOWS
echo    This will test all UI elements and buttons
echo ===============================================
echo.

echo [1] First, make sure your development server is running
echo     If not, open another terminal and run: npm run dev
echo.
pause

echo.
echo [2] Running comprehensive UI tests...
echo.

REM Run the comprehensive UI test
npx playwright test tests/e2e/comprehensive-ui-test.spec.ts --reporter=list

echo.
echo ===============================================
echo    GENERATE HTML REPORT
echo ===============================================
echo.

REM Generate and show the HTML report
npx playwright show-report

pause
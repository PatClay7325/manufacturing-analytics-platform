@echo off
echo ===============================================
echo    COMPREHENSIVE UI TESTING
echo    Testing Every Page, Button, and Field
echo ===============================================
echo.

echo [SETUP] Checking prerequisites...
echo.

REM Check if server is running
echo Checking if development server is running...
curl -s -o nul -w "Server Status: %%{http_code}\n" http://localhost:3000
echo.

REM Ask user to start server if needed
echo IMPORTANT: Make sure your dev server is running (npm run dev)
echo Press Ctrl+C to cancel and start the server, or
pause

echo.
echo [1] Installing/Updating Playwright...
call npx playwright install
call npx playwright install-deps

echo.
echo ===============================================
echo    RUNNING COMPREHENSIVE UI TESTS
echo ===============================================
echo.

echo [2] Running ALL UI tests...
echo This will test:
echo - Homepage (all buttons and links)
echo - Dashboard (KPI cards, equipment status, alerts)
echo - Equipment page (search, filters, detail views)
echo - Alerts page (severity filters, acknowledgment)
echo - Manufacturing Chat (input, send button, responses)
echo - Navigation (all menu items)
echo - Footer (all links)
echo - Form inputs and dropdowns
echo - Error handling (404 pages)
echo - Responsive design (mobile, tablet)
echo - Additional pages (docs, support, status)
echo.

REM Run the comprehensive test suite
npx playwright test tests/e2e/comprehensive-ui-test.spec.ts --reporter=list

echo.
echo ===============================================
echo    GENERATE DETAILED HTML REPORT
echo ===============================================
echo.

REM Generate and open HTML report
npx playwright show-report

echo.
echo ===============================================
echo    QUICK TEST SPECIFIC FEATURES
echo ===============================================
echo.
echo Run specific test groups:
echo - Homepage only: npx playwright test -g "Homepage"
echo - Dashboard only: npx playwright test -g "Dashboard"
echo - Equipment only: npx playwright test -g "Equipment Page"
echo - Alerts only: npx playwright test -g "Alerts Page"
echo - Chat only: npx playwright test -g "Manufacturing Chat"
echo - Navigation only: npx playwright test -g "Navigation"
echo.

pause
@echo off
echo ==========================================
echo Simple 404 Error Check - Fixed Version
echo ==========================================
echo.

REM Check if dev server is running
echo [1/4] Checking if development server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server is not running on localhost:3000
    echo Please start the development server first with: npm run dev
    echo.
    pause
    exit /b 1
)
echo ✅ Development server is running

REM Install Playwright if not already installed
echo.
echo [2/4] Ensuring Playwright is installed...
call npx playwright --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Playwright...
    call npm install -D @playwright/test
    call npx playwright install
)
echo ✅ Playwright is ready

REM Run the test with corrected syntax
echo.
echo [3/4] Running comprehensive 404 error check...
echo This may take several minutes as it tests every page...
echo.

REM Use basic Playwright command with correct test path
call npx playwright test tests/e2e/comprehensive-404-check.spec.ts --reporter=html

REM Check results
echo.
echo [4/4] Test completed!
if %errorlevel% equ 0 (
    echo ✅ All tests passed - No 404 errors found!
) else (
    echo ❌ Some tests failed - 404 errors detected
    echo Check the HTML report for details
)

REM Open results
echo.
echo Opening test results...
if exist "playwright-report\index.html" (
    start "" "playwright-report\index.html"
) else (
    echo Test report not found. Check console output above for details.
)

echo.
echo ==========================================
echo Test Summary:
echo - Results saved in: playwright-report/
echo - Run this script again to re-test
echo ==========================================
echo.
pause
@echo off
echo ==========================================
echo Comprehensive 404 Error Check for Manufacturing Analytics Platform
echo ==========================================
echo.

REM Check if dev server is running
echo [1/5] Checking if development server is running...
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
echo [2/5] Ensuring Playwright is installed...
call npx playwright --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Playwright...
    call npm install -D @playwright/test
    call npx playwright install
)
echo ✅ Playwright is ready

REM Create results directory
echo.
echo [3/5] Setting up test results directory...
if not exist "test-results-404" mkdir test-results-404
echo ✅ Results directory ready

REM Run the comprehensive 404 check
echo.
echo [4/5] Running comprehensive 404 error check...
echo This may take several minutes as it tests every page...
echo.

call npx playwright test tests/comprehensive-404-check.spec.ts --config=playwright.config.ts --reporter=html --timeout=60000 --retries=0

REM Check results
echo.
echo [5/5] Test completed!
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
echo - Total routes tested: See console output above
echo - Results saved in: playwright-report/
echo - Detailed logs in: test-results-404/
echo ==========================================
echo.
pause
@echo off
echo ==========================================
echo Running All 404 Error Tests
echo ==========================================
echo.

REM Check if dev server is running
echo [1/3] Checking if development server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server is not running on localhost:3000
    echo Please start the development server first with: npm run dev
    echo.
    pause
    exit /b 1
)
echo ✅ Development server is running

echo.
echo [2/3] Running 404 error tests...
echo This will test for 404 errors across all pages...
echo.

REM Run Playwright tests with pattern matching for 404 tests
call npx playwright test --grep "404" --reporter=html

echo.
echo [3/3] Test completed!
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
    echo Test report not found. Running show-report command...
    call npx playwright show-report
)

echo.
echo ==========================================
echo To run all E2E tests: npx playwright test
echo To run specific test: npx playwright test comprehensive-404-check
echo ==========================================
echo.
pause
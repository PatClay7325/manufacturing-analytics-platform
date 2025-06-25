@echo off
echo ==========================================
echo Running Playwright Tests (Headless Mode)
echo ==========================================
echo.

REM Check if dev server is running
echo Checking development server...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server is not running
    echo Starting development server...
    start /b npm run dev
    echo Waiting 15 seconds for server to fully start...
    timeout /t 15 /nobreak >nul
)

echo ✅ Development server is ready
echo.

REM Run Playwright tests in headless mode with detailed output
echo Running comprehensive 404 check in headless mode...
echo This will test all pages and provide a detailed report
echo.

call npx playwright test tests/comprehensive-404-check.spec.ts ^
    --config=playwright.config.ts ^
    --reporter=list,html ^
    --timeout=60000 ^
    --retries=1 ^
    --workers=2

echo.
echo ==========================================
echo Test Results Summary
echo ==========================================
if %errorlevel% equ 0 (
    echo ✅ ALL TESTS PASSED - No 404 errors detected!
    echo Your application is running correctly.
) else (
    echo ❌ SOME TESTS FAILED - 404 errors or loading issues detected
    echo Check the detailed report for specific issues.
)

echo.
echo 📊 Opening detailed HTML report...
if exist "playwright-report\index.html" (
    start "" "playwright-report\index.html"
) else (
    echo HTML report not generated. Check console output for errors.
)

echo.
echo 📁 Test artifacts saved in: test-results-404\
echo 📋 Full report available at: playwright-report\index.html
echo.
pause
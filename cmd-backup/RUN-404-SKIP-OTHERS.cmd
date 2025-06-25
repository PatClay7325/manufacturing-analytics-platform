@echo off
echo ==========================================
echo Running 404 Check - Skipping Other Tests
echo ==========================================
echo.

REM Check if dev server is running
echo Checking if development server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server is not running
    echo Please start the development server first with: npm run dev
    echo.
    pause
    exit /b 1
)
echo ✅ Development server is running

echo.
echo Running ONLY the 404 check test (skipping problematic tests)...
echo.

REM Run specific test file with exact path
call npx playwright test tests/e2e/comprehensive-404-check.spec.ts --reporter=list --project=chromium

echo.
echo Test completed!
if %errorlevel% equ 0 (
    echo ✅ 404 test passed - No 404 errors found!
    echo.
    echo To see detailed report:
    echo   npx playwright show-report
) else (
    echo ❌ Some issues detected - check output above
)

echo.
pause
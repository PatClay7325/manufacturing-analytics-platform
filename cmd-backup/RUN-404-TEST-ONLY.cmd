@echo off
echo ==========================================
echo Running ONLY the 404 Error Check Test
echo ==========================================
echo.

REM Check if dev server is running
echo Checking if development server is running...
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
echo Running the comprehensive 404 check test...
echo.

REM Run only the 404 check test
call npx playwright test comprehensive-404-check --reporter=list

echo.
echo Test completed!
if %errorlevel% equ 0 (
    echo ✅ 404 test passed - No 404 errors found!
) else (
    echo ❌ 404 test failed - Some errors detected
)

echo.
echo To see the HTML report, run:
echo   npx playwright show-report
echo.
pause
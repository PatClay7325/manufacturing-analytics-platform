@echo off
echo ==========================================
echo Running Isolated 404 Check (No Dependencies)
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
echo Running isolated 404 check test...
echo.

REM Create a temporary directory for isolated test
if not exist "tests-isolated" mkdir tests-isolated

REM Copy only the 404 test to isolated directory
copy /Y tests\e2e\comprehensive-404-check.spec.ts tests-isolated\comprehensive-404-check.spec.ts >nul

REM Run only the isolated 404 test with minimal config
call npx playwright test tests-isolated/comprehensive-404-check.spec.ts --reporter=list --config=playwright.config.ts

echo.
echo Test completed!
if %errorlevel% equ 0 (
    echo ✅ 404 test passed - No 404 errors found!
) else (
    echo ❌ 404 test failed - Check for 404 errors above
)

REM Clean up
rmdir /S /Q tests-isolated 2>nul

echo.
pause
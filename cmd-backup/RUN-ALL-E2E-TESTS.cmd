@echo off
echo ==========================================
echo Running All E2E Tests (Including 404 Checks)
echo ==========================================
echo.

REM Check if dev server is running
echo Checking if development server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server is not running
    echo Starting development server...
    start /b npm run dev
    echo Waiting 15 seconds for server to start...
    timeout /t 15 /nobreak >nul
)
echo ✅ Development server is ready

echo.
echo Running ALL E2E tests...
echo This includes the comprehensive 404 check and other tests
echo.

REM Run all E2E tests
call npx playwright test --reporter=html

echo.
echo Test completed!
if %errorlevel% equ 0 (
    echo ✅ ALL TESTS PASSED!
) else (
    echo ❌ Some tests failed - check the report
)

echo.
echo Opening detailed HTML report...
if exist "playwright-report\index.html" (
    start "" "playwright-report\index.html"
) else (
    call npx playwright show-report
)

echo.
pause
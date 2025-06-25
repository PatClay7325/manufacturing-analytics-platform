@echo off
echo ==========================================
echo Running Playwright Tests (Headed Mode - Visual)
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

echo Running comprehensive 404 check in HEADED mode...
echo You will see browser windows opening for each test
echo This provides visual feedback of what's happening
echo.
echo Press any key to start the visual tests...
pause >nul

call npx playwright test tests/comprehensive-404-check.spec.ts ^
    --config=playwright.config.ts ^
    --reporter=list,html ^
    --headed ^
    --timeout=60000 ^
    --retries=0 ^
    --workers=1

echo.
echo ==========================================
echo Visual Test Results Summary
echo ==========================================
if %errorlevel% equ 0 (
    echo ✅ ALL TESTS PASSED - No 404 errors detected!
) else (
    echo ❌ SOME TESTS FAILED - Check the issues visually observed
)

echo.
echo 📊 Opening detailed HTML report...
if exist "playwright-report\index.html" (
    start "" "playwright-report\index.html"
)

echo.
pause
@echo off
echo === Running Specific Playwright Test ===
echo.

REM You can modify this to run specific test files
echo Choose which test to run:
echo 1. Dashboard tests
echo 2. AI Chat tests
echo 3. Manufacturing Chat tests
echo 4. Navigation tests
echo 5. Alerts tests
echo 6. Equipment tests
echo 7. All tests
echo.

set /p choice="Enter number (1-7): "

if "%choice%"=="1" (
    echo Running Dashboard tests...
    npx playwright test tests/e2e/dashboard.spec.ts --reporter=list
) else if "%choice%"=="2" (
    echo Running AI Chat tests...
    npx playwright test tests/e2e/ai-chat.spec.ts --reporter=list
) else if "%choice%"=="3" (
    echo Running Manufacturing Chat tests...
    npx playwright test tests/e2e/manufacturing-chat.spec.ts --reporter=list
) else if "%choice%"=="4" (
    echo Running Navigation tests...
    npx playwright test tests/e2e/navigation.spec.ts --reporter=list
) else if "%choice%"=="5" (
    echo Running Alerts tests...
    npx playwright test tests/e2e/alerts.spec.ts --reporter=list
) else if "%choice%"=="6" (
    echo Running Equipment tests...
    npx playwright test tests/e2e/equipment.spec.ts --reporter=list
) else if "%choice%"=="7" (
    echo Running all tests...
    npx playwright test --reporter=list
) else (
    echo Invalid choice!
)

echo.
echo Test completed!
echo.
pause
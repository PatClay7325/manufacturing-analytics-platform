@echo off
echo ================================================================================
echo HEADLESS PLAYWRIGHT TESTS - CI/CD MODE
echo ================================================================================
echo.

:: Set environment for headless testing
set NODE_ENV=test
set CI=true
set HEADLESS=true

:: Install dependencies if needed
if not exist node_modules\.bin\playwright (
    echo Installing Playwright browsers...
    call npx playwright install --with-deps chromium firefox webkit
)

:: Run tests in headless mode with detailed output
echo Running headless tests...
echo.

:: Basic smoke tests
echo [1/5] Running smoke tests...
call npx playwright test tests/e2e/navigation.spec.ts --reporter=json --reporter=github

:: Component interaction tests
echo.
echo [2/5] Running component tests...
call npx playwright test tests/e2e/comprehensive-ui-test.spec.ts --reporter=json

:: Dashboard specific tests
echo.
echo [3/5] Running dashboard tests...
call npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/pages/dashboard-comprehensive.spec.ts --reporter=json

:: Exhaustive interaction tests
echo.
echo [4/5] Running exhaustive interaction tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --reporter=json

:: Generate consolidated report
echo.
echo [5/5] Generating test report...
call npx playwright merge-reports --reporter html ./test-results

:: Output summary
echo.
echo ================================================================================
echo TEST SUMMARY
echo ================================================================================
type test-results\*.json | findstr /i "passed failed skipped"
echo.
echo Full report: playwright-report\index.html
echo.

:: Exit with appropriate code for CI/CD
if %ERRORLEVEL% neq 0 (
    echo TESTS FAILED!
    exit /b 1
) else (
    echo ALL TESTS PASSED!
    exit /b 0
)
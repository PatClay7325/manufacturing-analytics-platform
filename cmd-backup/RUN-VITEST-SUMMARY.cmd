@echo off
echo ==========================================
echo Running Vitest Tests - Summary Report
echo ==========================================
echo.

echo Running all tests with summary output...
echo.

REM Run tests and capture output
call npm run test -- --reporter=json > test-results.json 2>&1

REM Check if tests ran successfully
if %errorlevel% neq 0 (
    echo.
    echo ❌ Tests failed. Running again with verbose output...
    echo.
    call npm run test -- --reporter=verbose
) else (
    echo ✅ All tests passed!
)

echo.
echo ==========================================
echo Test Summary:
echo ==========================================
echo.

REM Count test results
type test-results.json | findstr "numTotalTests" 2>nul
type test-results.json | findstr "numPassedTests" 2>nul
type test-results.json | findstr "numFailedTests" 2>nul

echo.
echo To run specific failed tests:
echo   npm run test -- path/to/failing.test.ts
echo.
echo To run in watch mode:
echo   npm run test:watch
echo.
echo To see coverage:
echo   npm run test:coverage
echo.
echo ==========================================
pause
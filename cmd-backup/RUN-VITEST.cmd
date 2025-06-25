@echo off
echo ==========================================
echo Running Vitest Tests
echo ==========================================
echo.

echo [1/2] Running all vitest unit tests...
echo.

call npm run test

echo.
echo [2/2] Test run completed!
echo.

if %errorlevel% equ 0 (
    echo ✅ All tests passed!
) else (
    echo ❌ Some tests failed - check output above
)

echo.
echo ==========================================
echo To run specific test files:
echo   npm run test -- path/to/test.test.ts
echo.
echo To run tests in watch mode:
echo   npm run test:watch
echo.
echo To see coverage report:
echo   npm run test:coverage
echo ==========================================
echo.
pause
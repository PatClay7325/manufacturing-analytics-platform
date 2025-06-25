@echo off
echo ==========================================
echo Running Vitest Tests with Detailed Output
echo ==========================================
echo.

echo Running tests with detailed reporter...
echo.

call npm run test -- --reporter=verbose

echo.
echo ==========================================
echo Test Summary:
echo.

if %errorlevel% equ 0 (
    echo ✅ All tests passed!
) else (
    echo ❌ Some tests failed
    echo.
    echo To fix specific test failures:
    echo 1. Review the error messages above
    echo 2. Run individual test files with:
    echo    npm run test -- src/path/to/test.test.ts
    echo.
    echo Common fixes:
    echo - Missing imports: Check module paths
    echo - Type errors: Update TypeScript types
    echo - Assertion failures: Update expected values
)

echo.
pause
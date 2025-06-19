@echo off
echo === VITEST TEST RUNNER ===
echo.

echo [1] Setting test environment...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [2] Choose test type:
echo.
echo   1. Unit tests only
echo   2. Integration tests only
echo   3. All Vitest tests
echo   4. Test with coverage
echo   5. Test in watch mode
echo   6. Test specific file/pattern
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo.
    echo Running unit tests...
    npx vitest run --config vitest.config.ts
) else if "%choice%"=="2" (
    echo.
    echo Running integration tests...
    npx vitest run --config vitest.config.integration.ts
) else if "%choice%"=="3" (
    echo.
    echo Running all Vitest tests...
    echo.
    echo === Unit Tests ===
    npx vitest run --config vitest.config.ts
    echo.
    echo === Integration Tests ===
    npx vitest run --config vitest.config.integration.ts
) else if "%choice%"=="4" (
    echo.
    echo Running tests with coverage...
    npx vitest run --coverage
    echo.
    echo Coverage report generated in coverage/index.html
) else if "%choice%"=="5" (
    echo.
    echo Starting watch mode - press 'q' to quit...
    npx vitest
) else if "%choice%"=="6" (
    echo.
    set /p pattern="Enter file pattern or path: "
    echo.
    echo Running tests matching: %pattern%
    npx vitest run %pattern%
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

echo.
echo === Test run complete ===
echo.
pause
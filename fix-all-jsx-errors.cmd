@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Comprehensive JSX Syntax Error Fixer
echo ========================================
echo.
echo This will automatically detect and fix JSX syntax errors
echo that are preventing the build from completing.
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies first...
    call npm install
    echo.
)

echo Starting comprehensive JSX error fixing...
echo.

REM Run the comprehensive JSX fixer
npx vitest run src/__tests__/syntax/comprehensive-jsx-fixer.test.ts --reporter=verbose

echo.
echo ========================================
echo Testing the build after fixes...
echo ========================================
echo.

REM Try to run the build to see if errors are resolved
echo Running build to verify fixes...
call npm run build

if !errorlevel! equ 0 (
    echo.
    echo ✅ SUCCESS: Build completed without errors!
    echo ========================================
    echo All JSX syntax errors have been fixed!
    echo ========================================
) else (
    echo.
    echo ⚠️  Build still has errors. Additional manual fixes may be needed.
    echo Check the build output above for remaining issues.
)

echo.
echo Press any key to exit...
pause >nul
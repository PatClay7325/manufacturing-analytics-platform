@echo off
echo ========================================
echo    Optional Chaining Syntax Validator
echo ========================================
echo.
echo This script will check your code for common optional chaining syntax errors
echo that cause TypeScript compilation failures.
echo.
echo Press any key to start the syntax check...
pause > nul

echo.
echo [1/2] Running syntax validation tests...
echo ----------------------------------------
call npm run test:syntax

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Syntax errors detected!
    echo.
    echo Would you like to automatically fix these errors? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        echo.
        echo [2/2] Running automatic syntax fixer...
        echo ----------------------------------------
        call npm run fix:syntax
        echo.
        echo ✅ Syntax fixes applied!
        echo.
        echo Re-running validation to confirm fixes...
        call npm run test:syntax
    ) else (
        echo.
        echo To see what would be fixed without making changes, run:
        echo   npm run fix:syntax:dry
        echo.
        echo To apply fixes, run:
        echo   npm run fix:syntax
    )
) else (
    echo.
    echo ✅ No syntax errors found! Your code is clean.
)

echo.
echo ========================================
echo    Syntax Check Complete
echo ========================================
pause
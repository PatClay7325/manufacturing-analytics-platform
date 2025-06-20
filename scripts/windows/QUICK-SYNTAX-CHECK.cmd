@echo off
echo ========================================
echo    Quick Syntax Check
echo ========================================
echo.
echo Checking for common syntax errors...
echo.

call npm run test:syntax

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ All good! No syntax errors found.
) else (
    echo.
    echo ❌ Syntax errors found!
    echo.
    echo Run FIX-SYNTAX-ERRORS.cmd to automatically fix these issues.
)

echo.
pause
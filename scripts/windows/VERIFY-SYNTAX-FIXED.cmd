@echo off
echo ========================================
echo    Verifying All Syntax Errors Fixed
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Running syntax validation test...
echo.

call npm run test:syntax

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ SUCCESS! All syntax errors have been fixed!
    echo ========================================
    echo.
    echo Your codebase now has clean TypeScript syntax.
    echo The optional chaining issues have been resolved.
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ There may still be syntax errors.
    echo ========================================
    echo.
    echo Run VIEW-DETAILED-ERRORS.cmd to see what's left.
)

pause
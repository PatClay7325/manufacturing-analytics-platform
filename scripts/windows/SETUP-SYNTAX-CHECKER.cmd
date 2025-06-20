@echo off
echo ========================================
echo    Setup Syntax Checker Dependencies
echo ========================================
echo.
echo This script will install required dependencies for the syntax checker.
echo.

echo Installing glob for file pattern matching...
call npm install --save-dev glob@^10.3.10

echo Installing chalk for colored console output...
call npm install --save-dev chalk@^5.3.0

echo Installing tsx for TypeScript execution...
call npm install --save-dev tsx@^4.6.2

echo.
echo ✅ Dependencies installed successfully!
echo.
echo You can now run:
echo   - QUICK-SYNTAX-CHECK.cmd    (Check for syntax errors)
echo   - FIX-SYNTAX-ERRORS.cmd     (Automatically fix errors)
echo   - TEST-SYNTAX-ERRORS.cmd    (Interactive check and fix)
echo.
pause
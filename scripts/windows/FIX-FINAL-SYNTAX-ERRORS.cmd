@echo off
echo ========================================
echo    Fix Final Remaining Syntax Errors
echo ========================================
echo.
echo This will fix the remaining 8 syntax errors:
echo   - 6 assignment to optional chaining
echo   - 1 innerHTML assignment  
echo   - 1 typeof with optional chaining
echo.

cd /d "%~dp0..\.."

echo Applying final fixes...
echo.

call npx tsx scripts/fix-remaining-syntax-errors.ts

echo.
echo ========================================
echo Verifying all syntax errors are resolved...
echo.

call npm run test:syntax

echo.
echo ========================================
echo If all tests pass, your syntax is clean!
echo.
pause
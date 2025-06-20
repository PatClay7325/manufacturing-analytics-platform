@echo off
echo ========================================
echo    Final Syntax Check
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Checking for any remaining syntax errors...
echo.

call npx tsx scripts/view-remaining-errors.ts

echo.
echo ========================================
echo Running full syntax validation...
echo.

call npm run test:syntax

echo.
pause
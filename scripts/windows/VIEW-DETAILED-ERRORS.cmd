@echo off
echo ========================================
echo    Detailed View of Remaining Errors
echo ========================================
echo.

cd /d "%~dp0..\.."

call npx tsx scripts/view-remaining-errors.ts

echo.
pause
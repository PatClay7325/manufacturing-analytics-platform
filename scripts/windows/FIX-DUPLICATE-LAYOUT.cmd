@echo off
echo ========================================
echo    Fix Duplicate DashboardLayout
echo ========================================
echo.

cd /d "%~dp0..\.."

call npx tsx scripts/fix-duplicate-layout.ts

echo.
pause
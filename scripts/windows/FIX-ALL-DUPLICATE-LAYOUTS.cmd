@echo off
echo ========================================
echo    Fix ALL Duplicate DashboardLayouts
echo ========================================
echo.
echo This will remove DashboardLayout wrappers from all pages
echo since it's now in the root layout.
echo.

cd /d "%~dp0..\.."

call npx tsx scripts/fix-all-duplicate-layouts.ts

echo.
echo ========================================
echo Done! Now restart your dev server.
echo.
pause
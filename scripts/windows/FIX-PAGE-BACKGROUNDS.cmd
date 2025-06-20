@echo off
echo ========================================
echo    Fix Page Background Consistency
echo ========================================
echo.
echo This will ensure all pages have consistent background styling
echo by removing duplicate min-h-screen and bg-gray-50 classes.
echo.

cd /d "%~dp0..\.."

call npx tsx scripts/fix-page-backgrounds.ts

echo.
echo ========================================
echo Done! Your pages should now have consistent backgrounds.
echo.
pause
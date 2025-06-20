@echo off
echo ========================================
echo    Fix Dashboard Editor Theme
echo ========================================
echo.
echo This will change the Dashboard Editor from dark theme to light theme
echo to match the rest of the application.
echo.

cd /d "%~dp0..\.."

call npx tsx scripts/fix-dashboard-editor-theme.ts

echo.
echo ========================================
echo Theme update complete!
echo.
pause
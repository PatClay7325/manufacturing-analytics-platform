@echo off
echo ========================================
echo    Fix Excessive Optional Chaining
echo ========================================
echo.
echo This script removes unnecessary optional chaining operators
echo that were added by auto-formatters or linters.
echo.
echo Examples of fixes:
echo   - Type annotations: Highcharts?.Options → Highcharts.Options
echo   - Global objects: Date?.now() → Date.now()
echo   - Array methods: array?.push() → array.push()
echo.

echo Running fix for excessive optional chaining...
echo.

cd /d "%~dp0..\.."
call npx tsx scripts/fix-excessive-optional-chaining.ts

echo.
echo ========================================
echo Fix complete! Now running syntax validation...
echo.

call npm run test:syntax

echo.
pause
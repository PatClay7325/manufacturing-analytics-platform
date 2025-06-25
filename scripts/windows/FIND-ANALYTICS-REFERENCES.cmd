@echo off
echo ========================================
echo    Find All manufacturingPlatform References
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Searching for manufacturingPlatform references in the codebase...
echo.

call npx tsx scripts/find-manufacturingPlatform-references.ts

echo.
pause
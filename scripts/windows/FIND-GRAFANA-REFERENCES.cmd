@echo off
echo ========================================
echo    Find All Grafana References
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Searching for Grafana references in the codebase...
echo.

call npx tsx scripts/find-grafana-references.ts

echo.
pause
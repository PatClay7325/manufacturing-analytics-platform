@echo off
echo ========================================
echo    Verifying Grafana References Removed
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Searching for any remaining Grafana references...
echo.

REM Search for Grafana in all text files
findstr /s /i /n "grafana" *.ts *.tsx *.js *.jsx *.json *.md *.env *.yml 2>nul | findstr /v "node_modules" | findstr /v ".next" | findstr /v "remove-grafana" | findstr /v "find-grafana" | findstr /v "GRAFANA-REFERENCES"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ⚠️  Found some remaining Grafana references above.
    echo.
) else (
    echo ✅ No Grafana references found!
    echo.
    echo 🏭 Your Manufacturing Analytics Platform is completely clean!
    echo.
)

pause
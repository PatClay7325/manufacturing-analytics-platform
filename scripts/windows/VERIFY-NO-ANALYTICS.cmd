@echo off
echo ========================================
echo    Verifying manufacturingPlatform References Removed
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Searching for any remaining manufacturingPlatform references...
echo.

REM Search for manufacturingPlatform in all text files
findstr /s /i /n "manufacturingPlatform" *.ts *.tsx *.js *.jsx *.json *.md *.env *.yml 2>nul | findstr /v "node_modules" | findstr /v ".next" | findstr /v "remove-manufacturingPlatform" | findstr /v "find-manufacturingPlatform" | findstr /v "manufacturingPlatform-REFERENCES"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ⚠️  Found some remaining manufacturingPlatform references above.
    echo.
) else (
    echo ✅ No manufacturingPlatform references found!
    echo.
    echo 🏭 Your Manufacturing Analytics Platform is completely clean!
    echo.
)

pause
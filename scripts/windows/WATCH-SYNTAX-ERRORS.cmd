@echo off
echo ========================================
echo  Real-time Syntax Error Monitor
echo ========================================
echo.
echo This will watch your files and automatically fix syntax errors as you code.
echo Press Ctrl+C to stop monitoring.
echo.

cd /d "%~dp0..\.."

echo Starting file watcher...
echo.

:watch
echo [%TIME%] Checking for syntax errors...
call npx tsx scripts/fix-all-syntax-errors.ts > nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [%TIME%] ❌ Errors found and fixed! Check the console above.
) else (
    echo [%TIME%] ✅ No syntax errors detected.
)

timeout /t 5 /nobreak > nul
goto watch
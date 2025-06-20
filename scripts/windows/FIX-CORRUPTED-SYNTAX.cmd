@echo off
echo ========================================
echo  Fix Corrupted Syntax Patterns
echo ========================================
echo.
echo This script will fix corrupted syntax patterns including:
echo - Broken href attributes (href=" />dashboard")
echo - Broken xmlns attributes (xmlns="http: />/www.w3.org/2000/svg")
echo - Broken class names with />
echo - Missing closing tags
echo - Double parentheses
echo - And more...
echo.

cd /d "%~dp0..\.."

echo Press Ctrl+C to cancel or
pause

echo.
echo Running corruption fixer...
call npx tsx scripts/fix-corrupted-syntax.ts

echo.
echo ========================================
echo Now running comprehensive syntax check...
echo ========================================
call npx tsx scripts/fix-all-syntax-errors.ts

echo.
echo ========================================
echo Testing build to verify fixes...
echo ========================================
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ All syntax errors have been fixed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ⚠️  Some errors remain. Check the output above.
    echo ========================================
)

echo.
pause
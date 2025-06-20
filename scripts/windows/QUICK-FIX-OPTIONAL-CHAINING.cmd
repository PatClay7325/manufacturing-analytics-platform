@echo off
echo ========================================
echo  Quick Fix: Optional Chaining Errors
echo ========================================
echo.
echo This will fix errors like:
echo   - obj?.(prop ^|^| []) → (obj?.prop ^|^| [])
echo   - alert?.(tags ^|^| []) → (alert?.tags ^|^| [])
echo   - stats?.(trend ^|^| []) → (stats?.trend ^|^| [])
echo.

cd /d "%~dp0..\.."

echo Running quick fix...
call npx vitest run src/__tests__/syntax/fix-optional-chaining-errors.test.ts --reporter=verbose

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Optional chaining errors fixed!
    echo.
    echo Now testing the build...
    call npm run build
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ Build successful! All syntax errors resolved.
    ) else (
        echo.
        echo ⚠️  Build still has errors. Running comprehensive fix...
        call scripts\windows\FIX-ALL-SYNTAX-ERRORS.cmd
    )
) else (
    echo.
    echo ❌ Fix failed. Try the comprehensive fixer instead.
)

pause
@echo off
echo ========================================
echo  Comprehensive Syntax Check
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Installing required dependencies...
call npm install --save-dev @babel/parser @babel/traverse glob

echo.
echo Running comprehensive syntax validation...
echo This will check all TypeScript and JavaScript files for:
echo - Optional chaining syntax errors
echo - JSX/TSX syntax errors  
echo - Import/export errors
echo - TypeScript type errors
echo - Common syntax mistakes
echo.

call npx vitest run src/__tests__/syntax/comprehensive-syntax-check.test.ts --reporter=verbose

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ All syntax checks passed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ❌ Syntax errors found!
    echo ========================================
    echo.
    echo Please fix the errors listed above.
)

echo.
pause
@echo off
echo ========================================
echo    Viewing Remaining Syntax Errors
echo ========================================
echo.

cd /d "%~dp0..\.."

echo Running detailed syntax check...
echo.

call npx vitest run src/__tests__/syntax/optional-chaining-validator.test.ts --reporter=verbose 2>&1 | findstr /V "CJS build" | findstr /V "^$"

echo.
echo ========================================
echo To fix these remaining issues:
echo   1. typeof with optional chaining - needs manual fix
echo   2. Assignment to optional chaining - needs manual fix
echo   3. Other syntax errors - may need manual review
echo.
pause
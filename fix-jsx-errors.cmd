@echo off
echo ========================================
echo JSX Syntax Error Fixer
echo ========================================
echo.
echo This script will scan all React files for JSX syntax errors
echo and automatically fix them.
echo.
echo Starting JSX error detection and fixing...
echo.

REM Run the JSX syntax fixer test
npx vitest run src/__tests__/syntax/jsx-syntax-fixer.test.ts --reporter=verbose

echo.
echo ========================================
echo JSX Error Fixing Complete
echo ========================================
echo.
echo Next steps:
echo 1. Review the changes above
echo 2. Run 'npm run build' to verify fixes
echo 3. Commit the fixed files
echo.
pause
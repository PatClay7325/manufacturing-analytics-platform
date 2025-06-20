@echo off
echo ========================================
echo  Comprehensive Syntax Error Fixer
echo ========================================
echo.
echo This script will automatically fix common syntax errors including:
echo - Incorrect optional chaining (obj?.(prop ^|^| []) errors)
echo - Numeric optional chaining (0?.1)
echo - Malformed XML attributes
echo - Empty JSX expressions
echo - Self-closing tags
echo - And many more...
echo.

cd /d "%~dp0..\.."

echo Press Ctrl+C to cancel or
pause

echo.
echo Installing required dependencies...
call npm install --save-dev @babel/parser glob

echo.
echo ========================================
echo STEP 1: Running comprehensive syntax fixer
echo ========================================
call npx tsx scripts/fix-all-syntax-errors.ts

echo.
echo ========================================
echo STEP 2: Running Vitest to fix remaining errors
echo ========================================
call npx vitest run src/__tests__/syntax/fix-optional-chaining-errors.test.ts --reporter=verbose

echo.
echo ========================================
echo STEP 3: Validating all fixes
echo ========================================
call npx vitest run src/__tests__/syntax/comprehensive-syntax-check.test.ts --reporter=verbose

echo.
echo ========================================
echo ✅ Syntax fix process complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run "npm run build" to verify all errors are fixed
echo 2. Run "npm run dev" to test the application
echo 3. Commit the fixes if everything works
echo.
pause
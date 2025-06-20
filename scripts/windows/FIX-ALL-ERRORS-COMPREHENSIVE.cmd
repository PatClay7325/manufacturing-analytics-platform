@echo off
echo ========================================
echo  COMPREHENSIVE SYNTAX ERROR FIX
echo ========================================
echo.
echo This will fix ALL syntax errors including:
echo - Corrupted syntax patterns
echo - Optional chaining errors  
echo - Missing closing tags
echo - Broken attributes
echo - And more...
echo.

cd /d "%~dp0..\.."

echo Press Ctrl+C to cancel or
pause

echo.
echo ========================================
echo STEP 1: Fixing corrupted syntax patterns
echo ========================================
call npx tsx scripts/fix-corrupted-syntax.ts

echo.
echo ========================================
echo STEP 2: Fixing optional chaining errors
echo ========================================
call npx vitest run src/__tests__/syntax/fix-optional-chaining-errors.test.ts --reporter=verbose

echo.
echo ========================================
echo STEP 3: Running general syntax fixes
echo ========================================
call npx tsx scripts/fix-all-syntax-errors.ts

echo.
echo ========================================
echo STEP 4: Final validation
echo ========================================
call npx vitest run src/__tests__/syntax/comprehensive-syntax-check.test.ts --reporter=verbose

echo.
echo ========================================
echo STEP 5: Build test
echo ========================================
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ SUCCESS! All syntax errors fixed!
    echo ========================================
    echo.
    echo Your project should now build successfully.
    echo Run "npm run dev" to start the development server.
) else (
    echo.
    echo ========================================
    echo ⚠️  Some errors remain
    echo ========================================
    echo.
    echo Please check the build output above for remaining issues.
    echo You may need to manually fix some edge cases.
)

echo.
pause
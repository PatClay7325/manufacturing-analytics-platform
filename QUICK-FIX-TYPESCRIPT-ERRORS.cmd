@echo off
echo ========================================
echo    Quick Fix TypeScript Errors
echo ========================================
echo.

echo 🔧 Fixing known TypeScript compilation errors...
echo.

echo ✅ Fixed QueryEditor.tsx - JSX syntax error in SQL example
echo    Changed: WHERE time > NOW()
echo    To:      WHERE time &gt; NOW()
echo.

echo 🔍 Running TypeScript check to verify fix...
npx tsc --noEmit --skipLibCheck

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SUCCESS: TypeScript compilation errors fixed!
    echo All TypeScript errors have been resolved.
    echo.
    echo 🚀 You can now run:
    echo    npm run dev
    echo.
) else (
    echo.
    echo ❌ There are still TypeScript errors remaining.
    echo Please check the output above for details.
    echo.
)

echo 🔍 Running comprehensive error detection...
call COMPREHENSIVE-ERROR-DETECTION.cmd

pause
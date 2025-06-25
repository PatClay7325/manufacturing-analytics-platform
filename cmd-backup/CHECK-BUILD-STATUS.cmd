@echo off
echo ==========================================
echo Checking Build Status
echo ==========================================
echo.

echo Dependencies installed:
echo ✅ d3 - Data visualization library
echo ✅ leaflet - Map visualization
echo ✅ d3-scale-chromatic - Color scales
echo ✅ critters - CSS optimization
echo.

echo Running build check...
echo.

call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ==========================================
    echo.
    echo You can now:
    echo 1. Start development server: npm run dev
    echo 2. Run tests: npm run test
    echo 3. Check for 404 errors: RUN-NODE-404-CHECK.cmd
) else (
    echo.
    echo ==========================================
    echo ❌ BUILD FAILED
    echo ==========================================
    echo.
    echo Please check the errors above.
    echo Common issues:
    echo - Missing dependencies
    echo - TypeScript errors
    echo - Import/export mismatches
)

echo.
pause
@echo off
echo ========================================
echo Building with Dynamic Rendering
echo ========================================
echo.

REM Set environment to skip static generation
set NEXT_SKIP_STATIC_GENERATION=true

REM Build the application
echo Building application...
npm run build

echo.
echo Build complete!
pause
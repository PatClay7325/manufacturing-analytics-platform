@echo off
echo ========================================
echo    Automatic Syntax Error Fixer
echo ========================================
echo.
echo This script will automatically fix common optional chaining syntax errors:
echo   • Malformed numeric literals (0?.1 → 0.1)
echo   • className with incorrect numbers
echo   • Numeric properties (strokeWidth, fillOpacity, etc.)
echo   • Import statements missing quotes
echo.
echo Choose an option:
echo   1. Dry run (preview changes without applying)
echo   2. Fix all errors automatically
echo   3. Exit
echo.
set /p option="Enter your choice (1-3): "

if "%option%"=="1" (
    echo.
    echo Running dry run to preview changes...
    echo ========================================
    call npm run fix:syntax:dry
    echo.
    echo ========================================
    echo This was a preview. No files were modified.
    echo To apply these fixes, run this script again and choose option 2.
) else if "%option%"=="2" (
    echo.
    echo Applying automatic fixes...
    echo ========================================
    call npm run fix:syntax
    echo.
    echo ========================================
    echo ✅ Syntax fixes have been applied!
    echo.
    echo Running validation to confirm all issues are resolved...
    call npm run test:syntax
) else (
    echo.
    echo Exiting without making changes.
)

echo.
pause
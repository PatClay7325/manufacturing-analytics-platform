@echo off
echo =====================================
echo Updating Prisma Imports to @/lib/database
echo =====================================
echo.

REM Check if tsx is available
where tsx >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing tsx globally...
    npm install -g tsx
)

echo Running import update script...
echo.

tsx scripts/update-prisma-imports.ts

echo.
echo =====================================
echo Import update process complete!
echo =====================================
echo.
echo Next steps:
echo 1. Review the changes made by the script
echo 2. Run "npm run type-check" to verify types
echo 3. Run your test suite to ensure everything works
echo.

pause
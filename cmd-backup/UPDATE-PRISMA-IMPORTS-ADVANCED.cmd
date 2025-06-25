@echo off
setlocal enabledelayedexpansion

echo =====================================
echo Advanced Prisma Import Updater
echo =====================================
echo.

REM Check if tsx is available
where tsx >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing tsx globally...
    npm install -g tsx
)

:menu
echo Select an option:
echo.
echo 1. Dry run (preview changes without modifying files)
echo 2. Update imports with backups
echo 3. Update imports without backups
echo 4. Verify current import status
echo 5. Show detailed help
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto dryrun
if "%choice%"=="2" goto updatebackup
if "%choice%"=="3" goto update
if "%choice%"=="4" goto verify
if "%choice%"=="5" goto help
if "%choice%"=="6" goto end

echo Invalid choice. Please try again.
echo.
goto menu

:dryrun
echo.
echo Running dry run...
echo.
tsx scripts/update-prisma-imports-advanced.ts --dry-run --verbose
echo.
pause
goto menu

:updatebackup
echo.
echo Updating imports with backups...
echo.
tsx scripts/update-prisma-imports-advanced.ts --backup --verbose
echo.
echo ✅ Update complete with backups!
echo.
pause
goto menu

:update
echo.
echo ⚠️  WARNING: This will modify files without creating backups.
set /p confirm="Are you sure you want to continue? (y/n): "
if /i not "%confirm%"=="y" goto menu

echo.
echo Updating imports...
echo.
tsx scripts/update-prisma-imports-advanced.ts --verbose
echo.
echo ✅ Update complete!
echo.
pause
goto menu

:verify
echo.
echo Verifying import status...
echo.
tsx scripts/verify-prisma-imports.ts
echo.
pause
goto menu

:help
echo.
tsx scripts/update-prisma-imports-advanced.ts --help
echo.
pause
goto menu

:end
echo.
echo Goodbye!
endlocal
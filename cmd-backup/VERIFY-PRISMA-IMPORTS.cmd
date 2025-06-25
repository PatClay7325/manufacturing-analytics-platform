@echo off
echo =====================================
echo Verifying Prisma Import Updates
echo =====================================
echo.

REM Check if tsx is available
where tsx >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing tsx globally...
    npm install -g tsx
)

echo Checking for old Prisma imports...
echo.

tsx scripts/verify-prisma-imports.ts

echo.
pause
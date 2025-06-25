@echo off
echo.
echo ==================================================
echo Clean Restart of Development Server
echo ==================================================
echo.

echo [1] Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul

echo.
echo [2] Cleaning Next.js cache...
if exist .next (
    rmdir /s /q .next
    echo    - Removed .next directory
)

echo.
echo [3] Clearing Node modules cache...
npm cache clean --force >nul 2>&1

echo.
echo [4] Starting development server...
echo.
echo ==================================================
echo Starting Next.js development server...
echo ==================================================
echo.
npm run dev

pause
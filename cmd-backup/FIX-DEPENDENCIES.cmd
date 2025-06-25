@echo off
echo ==========================================
echo Fixing Project Dependencies
echo ==========================================
echo.

echo [1/5] Cleaning node_modules and cache...
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules 2>nul
)

if exist .next (
    echo Removing .next build cache...
    rmdir /s /q .next 2>nul
)

echo.
echo [2/5] Clearing npm cache...
call npm cache clean --force

echo.
echo [3/5] Installing all dependencies fresh...
call npm install

echo.
echo [4/5] Checking for audit issues...
call npm audit

echo.
echo [5/5] Testing build...
call npm run build

echo.
echo ==========================================
if %errorlevel% equ 0 (
    echo ✅ Dependencies fixed successfully!
    echo.
    echo You can now run:
    echo   npm run dev    - Start development server
    echo   npm run test   - Run tests
) else (
    echo ❌ Some issues remain. Check the output above.
    echo.
    echo Try running:
    echo   npm audit fix --force
)
echo ==========================================
echo.
pause
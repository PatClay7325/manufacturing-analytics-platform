@echo off
echo ==========================================
echo Building and Starting Manufacturing Analytics Platform
echo ==========================================
echo.

echo [1/3] Running production build...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed! Checking for missing dependencies...
    echo.
    
    REM Check for common missing dependencies
    echo Installing any missing visualization dependencies...
    call npm install d3 leaflet d3-scale-chromatic @types/d3 @types/leaflet critters
    
    echo.
    echo Retrying build...
    call npm run build
)

if %errorlevel% equ 0 (
    echo.
    echo ✅ Build successful!
    echo.
    echo [2/3] Starting development server...
    call npm run dev
) else (
    echo.
    echo ❌ Build still failing. Please check the errors above.
    echo.
    echo Common fixes:
    echo 1. Run: npm install
    echo 2. Delete node_modules and run: npm install
    echo 3. Clear Next.js cache: rmdir /s /q .next
)

echo.
pause
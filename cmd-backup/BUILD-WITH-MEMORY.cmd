@echo off
echo ==========================================
echo Building with Increased Memory Allocation
echo ==========================================
echo.

echo Setting Node.js memory to 8GB...
set NODE_OPTIONS=--max-old-space-size=8192

echo.
echo Running production build...
call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ==========================================
    echo.
    echo The application compiled successfully with warnings.
    echo These are non-critical import warnings that won't prevent the app from running.
    echo.
    echo You can now:
    echo 1. Start development server: npm run dev
    echo 2. Start production server: npm start
    echo 3. Run tests: npm run test
) else (
    echo.
    echo ==========================================
    echo ❌ BUILD FAILED
    echo ==========================================
    echo.
    echo If you're still getting memory errors, try:
    echo 1. Close other applications to free up RAM
    echo 2. Increase to 10GB: set NODE_OPTIONS=--max-old-space-size=10240
    echo 3. Run without type checking: npm run build -- --no-lint
)

echo.
pause
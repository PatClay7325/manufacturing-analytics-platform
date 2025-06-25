@echo off
echo ========================================
echo  QUICK GRAFANA DEBUG TEST
echo  Simplified Error Detection
echo ========================================
echo.

echo [1/4] Installing test dependencies...
call npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom

echo [2/4] Running TypeScript check...
call npx tsc --noEmit --skipLibCheck

echo [3/4] Running simple component test...
call npx vitest run --reporter=basic tests/comprehensive/ 2>test-output.log
if errorlevel 1 (
    echo Tests failed - see test-output.log
) else (
    echo Tests passed successfully!
)

echo [4/4] Testing build...
call npm run build
if errorlevel 1 (
    echo Build failed
) else (
    echo Build successful!
)

echo.
echo Quick test complete!
pause
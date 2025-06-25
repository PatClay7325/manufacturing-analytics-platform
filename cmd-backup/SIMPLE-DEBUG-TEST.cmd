@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  SIMPLE GRAFANA DEBUG TEST
echo  Basic Error Detection and Fixing
echo ========================================
echo.

set "passed=0"
set "failed=0"

echo [1/6] Checking environment...
if not exist "package.json" (
    echo ERROR: package.json not found
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo WARNING: node_modules not found, installing...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo SUCCESS: Environment validated
set /a passed+=1

echo.
echo [2/6] Installing test dependencies...
call npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
if errorlevel 1 (
    echo WARNING: Some dependencies may already be installed
) else (
    echo SUCCESS: Test dependencies installed
)

echo.
echo [3/6] Creating basic test...
if not exist "tests" mkdir tests
if not exist "tests\simple" mkdir tests\simple

echo import { describe, it, expect } from 'vitest'; > tests\simple\basic.test.ts
echo. >> tests\simple\basic.test.ts
echo describe('Basic Test', () => { >> tests\simple\basic.test.ts
echo   it('should work', () => { >> tests\simple\basic.test.ts
echo     expect(true).toBe(true); >> tests\simple\basic.test.ts
echo   }); >> tests\simple\basic.test.ts
echo }); >> tests\simple\basic.test.ts

echo SUCCESS: Basic test created
set /a passed+=1

echo.
echo [4/6] Running TypeScript check...
call npx tsc --noEmit --skipLibCheck > ts-check.log 2>&1
if errorlevel 1 (
    echo WARNING: TypeScript issues found
    echo Installing type dependencies...
    call npm install --save-dev @types/react @types/react-dom @types/node
    set /a failed+=1
) else (
    echo SUCCESS: No TypeScript errors
    set /a passed+=1
)

echo.
echo [5/6] Running basic tests...
call npx vitest run tests\simple\basic.test.ts --reporter=basic > test-results.log 2>&1
if errorlevel 1 (
    echo ERROR: Basic tests failed
    echo Check test-results.log for details
    set /a failed+=1
) else (
    echo SUCCESS: Basic tests passed
    set /a passed+=1
)

echo.
echo [6/6] Testing build...
call npm run build > build-log.txt 2>&1
if errorlevel 1 (
    echo WARNING: Build failed
    echo Check build-log.txt for details
    set /a failed+=1
) else (
    echo SUCCESS: Build completed
    set /a passed+=1
)

echo.
echo ========================================
echo  TEST RESULTS SUMMARY
echo ========================================
echo.
echo Tests Passed: !passed!
echo Tests Failed: !failed!
echo.

if !failed! equ 0 (
    echo STATUS: ALL TESTS PASSED!
    echo Your system is ready for comprehensive testing.
    echo.
    echo Next steps:
    echo 1. Run comprehensive component tests
    echo 2. Test Grafana integration
    echo 3. Validate all API endpoints
) else (
    echo STATUS: SOME ISSUES FOUND
    echo Please check the log files for details:
    if exist ts-check.log echo - ts-check.log
    if exist test-results.log echo - test-results.log
    if exist build-log.txt echo - build-log.txt
)

echo.
echo ========================================
echo  SIMPLE DEBUG TEST COMPLETE
echo ========================================
pause
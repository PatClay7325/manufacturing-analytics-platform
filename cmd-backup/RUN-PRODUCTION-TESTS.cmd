@echo off
echo ===============================================
echo PRODUCTION-READY TEST SUITE
echo Complete End-to-End Testing with Real Data
echo ===============================================
echo.

:: Set production-like environment
set NODE_ENV=test
set NEXT_PUBLIC_APP_URL=http://localhost:3000
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
set NEXTAUTH_SECRET=test-secret-key-for-testing-only
set NEXTAUTH_URL=http://localhost:3000

echo [STEP 1] Environment Setup
echo ===============================================
echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Docker not found. Using local PostgreSQL.
) else (
    echo Starting PostgreSQL in Docker...
    docker run -d --name test-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
    timeout /t 5 /nobreak >nul
)

echo.
echo [STEP 2] Database Preparation
echo ===============================================
echo Creating test database...
call npx prisma db push --force-reset

echo Seeding with production-like data...
call npx tsx prisma/seed-comprehensive-manufacturing.ts

echo.
echo [STEP 3] Building Application
echo ===============================================
echo Building Next.js application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    exit /b 1
)

echo.
echo [STEP 4] Starting Test Server
echo ===============================================
start /B cmd /c "npm run start > server.log 2>&1"
echo Waiting for server startup...
timeout /t 15 /nobreak >nul

echo.
echo [STEP 5] Running Comprehensive Tests
echo ===============================================

:: Create results directory with timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/: " %%a in ('time /t') do (set mytime=%%a-%%b)
set RESULTS_DIR=test-results-%mydate%-%mytime%
mkdir %RESULTS_DIR%

echo.
echo Running test categories:
echo.

echo [1/10] Core Navigation Tests...
call npx playwright test ^
    tests/e2e/navigation.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/navigation-results.json

echo [2/10] Authentication & Authorization Tests...
call npx playwright test ^
    tests/e2e/authentication.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/auth-results.json

echo [3/10] Dashboard Functionality Tests...
call npx playwright test ^
    tests/e2e/dashboard.spec.ts ^
    tests/e2e/exhaustive-dashboard-interactions.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/dashboard-results.json

echo [4/10] Real-time Data & Charts Tests...
call npx playwright test ^
    --grep "chart|graph|visualization" ^
    --reporter=json ^
    --output=%RESULTS_DIR%/charts-results.json

echo [5/10] AI Chat & Assistant Tests...
call npx playwright test ^
    tests/e2e/ai-chat.spec.ts ^
    tests/e2e/manufacturing-chat.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/ai-results.json

echo [6/10] Alerts & Monitoring Tests...
call npx playwright test ^
    tests/e2e/alerts.spec.ts ^
    --grep "monitoring|notification" ^
    --reporter=json ^
    --output=%RESULTS_DIR%/alerts-results.json

echo [7/10] Equipment Management Tests...
call npx playwright test ^
    tests/e2e/equipment.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/equipment-results.json

echo [8/10] API Integration Tests...
call npx playwright test ^
    --grep "api|integration" ^
    --reporter=json ^
    --output=%RESULTS_DIR%/api-results.json

echo [9/10] Performance & Load Tests...
call npx playwright test ^
    tests/performance/load-testing.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/performance-results.json

echo [10/10] Accessibility Tests...
call npx playwright test ^
    tests/accessibility/wcag-compliance.spec.ts ^
    --reporter=json ^
    --output=%RESULTS_DIR%/accessibility-results.json

echo.
echo [STEP 6] Generating Comprehensive Report
echo ===============================================

:: Generate HTML report
call npx playwright show-report

echo.
echo [STEP 7] Test Summary
echo ===============================================
echo.
echo Test results saved to: %RESULTS_DIR%/
echo.
echo Run the following to view specific reports:
echo - Navigation: type %RESULTS_DIR%\navigation-results.json
echo - Authentication: type %RESULTS_DIR%\auth-results.json
echo - Dashboards: type %RESULTS_DIR%\dashboard-results.json
echo - AI Features: type %RESULTS_DIR%\ai-results.json
echo.

:: Cleanup
echo [STEP 8] Cleanup
echo ===============================================
taskkill /F /IM node.exe >nul 2>&1
docker stop test-postgres >nul 2>&1
docker rm test-postgres >nul 2>&1

echo.
echo ===============================================
echo TESTING COMPLETE
echo ===============================================
echo.
pause
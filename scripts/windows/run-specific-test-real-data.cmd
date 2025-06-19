@echo off
echo === Run Specific E2E Test with Real Data ===
echo.

echo [1] Checking PostgreSQL connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    echo Please run setup-docker-postgres-final.cmd first
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

echo.
echo [2] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo Available test files:
echo.
echo 1. alerts.spec.ts - Test alerts functionality
echo 2. equipment.spec.ts - Test equipment pages
echo 3. navigation.spec.ts - Test navigation
echo 4. manufacturing-chat.spec.ts - Test AI chat
echo 5. ai-chat.spec.ts - Test AI chat features
echo 6. dashboard.spec.ts - Test dashboard
echo 7. example.spec.ts - Basic example test
echo.

set /p choice="Enter test number (1-7) or filename: "

if "%choice%"=="1" set TEST_FILE=tests/e2e/alerts.spec.ts
if "%choice%"=="2" set TEST_FILE=tests/e2e/equipment.spec.ts
if "%choice%"=="3" set TEST_FILE=tests/e2e/navigation.spec.ts
if "%choice%"=="4" set TEST_FILE=tests/e2e/manufacturing-chat.spec.ts
if "%choice%"=="5" set TEST_FILE=tests/e2e/ai-chat.spec.ts
if "%choice%"=="6" set TEST_FILE=tests/e2e/dashboard.spec.ts
if "%choice%"=="7" set TEST_FILE=tests/e2e/example.spec.ts

if "%TEST_FILE%"=="" set TEST_FILE=%choice%

echo.
echo Running test: %TEST_FILE%
echo.

npx playwright test %TEST_FILE% --headed

echo.
echo === Test Complete ===
echo.
pause
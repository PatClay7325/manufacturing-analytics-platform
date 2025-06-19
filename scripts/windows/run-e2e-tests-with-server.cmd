@echo off
echo === Running E2E Tests with Dev Server ===
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

echo.
echo [3] Starting Next.js development server...
echo This will run in the background while tests execute
echo.
start /B npm run dev

echo Waiting for server to start (10 seconds)...
timeout /t 10 /nobreak

echo.
echo [4] Checking if server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Server might not be ready yet. Waiting 5 more seconds...
    timeout /t 5 /nobreak
)

echo.
echo [5] Running E2E tests with visible browsers...
npx playwright test --headed

echo.
echo [6] Stopping development server...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo === Tests Complete ===
echo.
echo To view detailed test report, run:
echo npx playwright show-report
echo.
pause
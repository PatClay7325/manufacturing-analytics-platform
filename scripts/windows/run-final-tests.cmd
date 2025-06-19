@echo off
echo === Final E2E Test Run ===
echo.
echo This will run ALL tests to verify the fixes
echo.

echo [1] Checking prerequisites...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Dev server is not running!
    echo Please run start-dev-server.cmd first
    pause
    exit /b 1
)
echo Dev server is running ✓

echo.
echo [2] AI Service Status...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo NOTE: Ollama AI service is not available
    echo Chat will use database queries only
) else (
    echo Ollama AI service is available ✓
)

echo.
echo [3] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [4] Running ALL E2E tests...
echo.

npx playwright test --reporter=line

echo.
echo === Final Results ===
echo.
echo Expected: ~88 passing tests (90 total - 2 skipped WSL tests)
echo.
echo To view detailed report:
echo   npx playwright show-report
echo.
pause
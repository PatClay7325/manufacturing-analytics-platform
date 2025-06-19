@echo off
echo =====================================================
echo    POC VERIFICATION CHECK
echo =====================================================
echo.

echo [1] Database Check:
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema='public';" 2>nul
if %errorlevel% equ 0 (
    echo    ✓ Production database accessible
) else (
    echo    ❌ Production database not accessible
)

docker exec manufacturing-postgres psql -U postgres -d manufacturing_test -c "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Test database exists
) else (
    echo    ⚠️  Test database not found (run FIX-EVERYTHING.cmd)
)
echo.

echo [2] Data Check:
for /f "skip=2 tokens=1" %%i in ('docker exec manufacturing-postgres psql -U postgres -d manufacturing -t -c "SELECT COUNT(*) FROM \"Alert\";" 2^>nul') do set alert_count=%%i
for /f "skip=2 tokens=1" %%i in ('docker exec manufacturing-postgres psql -U postgres -d manufacturing -t -c "SELECT COUNT(*) FROM \"WorkUnit\";" 2^>nul') do set equipment_count=%%i
echo    Alerts: %alert_count%
echo    Equipment: %equipment_count%
echo.

echo [3] Application Check:
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Dev server is running
    echo    ✓ Access the app at: http://localhost:3000
) else (
    echo    ⚠️  Dev server not running
    echo       Run: npm run dev
)
echo.

echo [4] API Check:
curl -s http://localhost:3000/api/alerts >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ API endpoints responding
) else (
    echo    ⚠️  API not responding
)
echo.

echo [5] Chat Service Check:
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Ollama AI service available
) else (
    echo    ⚠️  Ollama not running (chat will use DB mode)
)
echo.

echo [6] Test Status:
echo    Run tests with: TEST-EVERYTHING.cmd
echo    Fix issues with: FIX-EVERYTHING.cmd
echo.

echo =====================================================
echo    POC FEATURES AVAILABLE
echo =====================================================
echo.
echo 1. Dashboard with KPIs and metrics
echo 2. Equipment monitoring (7 work units)
echo 3. Alert management (3 active alerts)
echo 4. Manufacturing chat assistant
echo 5. Real-time data updates
echo 6. ISA-95 hierarchical structure
echo 7. Production metrics and OEE
echo.

echo To start using the POC:
echo 1. Ensure dev server is running: npm run dev
echo 2. Open browser to: http://localhost:3000
echo 3. Explore all features!
echo.
pause
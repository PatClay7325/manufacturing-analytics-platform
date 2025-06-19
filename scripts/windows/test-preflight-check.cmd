@echo off
echo === TEST ENVIRONMENT PRE-FLIGHT CHECK ===
echo.
echo This will verify all prerequisites before running tests
echo.

set /a ready=1

echo [1] Node.js Check:
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Node.js not installed
    set /a ready=0
) else (
    echo    ✓ Node.js installed: 
    node --version
)
echo.

echo [2] NPM Dependencies:
if not exist node_modules (
    echo    ❌ node_modules not found - run: npm install
    set /a ready=0
) else (
    echo    ✓ Dependencies installed
)
echo.

echo [3] PostgreSQL Database:
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ PostgreSQL not running
    echo       Fix: run setup-docker-postgres-final.cmd
    set /a ready=0
) else (
    echo    ✓ PostgreSQL running
    
    REM Check for data
    for /f %%i in ('docker exec manufacturing-postgres psql -U postgres -d manufacturing -t -c "SELECT COUNT(*) FROM \"Alert\";" 2^>nul') do set alert_count=%%i
    if "%alert_count%"=="0" (
        echo    ⚠️  No alerts in database - run: setup-real-data.cmd
    ) else (
        echo    ✓ Database has data
    )
)
echo.

echo [4] Development Server:
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo    ⚠️  Dev server not running (needed for E2E tests)
    echo       Fix: run start-dev-server.cmd in another terminal
) else (
    echo    ✓ Dev server running on http://localhost:3000
)
echo.

echo [5] Ollama AI Service:
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo    ⚠️  Ollama not running (chat will use database mode)
    echo       Fix: run setup-ollama-docker.cmd
) else (
    echo    ✓ Ollama running
    curl -s http://localhost:11434/api/tags | findstr "tinyllama" >nul 2>&1
    if %errorlevel% neq 0 (
        echo    ⚠️  tinyllama model not found
    ) else (
        echo    ✓ tinyllama model available
    )
)
echo.

echo [6] Test Files:
echo    Unit tests: 
for /f %%i in ('dir /s /b src\__tests__\*.test.ts* 2^>nul ^| find /c ".test."') do echo       %%i files found
echo    Integration tests:
for /f %%i in ('dir /s /b src\__tests__\integration\*.test.ts 2^>nul ^| find /c ".test."') do echo       %%i files found
echo    E2E tests:
for /f %%i in ('dir /s /b tests\e2e\*.spec.ts 2^>nul ^| find /c ".spec."') do echo       %%i files found
echo.

echo [7] Environment Variables:
if "%DATABASE_URL%"=="" (
    echo    ⚠️  DATABASE_URL not set
) else (
    echo    ✓ DATABASE_URL set
)
echo.

echo ========================================
if %ready%==0 (
    echo RESULT: ❌ NOT READY - Fix issues above
    echo.
    echo Required fixes:
    echo 1. Ensure Node.js is installed
    echo 2. Run: npm install
    echo 3. Run: setup-docker-postgres-final.cmd
    echo 4. Run: setup-real-data.cmd
) else (
    echo RESULT: ✅ READY FOR TESTING
    echo.
    echo Optional improvements:
    echo - Start dev server for E2E tests
    echo - Setup Ollama for AI chat tests
    echo.
    echo Run: TEST-EVERYTHING.cmd
)
echo ========================================
echo.
pause
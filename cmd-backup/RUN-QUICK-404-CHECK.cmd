@echo off
echo ==========================================
echo Quick 404 Error Check - Critical Pages Only
echo ==========================================
echo.

REM Check if dev server is running
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server not running. Starting it now...
    echo.
    start /b npm run dev
    echo Waiting 10 seconds for server to start...
    timeout /t 10 /nobreak >nul
)

echo Testing critical pages for 404 errors...
echo.

REM Test critical pages
set "pages=/ /manufacturingPlatform-demo /dashboard /dashboards /ai-chat /alerting /equipment /monitoring"

for %%p in (%pages%) do (
    echo Testing: http://localhost:3000%%p
    curl -s -o nul -w "Status: %%{http_code} - Response Time: %%{time_total}s\n" http://localhost:3000%%p
    echo.
)

echo.
echo ==========================================
echo Quick check completed!
echo Run RUN-COMPREHENSIVE-404-CHECK.cmd for full analysis
echo ==========================================
pause
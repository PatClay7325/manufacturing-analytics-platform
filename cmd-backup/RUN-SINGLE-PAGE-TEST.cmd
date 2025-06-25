@echo off
echo ==========================================
echo Single Page 404 Test - Debug Specific Pages
echo ==========================================
echo.

REM Check if dev server is running
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server not running. Please start with: npm run dev
    pause
    exit /b 1
)

echo ✅ Development server is running
echo.

REM Test specific critical pages with detailed output
echo Testing critical pages for 404 errors...
echo.

echo 🔍 Testing Home Page...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" http://localhost:3000/
echo.

echo 🔍 Testing manufacturingPlatform Demo...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" http://localhost:3000/manufacturingPlatform-demo
echo.

echo 🔍 Testing Dashboard...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" http://localhost:3000/dashboard
echo.

echo 🔍 Testing AI Chat...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" http://localhost:3000/ai-chat
echo.

echo 🔍 Testing Alerting...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" http://localhost:3000/alerting
echo.

echo 🔍 Testing Equipment...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" http://localhost:3000/equipment
echo.

echo 🔍 Testing Static Assets...
echo Checking for common static file 404s...
curl -s -w "CSS Status: %%{http_code}\n" http://localhost:3000/_next/static/css/app/layout.css 2>nul
curl -s -w "JS Status: %%{http_code}\n" http://localhost:3000/_next/static/chunks/main-app.js 2>nul

echo.
echo ==========================================
echo Single Page Test Summary:
echo - Status 200 = OK
echo - Status 404 = Page Not Found  
echo - Status 500 = Server Error
echo.
echo For detailed analysis, run: RUN-SIMPLE-404-CHECK.cmd
echo ==========================================
pause
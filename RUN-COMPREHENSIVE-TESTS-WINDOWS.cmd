@echo off
echo ========================================
echo    Manufacturing Platform Test Suite
echo    Windows Command Script
echo ========================================
echo.

REM Set environment variables
set NODE_ENV=test
set BASE_URL=http://localhost:3000

echo 🔍 Checking Node.js and npm installation...
node --version
npm --version
echo.

echo 📦 Installing dependencies if needed...
npm install
echo.

echo 🔧 Installing Playwright browsers...
npx playwright install
echo.

echo 📡 Starting development server...
echo Starting server in background...
start /b npm run dev
echo Waiting for server to start...
timeout /t 10 /nobreak > nul

echo.
echo 🧪 Running comprehensive tests...
echo.

REM Run the comprehensive Playwright test
npx playwright test tests/e2e/comprehensive-full-test.spec.ts --reporter=list --timeout=60000 --workers=1

echo.
echo 📊 Running page accessibility check...
node verify-integration.js

echo.
echo 🔍 Testing individual pages for issues...

REM Test each page individually
echo Testing Home page...
curl -s -o nul -w "Home Page: %%{http_code}\n" http://localhost:3000/

echo Testing Dashboard page...
curl -s -o nul -w "Dashboard: %%{http_code}\n" http://localhost:3000/dashboard

echo Testing Grafana Dashboard page...
curl -s -o nul -w "Grafana Dashboard: %%{http_code}\n" http://localhost:3000/grafana-dashboard

echo Testing Equipment page...
curl -s -o nul -w "Equipment: %%{http_code}\n" http://localhost:3000/equipment

echo Testing Alerts page...
curl -s -o nul -w "Alerts: %%{http_code}\n" http://localhost:3000/alerts

echo Testing Manufacturing Chat page...
curl -s -o nul -w "Manufacturing Chat: %%{http_code}\n" http://localhost:3000/manufacturing-chat

echo Testing Explore page...
curl -s -o nul -w "Explore: %%{http_code}\n" http://localhost:3000/explore

echo Testing Documentation page...
curl -s -o nul -w "Documentation: %%{http_code}\n" http://localhost:3000/documentation

echo.
echo 🔌 Testing API endpoints...
curl -s -o nul -w "Equipment API: %%{http_code}\n" http://localhost:3000/api/equipment
curl -s -o nul -w "Alerts API: %%{http_code}\n" http://localhost:3000/api/alerts
curl -s -o nul -w "Metrics API: %%{http_code}\n" http://localhost:3000/api/metrics/query

echo.
echo ✅ Test execution complete!
echo Check the output above for any failing pages or API endpoints.
echo.
pause
@echo off
echo ========================================
echo    Quick Page Check - Find Incomplete Pages
echo ========================================
echo.

echo 📡 Starting development server...
start /b npm run dev
echo Waiting for server to initialize...
timeout /t 15 /nobreak > nul

echo.
echo 🔍 Testing all pages for errors...
echo.

REM Function to test a page and show detailed results
echo Testing Home Page (/)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/ > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Home Page - FAILED or INCOMPLETE
) else (
    echo ✅ Home Page - OK
)

echo.
echo Testing Dashboard (/dashboard)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/dashboard > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Dashboard - FAILED or INCOMPLETE
) else (
    echo ✅ Dashboard - OK
)

echo.
echo Testing manufacturingPlatform Dashboard (/manufacturingPlatform-dashboard)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/manufacturingPlatform-dashboard > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ manufacturingPlatform Dashboard - FAILED or INCOMPLETE
) else (
    echo ✅ manufacturingPlatform Dashboard - OK
)

echo.
echo Testing Equipment (/equipment)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/equipment > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Equipment - FAILED or INCOMPLETE
) else (
    echo ✅ Equipment - OK
)

echo.
echo Testing Alerts (/alerts)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/alerts > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Alerts - FAILED or INCOMPLETE
) else (
    echo ✅ Alerts - OK
)

echo.
echo Testing Manufacturing Chat (/manufacturing-chat)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/manufacturing-chat > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Manufacturing Chat - FAILED or INCOMPLETE
) else (
    echo ✅ Manufacturing Chat - OK
)

echo.
echo Testing Explore (/explore)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/explore > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Explore - FAILED or INCOMPLETE
) else (
    echo ✅ Explore - OK
)

echo.
echo Testing Documentation (/documentation)...
curl -s -w "Status: %%{http_code} | Time: %%{time_total}s\n" http://localhost:3000/documentation > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Documentation - FAILED or INCOMPLETE
) else (
    echo ✅ Documentation - OK
)

echo.
echo 🔍 Testing Dashboard Variants...
echo.

echo Testing OEE Dashboard (/dashboards/oee)...
curl -s -w "Status: %%{http_code}\n" http://localhost:3000/dashboards/oee > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ OEE Dashboard - FAILED or INCOMPLETE
) else (
    echo ✅ OEE Dashboard - OK
)

echo Testing Production Dashboard (/dashboards/production)...
curl -s -w "Status: %%{http_code}\n" http://localhost:3000/dashboards/production > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Production Dashboard - FAILED or INCOMPLETE
) else (
    echo ✅ Production Dashboard - OK
)

echo Testing Quality Dashboard (/dashboards/quality)...
curl -s -w "Status: %%{http_code}\n" http://localhost:3000/dashboards/quality > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Quality Dashboard - FAILED or INCOMPLETE
) else (
    echo ✅ Quality Dashboard - OK
)

echo Testing Maintenance Dashboard (/dashboards/maintenance)...
curl -s -w "Status: %%{http_code}\n" http://localhost:3000/dashboards/maintenance > temp_response.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Maintenance Dashboard - FAILED or INCOMPLETE
) else (
    echo ✅ Maintenance Dashboard - OK
)

echo.
echo 🔌 Testing API Endpoints...
echo.

echo Testing Equipment API...
curl -s -w "Equipment API: %%{http_code}\n" http://localhost:3000/api/equipment > temp_response.txt

echo Testing Alerts API...
curl -s -w "Alerts API: %%{http_code}\n" http://localhost:3000/api/alerts > temp_response.txt

echo Testing Metrics Query API...
curl -s -w "Metrics API: %%{http_code}\n" http://localhost:3000/api/metrics/query > temp_response.txt

echo Testing Chat API...
curl -s -w "Chat API: %%{http_code}\n" http://localhost:3000/api/chat > temp_response.txt

echo.
echo 📝 Checking for missing components...
echo.

if not exist "src\components\layout\GrafanaLayout.tsx" (
    echo ❌ GrafanaLayout.tsx - MISSING
) else (
    echo ✅ GrafanaLayout.tsx - EXISTS
)

if not exist "src\components\dashboard\ManufacturingDashboard.tsx" (
    echo ❌ ManufacturingDashboard.tsx - MISSING
) else (
    echo ✅ ManufacturingDashboard.tsx - EXISTS
)

if not exist "src\components\manufacturingPlatform\DashboardPanel.tsx" (
    echo ❌ DashboardPanel.tsx - MISSING
) else (
    echo ✅ DashboardPanel.tsx - EXISTS
)

if not exist "src\config\dashboard.config.ts" (
    echo ❌ dashboard.config.ts - MISSING
) else (
    echo ✅ dashboard.config.ts - EXISTS
)

echo.
echo 🧪 Running quick build check...
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ BUILD FAILED - There are compilation errors
    echo Check the output above for specific errors
) else (
    echo ✅ BUILD SUCCESSFUL
)

echo.
echo 📊 SUMMARY REPORT
echo ==================
echo Run this script to identify which pages need attention.
echo Any pages marked with ❌ need to be fixed or completed.
echo Any pages marked with ✅ are working correctly.
echo.

REM Cleanup
if exist temp_response.txt del temp_response.txt

echo Press any key to close...
pause > nul
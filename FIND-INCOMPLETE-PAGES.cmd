@echo off
echo ========================================
echo    Find Incomplete Pages Tool
echo ========================================
echo.

echo 🔍 Scanning for incomplete or missing pages...
echo.

echo 📁 Checking if all required page files exist...
echo.

REM Check core pages
echo Checking core pages:
if exist "src\app\page.tsx" (
    echo ✅ Home page exists
) else (
    echo ❌ Home page MISSING: src\app\page.tsx
)

if exist "src\app\dashboard\page.tsx" (
    echo ✅ Dashboard page exists
) else (
    echo ❌ Dashboard page MISSING: src\app\dashboard\page.tsx
)

if exist "src\app\grafana-dashboard\page.tsx" (
    echo ✅ Grafana dashboard page exists
) else (
    echo ❌ Grafana dashboard page MISSING: src\app\grafana-dashboard\page.tsx
)

if exist "src\app\equipment\page.tsx" (
    echo ✅ Equipment page exists
) else (
    echo ❌ Equipment page MISSING: src\app\equipment\page.tsx
)

if exist "src\app\alerts\page.tsx" (
    echo ✅ Alerts page exists
) else (
    echo ❌ Alerts page MISSING: src\app\alerts\page.tsx
)

if exist "src\app\manufacturing-chat\page.tsx" (
    echo ✅ Manufacturing chat page exists
) else (
    echo ❌ Manufacturing chat page MISSING: src\app\manufacturing-chat\page.tsx
)

if exist "src\app\explore\page.tsx" (
    echo ✅ Explore page exists
) else (
    echo ❌ Explore page MISSING: src\app\explore\page.tsx
)

if exist "src\app\documentation\page.tsx" (
    echo ✅ Documentation page exists
) else (
    echo ❌ Documentation page MISSING: src\app\documentation\page.tsx
)

echo.
echo 📊 Checking dashboard variant pages:

if exist "src\app\dashboards\oee\page.tsx" (
    echo ✅ OEE dashboard exists
) else (
    echo ❌ OEE dashboard MISSING: src\app\dashboards\oee\page.tsx
)

if exist "src\app\dashboards\production\page.tsx" (
    echo ✅ Production dashboard exists
) else (
    echo ❌ Production dashboard MISSING: src\app\dashboards\production\page.tsx
)

if exist "src\app\dashboards\quality\page.tsx" (
    echo ✅ Quality dashboard exists
) else (
    echo ❌ Quality dashboard MISSING: src\app\dashboards\quality\page.tsx
)

if exist "src\app\dashboards\maintenance\page.tsx" (
    echo ✅ Maintenance dashboard exists
) else (
    echo ❌ Maintenance dashboard MISSING: src\app\dashboards\maintenance\page.tsx
)

echo.
echo 🧩 Checking Grafana integration components:

if exist "src\components\layout\GrafanaLayout.tsx" (
    echo ✅ GrafanaLayout component exists
) else (
    echo ❌ GrafanaLayout component MISSING: src\components\layout\GrafanaLayout.tsx
)

if exist "src\components\dashboard\ManufacturingDashboard.tsx" (
    echo ✅ ManufacturingDashboard component exists
) else (
    echo ❌ ManufacturingDashboard component MISSING: src\components\dashboard\ManufacturingDashboard.tsx
)

if exist "src\components\grafana\DashboardPanel.tsx" (
    echo ✅ DashboardPanel component exists
) else (
    echo ❌ DashboardPanel component MISSING: src\components\grafana\DashboardPanel.tsx
)

if exist "src\components\charts\GrafanaCharts.tsx" (
    echo ✅ GrafanaCharts component exists
) else (
    echo ❌ GrafanaCharts component MISSING: src\components\charts\GrafanaCharts.tsx
)

echo.
echo 🔌 Checking API routes:

if exist "src\app\api\equipment\route.ts" (
    echo ✅ Equipment API exists
) else (
    echo ❌ Equipment API MISSING: src\app\api\equipment\route.ts
)

if exist "src\app\api\alerts\route.ts" (
    echo ✅ Alerts API exists
) else (
    echo ❌ Alerts API MISSING: src\app\api\alerts\route.ts
)

if exist "src\app\api\metrics\query\route.ts" (
    echo ✅ Metrics query API exists
) else (
    echo ❌ Metrics query API MISSING: src\app\api\metrics\query\route.ts
)

if exist "src\app\api\chat\route.ts" (
    echo ✅ Chat API exists
) else (
    echo ❌ Chat API MISSING: src\app\api\chat\route.ts
)

echo.
echo ⚙️ Checking configuration files:

if exist "src\config\dashboard.config.ts" (
    echo ✅ Dashboard config exists
) else (
    echo ❌ Dashboard config MISSING: src\config\dashboard.config.ts
)

if exist "package.json" (
    echo ✅ Package.json exists
) else (
    echo ❌ Package.json MISSING
)

if exist "next.config.js" (
    echo ✅ Next.js config exists
) else (
    echo ❌ Next.js config MISSING
)

if exist "tailwind.config.js" (
    echo ✅ Tailwind config exists
) else (
    echo ❌ Tailwind config MISSING
)

echo.
echo 🔍 Checking for syntax errors in key files...
echo.

echo Checking TypeScript compilation...
npx tsc --noEmit --skipLibCheck
if %ERRORLEVEL% NEQ 0 (
    echo ❌ TypeScript compilation errors found!
    echo Run 'npx tsc --noEmit' to see detailed errors
) else (
    echo ✅ No TypeScript compilation errors
)

echo.
echo 📝 Checking package.json scripts...
findstr /C:"\"dev\"" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Dev script exists
) else (
    echo ❌ Dev script missing in package.json
)

findstr /C:"\"build\"" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build script exists
) else (
    echo ❌ Build script missing in package.json
)

echo.
echo 📊 SUMMARY OF INCOMPLETE PAGES/COMPONENTS
echo ==========================================
echo.
echo Any items marked with ❌ above need to be created or fixed.
echo Any items marked with ✅ are properly implemented.
echo.
echo To run the application:
echo 1. Run: npm install
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
echo To run tests:
echo 1. Run: RUN-COMPREHENSIVE-TESTS-WINDOWS.cmd
echo.
pause
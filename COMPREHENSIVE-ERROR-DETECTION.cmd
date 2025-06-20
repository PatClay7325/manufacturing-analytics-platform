@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Comprehensive Error Detection Tool
echo ========================================
echo.

REM Create error log file with timestamp
set "timestamp=%date:~6,4%-%date:~0,2%-%date:~3,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "timestamp=!timestamp: =0!"
set "logfile=error_report_!timestamp!.log"

echo Creating error log: %logfile%
echo ======================================== > %logfile%
echo    COMPREHENSIVE ERROR DETECTION REPORT >> %logfile%
echo    Generated: %date% %time% >> %logfile%
echo ======================================== >> %logfile%
echo. >> %logfile%

echo 🔍 PHASE 1: TypeScript Compilation Errors
echo ==========================================
echo.
echo Checking TypeScript compilation... >> %logfile%
echo. >> %logfile%

npx tsc --noEmit --skipLibCheck 2>&1 | tee typescript_errors.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ TypeScript compilation FAILED
    echo TYPESCRIPT COMPILATION ERRORS: >> %logfile%
    type typescript_errors.txt >> %logfile%
    echo. >> %logfile%
    set "has_ts_errors=1"
) else (
    echo ✅ TypeScript compilation PASSED
    echo ✅ No TypeScript compilation errors found >> %logfile%
    echo. >> %logfile%
    set "has_ts_errors=0"
)

echo.
echo 🔍 PHASE 2: Next.js Build Errors
echo =================================
echo.
echo Checking Next.js build... >> %logfile%
echo. >> %logfile%

npm run build 2>&1 | tee build_errors.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Next.js build FAILED
    echo NEXT.JS BUILD ERRORS: >> %logfile%
    type build_errors.txt >> %logfile%
    echo. >> %logfile%
    set "has_build_errors=1"
) else (
    echo ✅ Next.js build PASSED
    echo ✅ Next.js build completed successfully >> %logfile%
    echo. >> %logfile%
    set "has_build_errors=0"
)

echo.
echo 🔍 PHASE 3: Missing Dependencies Check
echo ======================================
echo.
echo Checking package dependencies... >> %logfile%
echo. >> %logfile%

npm ls --depth=0 2>&1 | tee dependency_check.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Missing dependencies found
    echo MISSING DEPENDENCIES: >> %logfile%
    type dependency_check.txt >> %logfile%
    echo. >> %logfile%
    set "has_dep_errors=1"
) else (
    echo ✅ All dependencies installed
    echo ✅ All required dependencies are installed >> %logfile%
    echo. >> %logfile%
    set "has_dep_errors=0"
)

echo.
echo 🔍 PHASE 4: Component Import/Export Errors
echo ===========================================
echo.
echo COMPONENT IMPORT/EXPORT ANALYSIS: >> %logfile%
echo. >> %logfile%

REM Check for common import/export issues
echo Checking component files for import errors...
for /r "src\components" %%f in (*.tsx *.ts) do (
    findstr /n "import.*from.*'@/" "%%f" > nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo Checking imports in %%f...
        findstr /n "import.*from.*'@/" "%%f" | findstr /v "types\|components\|lib\|config\|utils" >> import_issues.txt 2>&1
    )
)

if exist import_issues.txt (
    echo ❌ Potential import issues found
    echo IMPORT ISSUES FOUND: >> %logfile%
    type import_issues.txt >> %logfile%
    echo. >> %logfile%
) else (
    echo ✅ No obvious import issues
    echo ✅ No obvious import issues detected >> %logfile%
    echo. >> %logfile%
)

echo.
echo 🔍 PHASE 5: API Route Testing
echo ==============================
echo.

echo Starting development server for API testing...
start /b npm run dev
echo Waiting 15 seconds for server startup...
timeout /t 15 /nobreak > nul

echo API ROUTE TESTING: >> %logfile%
echo. >> %logfile%

set "server_started=0"
curl -s http://localhost:3000 > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "server_started=1"
    echo ✅ Development server started
    echo ✅ Development server started successfully >> %logfile%
) else (
    echo ❌ Development server failed to start
    echo ❌ Development server failed to start >> %logfile%
    echo. >> %logfile%
)

if !server_started! EQU 1 (
    echo Testing API routes...
    
    echo Testing /api/equipment...
    curl -s -w "%%{http_code}" http://localhost:3000/api/equipment > api_equipment.txt 2>&1
    set /p equipment_status=<api_equipment.txt
    if "!equipment_status!"=="200" (
        echo ✅ Equipment API working
        echo ✅ Equipment API: HTTP 200 >> %logfile%
    ) else (
        echo ❌ Equipment API failed: HTTP !equipment_status!
        echo ❌ Equipment API failed: HTTP !equipment_status! >> %logfile%
    )
    
    echo Testing /api/alerts...
    curl -s -w "%%{http_code}" http://localhost:3000/api/alerts > api_alerts.txt 2>&1
    set /p alerts_status=<api_alerts.txt
    if "!alerts_status!"=="200" (
        echo ✅ Alerts API working
        echo ✅ Alerts API: HTTP 200 >> %logfile%
    ) else (
        echo ❌ Alerts API failed: HTTP !alerts_status!
        echo ❌ Alerts API failed: HTTP !alerts_status! >> %logfile%
    )
    
    echo Testing /api/metrics/query...
    curl -s -w "%%{http_code}" http://localhost:3000/api/metrics/query > api_metrics.txt 2>&1
    set /p metrics_status=<api_metrics.txt
    if "!metrics_status!"=="200" (
        echo ✅ Metrics API working
        echo ✅ Metrics API: HTTP 200 >> %logfile%
    ) else (
        echo ❌ Metrics API failed: HTTP !metrics_status!
        echo ❌ Metrics API failed: HTTP !metrics_status! >> %logfile%
    )
    
    echo Testing /api/chat...
    curl -s -w "%%{http_code}" http://localhost:3000/api/chat > api_chat.txt 2>&1
    set /p chat_status=<api_chat.txt
    if "!chat_status!"=="200" (
        echo ✅ Chat API working
        echo ✅ Chat API: HTTP 200 >> %logfile%
    ) else (
        echo ❌ Chat API failed: HTTP !chat_status!
        echo ❌ Chat API failed: HTTP !chat_status! >> %logfile%
    )
)

echo. >> %logfile%

echo.
echo 🔍 PHASE 6: Page Loading Tests
echo ===============================
echo.

if !server_started! EQU 1 (
    echo PAGE LOADING TESTS: >> %logfile%
    echo. >> %logfile%
    
    echo Testing core pages...
    
    for %%p in ("/" "/dashboard" "/grafana-dashboard" "/equipment" "/alerts" "/manufacturing-chat" "/explore" "/documentation") do (
        echo Testing %%p...
        curl -s -w "%%{http_code}" http://localhost:3000%%p > page_test.txt 2>&1
        set /p page_status=<page_test.txt
        if "!page_status!"=="200" (
            echo ✅ Page %%p working
            echo ✅ Page %%p: HTTP 200 >> %logfile%
        ) else (
            echo ❌ Page %%p failed: HTTP !page_status!
            echo ❌ Page %%p failed: HTTP !page_status! >> %logfile%
        )
    )
    
    echo Testing dashboard variants...
    for %%d in ("/dashboards/oee" "/dashboards/production" "/dashboards/quality" "/dashboards/maintenance") do (
        echo Testing %%d...
        curl -s -w "%%{http_code}" http://localhost:3000%%d > dashboard_test.txt 2>&1
        set /p dashboard_status=<dashboard_test.txt
        if "!dashboard_status!"=="200" (
            echo ✅ Dashboard %%d working
            echo ✅ Dashboard %%d: HTTP 200 >> %logfile%
        ) else (
            echo ❌ Dashboard %%d failed: HTTP !dashboard_status!
            echo ❌ Dashboard %%d failed: HTTP !dashboard_status! >> %logfile%
        )
    )
)

echo. >> %logfile%

echo.
echo 🔍 PHASE 7: Console Error Detection
echo ====================================
echo.

echo Starting console error detection...
echo CONSOLE ERROR DETECTION: >> %logfile%
echo Note: Manual browser testing required for JavaScript console errors >> %logfile%
echo. >> %logfile%

echo.
echo 📊 GENERATING COMPREHENSIVE ERROR REPORT
echo =========================================
echo.

echo. >> %logfile%
echo ======================================== >> %logfile%
echo    ERROR SUMMARY >> %logfile%
echo ======================================== >> %logfile%
echo. >> %logfile%

set "total_errors=0"

if !has_ts_errors! EQU 1 (
    echo ❌ TypeScript compilation errors found >> %logfile%
    set /a total_errors+=1
) else (
    echo ✅ TypeScript compilation passed >> %logfile%
)

if !has_build_errors! EQU 1 (
    echo ❌ Next.js build errors found >> %logfile%
    set /a total_errors+=1
) else (
    echo ✅ Next.js build passed >> %logfile%
)

if !has_dep_errors! EQU 1 (
    echo ❌ Missing dependencies found >> %logfile%
    set /a total_errors+=1
) else (
    echo ✅ All dependencies installed >> %logfile%
)

echo. >> %logfile%
echo TOTAL ERROR CATEGORIES: !total_errors! >> %logfile%
echo. >> %logfile%

if !total_errors! EQU 0 (
    echo ✅ NO CRITICAL ERRORS FOUND >> %logfile%
    echo ✅ Application appears to be in good state >> %logfile%
    echo.
    echo 🎉 SUCCESS: No critical errors detected!
    echo The application should be working properly.
) else (
    echo ❌ !total_errors! ERROR CATEGORIES FOUND >> %logfile%
    echo ❌ Review the detailed errors above >> %logfile%
    echo.
    echo ⚠️  ERRORS DETECTED: !total_errors! categories of errors found
    echo Please review the detailed error log: %logfile%
)

echo. >> %logfile%
echo NEXT STEPS: >> %logfile%
echo 1. Review all errors marked with ❌ above >> %logfile%
echo 2. Fix TypeScript compilation errors first >> %logfile%
echo 3. Address build errors >> %logfile%
echo 4. Install missing dependencies >> %logfile%
echo 5. Test pages manually in browser >> %logfile%
echo 6. Run this script again to verify fixes >> %logfile%
echo. >> %logfile%

echo.
echo 📋 ERROR LOG SAVED: %logfile%
echo.
echo 🔧 NEXT STEPS:
echo 1. Review the error log file: %logfile%
echo 2. Fix any TypeScript errors first
echo 3. Address build errors
echo 4. Install missing dependencies if any
echo 5. Test manually in browser
echo.

REM Cleanup temporary files
if exist typescript_errors.txt del typescript_errors.txt
if exist build_errors.txt del build_errors.txt
if exist dependency_check.txt del dependency_check.txt
if exist import_issues.txt del import_issues.txt
if exist api_*.txt del api_*.txt
if exist page_test.txt del page_test.txt
if exist dashboard_test.txt del dashboard_test.txt

echo Press any key to open the error log...
pause > nul
notepad %logfile%
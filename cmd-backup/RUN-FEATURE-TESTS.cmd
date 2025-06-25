@echo off
echo ===============================================
echo FEATURE-SPECIFIC PLAYWRIGHT TESTS
echo Manufacturing Analytics Platform
echo ===============================================
echo.

set NODE_ENV=test
set NEXT_PUBLIC_APP_URL=http://localhost:3000

echo Select which features to test:
echo ===============================================
echo [1] All Features (Complete Test Suite)
echo [2] Authentication & User Management
echo [3] Dashboards & Analytics
echo [4] AI Chat & Manufacturing Assistant
echo [5] Alerts & Monitoring
echo [6] Equipment Management
echo [7] Data Visualization & Charts
echo [8] API Endpoints
echo [9] Mobile Responsiveness
echo [0] Custom Test Pattern
echo.

set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto :all_features
if "%choice%"=="2" goto :auth_tests
if "%choice%"=="3" goto :dashboard_tests
if "%choice%"=="4" goto :ai_chat_tests
if "%choice%"=="5" goto :alerts_tests
if "%choice%"=="6" goto :equipment_tests
if "%choice%"=="7" goto :visualization_tests
if "%choice%"=="8" goto :api_tests
if "%choice%"=="9" goto :mobile_tests
if "%choice%"=="0" goto :custom_tests

echo Invalid choice. Exiting...
exit /b 1

:all_features
echo.
echo Running ALL feature tests...
call npx playwright test --headed --reporter=html,list
goto :end

:auth_tests
echo.
echo Running Authentication tests...
call npx playwright test --headed auth --reporter=list
call npx playwright test --headed login --reporter=list
call npx playwright test --headed register --reporter=list
call npx playwright test --headed profile --reporter=list
goto :end

:dashboard_tests
echo.
echo Running Dashboard tests...
call npx playwright test --headed dashboard --reporter=list
call npx playwright test --headed analytics --reporter=list
call npx playwright test --headed variable --reporter=list
goto :end

:ai_chat_tests
echo.
echo Running AI Chat tests...
call npx playwright test --headed chat --reporter=list
call npx playwright test --headed manufacturing-chat --reporter=list
call npx playwright test --headed assistant --reporter=list
goto :end

:alerts_tests
echo.
echo Running Alerts & Monitoring tests...
call npx playwright test --headed alert --reporter=list
call npx playwright test --headed monitoring --reporter=list
call npx playwright test --headed notification --reporter=list
goto :end

:equipment_tests
echo.
echo Running Equipment Management tests...
call npx playwright test --headed equipment --reporter=list
call npx playwright test --headed maintenance --reporter=list
call npx playwright test --headed production --reporter=list
goto :end

:visualization_tests
echo.
echo Running Data Visualization tests...
call npx playwright test --headed chart --reporter=list
call npx playwright test --headed graph --reporter=list
call npx playwright test --headed visualization --reporter=list
goto :end

:api_tests
echo.
echo Running API tests...
call npx playwright test --headed api --reporter=list
call npx playwright test --headed integration --reporter=list
goto :end

:mobile_tests
echo.
echo Running Mobile Responsiveness tests...
call npx playwright test --headed --project="Mobile Chrome" --reporter=list
call npx playwright test --headed --project="Mobile Safari" --reporter=list
goto :end

:custom_tests
echo.
set /p pattern="Enter test file pattern (e.g., *dashboard* or specific filename): "
echo Running tests matching pattern: %pattern%
call npx playwright test --headed %pattern% --reporter=list
goto :end

:end
echo.
echo ===============================================
echo Test execution completed!
echo ===============================================
echo.
echo View detailed report: npx playwright show-report
echo.
pause
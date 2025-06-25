@echo off
echo ================================================================================
echo FOCUSED INTERACTION TEST SUITE - SPECIFIC COMPONENTS
echo ================================================================================
echo.
echo Select the type of interaction test to run:
echo.
echo [1] All Dashboard Interactions (Panels, Grids, Time Pickers)
echo [2] Form and Input Interactions (All input types, validation)
echo [3] Chart and Visualization Interactions (Tooltips, zoom, pan)
echo [4] Navigation and Routing (All links, breadcrumbs, tabs)
echo [5] Modal and Dialog Interactions (All popups, overlays)
echo [6] Table Interactions (Sort, filter, pagination)
echo [7] Accessibility Tests (Keyboard nav, screen readers)
echo [8] Mobile Interactions (Touch, swipe, responsive)
echo [9] Performance Tests (Load times, animations)
echo [0] Run ALL Tests (Warning: This will take 30-60 minutes)
echo.
set /p choice="Enter your choice (0-9): "

:: Set common environment variables
set NODE_ENV=test
set PLAYWRIGHT_BROWSERS_PATH=ms-playwright

:: Create test file based on choice
if "%choice%"=="1" goto dashboard_tests
if "%choice%"=="2" goto form_tests
if "%choice%"=="3" goto chart_tests
if "%choice%"=="4" goto navigation_tests
if "%choice%"=="5" goto modal_tests
if "%choice%"=="6" goto table_tests
if "%choice%"=="7" goto accessibility_tests
if "%choice%"=="8" goto mobile_tests
if "%choice%"=="9" goto performance_tests
if "%choice%"=="0" goto all_tests
goto invalid_choice

:dashboard_tests
echo.
echo Running Dashboard Interaction Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "dashboard|grid|panel" --reporter=list --headed
goto end

:form_tests
echo.
echo Running Form Interaction Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "input|form|select|dropdown" --reporter=list --headed
goto end

:chart_tests
echo.
echo Running Chart Interaction Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "chart|visualization|tooltip" --reporter=list --headed
goto end

:navigation_tests
echo.
echo Running Navigation Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "navigate|routing|link" --reporter=list --headed
goto end

:modal_tests
echo.
echo Running Modal Interaction Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "modal|dialog|popup" --reporter=list --headed
goto end

:table_tests
echo.
echo Running Table Interaction Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "table|sort|filter|pagination" --reporter=list --headed
goto end

:accessibility_tests
echo.
echo Running Accessibility Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "keyboard|accessibility|aria" --reporter=list --headed
goto end

:mobile_tests
echo.
echo Running Mobile Interaction Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "responsive|mobile|touch" --reporter=list --headed
goto end

:performance_tests
echo.
echo Running Performance Tests...
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --grep "loading|performance|error" --reporter=list --headed
goto end

:all_tests
echo.
echo Running ALL Tests (This will take a while)...
echo.

:: Run tests in parallel with multiple workers
call npx playwright test tests/e2e/exhaustive-dashboard-interactions.spec.ts --reporter=html --workers=4

:: Also run existing comprehensive tests
call npx playwright test tests/e2e/*.spec.ts tests/e2e/pages/*.spec.ts tests/e2e/components/*.spec.ts --reporter=html --workers=4

goto end

:invalid_choice
echo.
echo Invalid choice! Please run the script again and select 0-9.
goto end

:end
echo.
echo ================================================================================
echo TEST EXECUTION COMPLETE
echo ================================================================================
echo.
echo View detailed results:
echo - HTML Report: npx playwright show-report
echo - Screenshots: test-results\screenshots\
echo - Videos: test-results\videos\ (if enabled)
echo.
pause
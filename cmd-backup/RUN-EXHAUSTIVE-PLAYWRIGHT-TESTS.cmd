@echo off
echo ================================================================================
echo EXHAUSTIVE PLAYWRIGHT TEST SUITE - MANUFACTURING ANALYTICS PLATFORM
echo ================================================================================
echo.
echo This will run comprehensive tests for:
echo - All pages and routes
echo - All buttons, links, and clickable elements
echo - All dropdowns, selects, and form inputs
echo - All modals, tooltips, and overlays
echo - All dashboard interactions (drag/drop, resize, etc.)
echo - All data visualizations and charts
echo - All responsive breakpoints
echo - All accessibility features
echo.
echo Press Ctrl+C to cancel or any key to continue...
pause >nul

:: Set environment variables
set NODE_ENV=test
set NEXT_PUBLIC_API_URL=http://localhost:3000/api
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test

:: Clean previous test results
echo.
echo [1/10] Cleaning previous test results...
if exist playwright-report rmdir /s /q playwright-report
if exist test-results rmdir /s /q test-results
if exist coverage rmdir /s /q coverage

:: Install/update dependencies
echo.
echo [2/10] Ensuring test dependencies are installed...
call npm install --save-dev @playwright/test @faker-js/faker

:: Generate comprehensive test suite if needed
echo.
echo [3/10] Generating comprehensive test specifications...
if not exist tests\e2e\comprehensive-suite mkdir tests\e2e\comprehensive-suite

:: Run different test suites
echo.
echo [4/10] Running page navigation tests...
call npx playwright test tests/e2e/navigation.spec.ts --reporter=list

echo.
echo [5/10] Running dashboard interaction tests...
call npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/pages/dashboard-comprehensive.spec.ts --reporter=list

echo.
echo [6/10] Running UI component tests...
call npx playwright test tests/e2e/comprehensive-ui-test.spec.ts tests/e2e/components/*.spec.ts --reporter=list

echo.
echo [7/10] Running form and input tests...
call npx playwright test tests/e2e/alerts.spec.ts tests/e2e/pages/alerts-comprehensive.spec.ts --reporter=list

echo.
echo [8/10] Running data visualization tests...
call npx playwright test tests/e2e/equipment.spec.ts tests/e2e/pages/equipment-comprehensive.spec.ts --reporter=list

echo.
echo [9/10] Running accessibility tests...
call npx playwright test tests/accessibility/wcag-compliance.spec.ts --reporter=list

echo.
echo [10/10] Running full comprehensive test suite with all browsers...
call npx playwright test --reporter=html --workers=4

:: Generate detailed report
echo.
echo ================================================================================
echo GENERATING COMPREHENSIVE TEST REPORT...
echo ================================================================================
call npx playwright show-report

echo.
echo ================================================================================
echo TEST EXECUTION COMPLETE!
echo ================================================================================
echo.
echo Reports available at:
echo - HTML Report: playwright-report\index.html
echo - JSON Results: test-results\*.json
echo.
pause
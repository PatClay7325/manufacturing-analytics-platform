@echo off
echo ===============================================
echo    TEST SPECIFIC PAGE - WINDOWS
echo    Run tests for a specific page only
echo ===============================================
echo.

echo Available test groups:
echo 1. Homepage
echo 2. Dashboard
echo 3. Equipment Page
echo 4. Alerts Page
echo 5. Manufacturing Chat
echo 6. Navigation
echo 7. Footer
echo.

set /p choice="Enter the number of the page to test (1-7): "

if "%choice%"=="1" set testname=Homepage
if "%choice%"=="2" set testname=Dashboard
if "%choice%"=="3" set testname=Equipment Page
if "%choice%"=="4" set testname=Alerts Page
if "%choice%"=="5" set testname=Manufacturing Chat
if "%choice%"=="6" set testname=Navigation
if "%choice%"=="7" set testname=Footer

echo.
echo Testing %testname%...
echo.

npx playwright test tests/e2e/comprehensive-ui-test.spec.ts -g "%testname%" --reporter=list

echo.
echo Test completed!
pause
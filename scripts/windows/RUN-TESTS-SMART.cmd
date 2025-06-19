@echo off
echo ===============================================
echo    SMART TEST RUNNER
echo    Checks if server is running before starting
echo ===============================================
echo.

echo Checking if development server is already running...
curl -s -o nul -w "Server Status: %%{http_code}\n" http://localhost:3000
echo.

echo Running tests with smart configuration...
npx playwright test --config=playwright.config.smart.ts %*

echo.
echo ===============================================
echo    TEST RESULTS
echo ===============================================
echo.
echo To view the HTML report, run:
echo   npx playwright show-report
echo.
pause
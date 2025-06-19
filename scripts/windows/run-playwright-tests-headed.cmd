@echo off
echo === Running Playwright Tests with Browser UI ===
echo.

REM Run tests in headed mode so you can see what's happening
echo Running tests with visible browser...
npx playwright test --headed --reporter=list

echo.
echo Tests completed!
echo.
echo To view the HTML report:
echo npx playwright show-report
echo.
pause
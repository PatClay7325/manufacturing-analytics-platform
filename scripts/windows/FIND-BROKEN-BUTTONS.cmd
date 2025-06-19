@echo off
echo ===============================================
echo    FIND ALL BROKEN BUTTONS AND LINKS
echo ===============================================
echo.
echo This will scan all pages and identify:
echo - Disabled buttons
echo - Buttons that don't work when clicked
echo - Links with no destination (#)
echo - Forms that can't be filled
echo.

echo Running broken button finder...
npx playwright test tests/e2e/find-broken-buttons.spec.ts --reporter=list

echo.
echo ===============================================
echo    DETAILED RESULTS
echo ===============================================
echo.
echo Check the console output above for:
echo - List of all buttons and their status
echo - List of all links and their destinations
echo - Any broken elements found
echo.
echo To debug a specific broken button:
echo 1. Run: DEBUG-BROKEN-BUTTONS.cmd
echo 2. The browser will open and pause at each step
echo 3. You can see exactly what happens when clicking
echo.
pause
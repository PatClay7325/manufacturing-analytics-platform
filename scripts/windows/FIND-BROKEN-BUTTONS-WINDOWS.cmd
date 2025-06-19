@echo off
echo ===============================================
echo    FIND ALL BROKEN BUTTONS - WINDOWS
echo    This will scan all pages for broken buttons
echo ===============================================
echo.

echo [1] Make sure your development server is running
echo     If not, open another terminal and run: npm run dev
echo.
pause

echo.
echo [2] Running button finder test...
echo.

REM Run the button finder test
npx playwright test tests/e2e/find-broken-buttons.spec.ts --reporter=list

echo.
echo ===============================================
echo    CHECK THE OUTPUT ABOVE
echo ===============================================
echo.
echo The test output will show:
echo - All buttons found on each page
echo - Which buttons are working vs broken
echo - Total count of broken elements
echo.

pause
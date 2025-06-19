@echo off
echo ===============================================
echo    DEBUG BROKEN BUTTONS AND INTERACTIONS
echo ===============================================
echo.

echo This script will help identify which buttons and interactions are broken.
echo.

echo [1] Running headed mode to see what's happening...
npx playwright test tests/e2e/comprehensive-ui-test.spec.ts --headed --reporter=list --workers=1

echo.
echo ===============================================
echo    RUN IN DEBUG MODE
echo ===============================================
echo.
echo [2] Run with Playwright Inspector for step-by-step debugging:
echo.

npx playwright test tests/e2e/comprehensive-ui-test.spec.ts --debug

echo.
echo ===============================================
echo    TIPS FOR FIXING BROKEN BUTTONS
echo ===============================================
echo.
echo 1. Check console for errors: F12 in browser
echo 2. Common issues:
echo    - Missing onClick handlers
echo    - Incorrect href attributes
echo    - API endpoints not implemented
echo    - State management issues
echo.
echo 3. To test a specific page:
echo    npx playwright test -g "Equipment Page" --debug
echo.
pause
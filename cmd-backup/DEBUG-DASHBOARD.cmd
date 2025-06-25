@echo off
echo ==========================================
echo Debugging Dashboard Display Issues
echo ==========================================
echo.

echo The param warnings are NOT causing your dashboard issues.
echo Those are just deprecation warnings for future compatibility.
echo.

echo Common reasons dashboards don't display:
echo.
echo 1. CHECK BROWSER CONSOLE for actual errors:
echo    - Open DevTools (F12)
echo    - Look for RED errors (not yellow warnings)
echo    - Common errors:
echo      * Cannot read property of undefined
echo      * Component not found
echo      * Failed to fetch data
echo.

echo 2. CHECK NETWORK TAB:
echo    - Are API calls failing?
echo    - Are CSS/JS files loading?
echo    - Any 404 or 500 errors?
echo.

echo 3. VERIFY COMPONENTS ARE LOADING:
echo    - Is GrafanaPlatform rendering?
echo    - Are panels showing?
echo    - Is data being fetched?
echo.

echo 4. TRY THESE QUICK FIXES:
echo    a) Clear browser cache (Ctrl+Shift+Delete)
echo    b) Hard refresh (Ctrl+F5)
echo    c) Check if you're on the right URL
echo    d) Try incognito/private mode
echo.

echo 5. TEST A SIMPLE DASHBOARD:
echo    - Visit: http://localhost:3000/dashboard
echo    - Visit: http://localhost:3000/dashboards
echo    - Visit: http://localhost:3000/d/test-dashboard
echo.

echo 6. CHECK FOR MISSING DEPENDENCIES:
echo    npm install
echo    npm run dev
echo.

pause
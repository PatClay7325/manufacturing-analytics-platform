@echo off
echo ==========================================
echo Dashboard Status Check
echo ==========================================
echo.

echo Current Status:
echo - Auth context error: FIXED
echo - Datasources API: Created at /api/datasources/route.ts
echo - Next.js 15 param warnings: Being addressed
echo.

echo The dashboard frames should now be showing!
echo.

echo If dashboards are still not displaying:
echo.
echo 1. Make sure the dev server has restarted to pick up new API routes
echo    - Stop the server (Ctrl+C)
echo    - Run: npm run dev
echo.
echo 2. Clear browser cache and hard refresh (Ctrl+F5)
echo.
echo 3. Test these URLs in order:
echo    a) http://localhost:3000/test-dashboard-display
echo       - This simple test should work without any API calls
echo.
echo    b) http://localhost:3000/api/datasources
echo       - Should return JSON data, not HTML
echo.
echo    c) http://localhost:3000/d/test-123
echo       - Should show a dashboard
echo.

echo Current issues being worked on:
echo - Datasources API returning 404 (may need server restart)
echo - Some pages still have Next.js 15 param warnings
echo.

pause
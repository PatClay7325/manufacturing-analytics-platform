@echo off
echo ==================================================
echo Checking Database Connection Error
echo ==================================================
echo.

echo Testing database connection via API...
curl -X GET http://localhost:3000/api/diagnostics/db-test-detailed

echo.
echo.
echo If you see HTML instead of JSON, make sure your Next.js dev server is running:
echo   npm run dev
echo.
pause
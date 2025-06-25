@echo off
echo Testing Database API...
echo.
curl -s http://localhost:3000/api/diagnostics/db-test-detailed | python -m json.tool
echo.
pause
@echo off
echo ===============================================
echo Complete Superset Setup with Sample Dashboard
echo ===============================================
echo.

echo Step 1: Creating correct database views...
call create-dashboard-views-correct.cmd

echo.
echo Step 2: Auto-creating a sample dashboard...
call auto-create-dashboard.cmd

echo.
echo ===============================================
echo Setup Complete!
echo ===============================================
echo.
echo Your manufacturing dashboard is ready to use.
echo.
echo 1. Note the dashboard ID from above (usually 1)
echo 2. Open http://localhost:3000/analytics/demo (in incognito mode)
echo 3. Enter the dashboard ID
echo 4. View your embedded dashboard!
echo.
echo Or view directly in Superset:
echo http://localhost:8088/superset/dashboard/1/
echo.
pause
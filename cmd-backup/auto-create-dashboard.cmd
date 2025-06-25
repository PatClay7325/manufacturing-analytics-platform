@echo off
echo ===============================================
echo Auto-Creating Manufacturing Dashboard
echo ===============================================
echo.

echo Step 1: Copying script to Superset container...
docker cp create-default-dashboard.py manufacturing-superset:/app/

echo.
echo Step 2: Creating dashboard...
docker exec manufacturing-superset python /app/create-default-dashboard.py

echo.
echo ===============================================
echo Dashboard created!
echo ===============================================
echo.
echo Now you can:
echo 1. Go to http://localhost:3000/analytics/demo
echo 2. Enter the dashboard ID shown above
echo 3. View your embedded dashboard
echo.
echo Or directly view in Superset:
echo http://localhost:8088 (admin/admin)
echo.
pause
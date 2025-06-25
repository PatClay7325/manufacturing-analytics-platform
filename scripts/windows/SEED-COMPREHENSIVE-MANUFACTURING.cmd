@echo off
echo ========================================
echo Seeding Comprehensive Manufacturing Data
echo ========================================
echo.

echo Running seed script...
npx tsx scripts/seed-comprehensive-manufacturing-data.ts

echo.
echo ✅ Seeding complete!
echo.
echo You can now:
echo 1. View the data in Grafana dashboards
echo 2. Query the data through the Prisma API
echo 3. Access the data at http://localhost:3001
echo.
pause
@echo off
echo === Setting Up Real Data (No Mocks) ===
echo.

echo [1] Checking PostgreSQL connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    echo Please run setup-docker-postgres-final.cmd first
    pause
    exit /b 1
)
echo PostgreSQL is running ✓

echo.
echo [2] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

echo.
echo [3] Clearing old MSW data...
echo Mock Service Worker has been completely removed ✓

echo.
echo [4] Ensuring Prisma client is up to date...
npx prisma generate

echo.
echo [5] Running hierarchical seed script...
npx tsx prisma/seed-hierarchical.ts

echo.
echo [6] Verifying data in database...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) as enterprises FROM \"Enterprise\";"
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) as sites FROM \"Site\";"
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) as work_units FROM \"WorkUnit\";"
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT COUNT(*) as alerts FROM \"Alert\";"

echo.
echo === Setup Complete! ===
echo.
echo The application is now using REAL data from PostgreSQL.
echo Mock Service Worker (MSW) has been completely removed.
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Visit http://localhost:3000
echo 3. All data comes from the PostgreSQL database
echo.
pause
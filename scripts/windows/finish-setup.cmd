@echo off
echo Finishing PostgreSQL setup...

echo.
echo === Applying Prisma schema to the database ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public

npx prisma db push

echo.
echo === Seeding the database with hierarchical data ===
npm run prisma:seed

echo.
echo === Verifying the setup ===
echo Checking tables in the database...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit|Alert|Metric)"

echo.
echo === Checking record counts ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Enterprise' as table, count(*) FROM \"Enterprise\" UNION ALL SELECT 'Site', count(*) FROM \"Site\" UNION ALL SELECT 'Area', count(*) FROM \"Area\" UNION ALL SELECT 'WorkCenter', count(*) FROM \"WorkCenter\" UNION ALL SELECT 'WorkUnit', count(*) FROM \"WorkUnit\";"

echo.
echo === Running all tests ===
npm run test:all

echo.
echo === Setup complete! ===
echo Your PostgreSQL database is now:
echo - Container: manufacturing-postgres
echo - Database: manufacturing
echo - Schema: Hierarchical (Enterprise → Site → Area → WorkCenter → WorkUnit)
echo - Seeded: Yes
echo - Ready for testing: Yes
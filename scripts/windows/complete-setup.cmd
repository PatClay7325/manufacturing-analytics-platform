@echo off
echo Completing database setup...

echo.
echo === Setting environment variables ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public

echo.
echo === Applying schema to manufacturing_db ===
npx prisma db push

echo.
echo === Seeding the database with hierarchical data ===
npx prisma db seed

echo.
echo === Verifying the schema was applied ===
echo Checking for hierarchical tables in manufacturing_db...
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Enterprise', 'Site', 'Area', 'WorkCenter', 'WorkUnit', 'Alert', 'Metric') ORDER BY tablename;"

echo.
echo === Checking record counts ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT 'Enterprise' as table_name, count(*) as count FROM \"Enterprise\" UNION ALL SELECT 'Site', count(*) FROM \"Site\" UNION ALL SELECT 'Area', count(*) FROM \"Area\" UNION ALL SELECT 'WorkCenter', count(*) FROM \"WorkCenter\" UNION ALL SELECT 'WorkUnit', count(*) FROM \"WorkUnit\";"

echo.
echo === Database setup complete! ===
echo Now let's run the tests...
echo.
npm run test:all
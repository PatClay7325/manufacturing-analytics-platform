@echo off
echo Verifying database setup and running tests...

echo.
echo === Current .env.test configuration ===
type .env.test | findstr DATABASE_URL

echo.
echo === Testing connection ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public
npx prisma db push --skip-generate

echo.
echo === Checking tables in manufacturing_db ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit|Alert|Metric)"

echo.
echo === Running tests with correct database ===
npm run test:all
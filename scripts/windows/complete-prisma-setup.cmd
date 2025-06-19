@echo off
echo === Completing Prisma Setup ===
echo.

echo [1] Testing current connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is accessible' as status;"

echo.
echo [2] Applying Prisma schema to development database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npx prisma db push

echo.
echo [3] Checking if schema was applied...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt"

echo.
echo [4] Applying schema to test database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
npx prisma db push --skip-generate

echo.
echo [5] Running tests to verify everything works...
echo.
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npm run test:e2e

echo.
echo === Setup Verification Complete! ===
echo.
pause
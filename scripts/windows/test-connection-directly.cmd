@echo off
echo Testing direct database connection...

echo.
echo === Testing connection from inside the container ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

echo.
echo === Testing connection from outside (host) ===
echo This will test different password combinations...

echo Testing: postgresql://postgres:postgres@localhost:5432/manufacturing
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npx prisma db push --skip-generate 2>nul && echo "SUCCESS: postgres/postgres works" || echo "FAILED: postgres/postgres"

echo Testing: postgresql://postgres:password@localhost:5432/manufacturing  
set DATABASE_URL=postgresql://postgres:password@localhost:5432/manufacturing
npx prisma db push --skip-generate 2>nul && echo "SUCCESS: postgres/password works" || echo "FAILED: postgres/password"

echo Testing: postgresql://postgres:@localhost:5432/manufacturing
set DATABASE_URL=postgresql://postgres:@localhost:5432/manufacturing
npx prisma db push --skip-generate 2>nul && echo "SUCCESS: postgres/(empty) works" || echo "FAILED: postgres/(empty)"

echo.
echo Let's check if the container allows connections from outside...
docker exec manufacturing-postgres cat /var/lib/postgresql/data/pg_hba.conf | findstr "host.*all.*all"
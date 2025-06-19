@echo off
echo Fixing database alignment issues...

echo.
echo === Current situation ===
echo Container was created with POSTGRES_DB=manufacturing_db
echo But docker-compose.yml and tests expect: manufacturing
echo We have 3 databases: manufacturing, manufacturing_db, manufacturing_test

echo.
echo === Option 1: Update .env files to use manufacturing_db ===
echo Updating .env.test to use manufacturing_db...
powershell -Command "(Get-Content .env.test) -replace 'manufacturing\?', 'manufacturing_db?' | Set-Content .env.test"

echo.
echo === Option 2: Apply schema to the correct database ===
echo Applying schema to manufacturing_db...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public

echo.
echo Generating Prisma client...
npx prisma generate

echo.
echo Applying schema to manufacturing_db...
npx prisma db push

echo.
echo === Seeding the database ===
npm run prisma:seed

echo.
echo === Verifying the setup ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "\dt" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit)"

echo.
echo === Final check ===
echo Database is now set up with hierarchical schema in manufacturing_db!
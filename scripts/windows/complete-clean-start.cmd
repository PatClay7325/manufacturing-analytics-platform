@echo off
echo Complete clean start - Removing everything PostgreSQL related...

echo.
echo === Step 1: Stop ALL PostgreSQL containers ===
docker ps -a | findstr postgres
docker stop manufacturing-postgres 2>nul
docker rm -f manufacturing-postgres 2>nul

echo.
echo === Step 2: Remove ALL PostgreSQL volumes ===
docker volume ls | findstr postgres
docker volume rm manufacturing-postgres-data 2>nul
docker volume rm postgres-data 2>nul
docker volume rm manufacturing-analytics-platform_postgres-data 2>nul

echo.
echo === Step 3: Create PostgreSQL with TRUST authentication (no password needed) ===
docker run -d ^
  --name manufacturing-postgres ^
  -e POSTGRES_HOST_AUTH_METHOD=trust ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_DB=manufacturing ^
  -p 5432:5432 ^
  postgres:15-alpine

echo.
echo === Step 4: Wait for PostgreSQL to start ===
echo Waiting 15 seconds for PostgreSQL to fully initialize...
timeout /t 15 /nobreak

echo.
echo === Step 5: Verify it's working ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Database is ready!' as status;"

echo.
echo === Step 6: Update .env files with trust connection (no password) ===
echo DATABASE_URL="postgresql://postgres@localhost:5432/manufacturing?schema=public" > .env.new
echo DIRECT_DATABASE_URL="postgresql://postgres@localhost:5432/manufacturing?schema=public" >> .env.new
type .env | findstr -v DATABASE_URL | findstr -v DIRECT_DATABASE_URL >> .env.new
move /y .env.new .env

copy .env .env.test

echo.
echo === Step 7: Test Prisma connection ===
npx prisma db push

echo.
echo === If that worked, seed the database ===
npm run prisma:seed

echo.
echo === Run tests ===
npm run test:all
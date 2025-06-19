@echo off
echo Starting fresh with a clean PostgreSQL setup...

echo.
echo === Step 1: Stop and remove existing PostgreSQL container ===
docker stop manufacturing-postgres
docker rm manufacturing-postgres

echo.
echo === Step 2: Remove old volume to ensure clean database ===
docker volume rm manufacturing-analytics-platform_postgres-data 2>nul
docker volume rm postgres-data 2>nul

echo.
echo === Step 3: Create new PostgreSQL container with correct settings ===
docker run -d ^
  --name manufacturing-postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=manufacturing ^
  -p 5432:5432 ^
  -v manufacturing-postgres-data:/var/lib/postgresql/data ^
  postgres:15-alpine

echo.
echo === Step 4: Wait for PostgreSQL to be ready ===
echo Waiting for database to start...
timeout /t 10 /nobreak

docker exec manufacturing-postgres pg_isready -U postgres

echo.
echo === Step 5: Update all .env files to use the clean database ===
echo Updating .env...
powershell -Command "(Get-Content .env) -replace 'manufacturing_db', 'manufacturing' | Set-Content .env"

echo Updating .env.test...
powershell -Command "(Get-Content .env.test) -replace 'manufacturing_db', 'manufacturing' | Set-Content .env.test"

echo.
echo === Step 6: Apply Prisma schema ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public
npx prisma generate
npx prisma db push

echo.
echo === Step 7: Seed the database ===
npm run prisma:seed

echo.
echo === Step 8: Verify setup ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt" | findstr -E "(Enterprise|Site|Area|WorkCenter|WorkUnit)"

echo.
echo === Step 9: Run tests ===
npm run test:all

echo.
echo === Clean setup complete! ===
echo Database: manufacturing
echo User: postgres  
echo Password: postgres
echo Port: 5432
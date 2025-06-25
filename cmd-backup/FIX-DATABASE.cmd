@echo off
echo ==================================================
echo Fixing Database Connection Issue
echo ==================================================
echo.

echo 1. Stopping existing PostgreSQL container...
docker-compose -f docker-compose.db.yml down

echo.
echo 2. Removing old volume (this will delete existing data)...
docker volume rm manufacturing-analytics-platform_postgres_data 2>nul

echo.
echo 3. Starting PostgreSQL with correct database name...
docker-compose -f docker-compose.db.yml up -d

echo.
echo 4. Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak > nul

echo.
echo 5. Running Prisma migrations...
npm run prisma:push

echo.
echo 6. Seeding database with sample data...
npx tsx prisma/seed-simple.ts

echo.
echo 7. Testing connection...
npx tsx scripts/test-db-connection.ts

echo.
echo ==================================================
echo Database setup complete!
echo ==================================================
pause
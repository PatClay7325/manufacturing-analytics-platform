@echo off
echo === Force Prisma Push ===
echo.

echo Current .env DATABASE_URL:
type .env | findstr DATABASE_URL
echo.

echo Testing with direct psql command...
docker exec -e PGPASSWORD=postgres manufacturing-postgres psql -h localhost -U postgres -d manufacturing -c "\dt"

echo.
echo Let's use dotenv-cli to override...
npm install -g dotenv-cli 2>nul

echo.
echo Pushing schema with forced environment...
dotenv -e .env.override -- npx prisma db push

echo.
echo If that didn't work, trying direct approach...
docker exec -i manufacturing-postgres psql -U postgres -d manufacturing < prisma\migrations\20250617221714_init\migration.sql

echo.
echo Done!
pause
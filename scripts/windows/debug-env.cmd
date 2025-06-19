@echo off
echo Debugging environment variables...

echo.
echo === Current .env file ===
type .env | findstr DATABASE_URL

echo.
echo === Current .env.test file ===
type .env.test | findstr DATABASE_URL

echo.
echo === Testing direct connection with psql ===
echo Testing manufacturing_db...
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT current_database();"

echo.
echo === Let's check pg_hba.conf in the container ===
docker exec manufacturing-postgres cat /var/lib/postgresql/data/pg_hba.conf

echo.
echo === Testing with explicit environment variable ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public
echo DATABASE_URL is now: %DATABASE_URL%

echo.
echo === Let's try a different approach - update the main .env file ===
copy .env .env.backup
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public" > .env.temp
echo DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public" >> .env.temp
type .env | findstr -v DATABASE_URL | findstr -v DIRECT_DATABASE_URL >> .env.temp
move /y .env.temp .env

echo.
echo === Now trying with updated .env ===
npx prisma db push
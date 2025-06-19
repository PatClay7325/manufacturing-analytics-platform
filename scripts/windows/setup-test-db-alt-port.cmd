@echo off
echo Setting up PostgreSQL test database on alternative port...

echo Stopping any existing test database container...
docker stop postgres-test 2>nul
docker rm postgres-test 2>nul

echo Starting PostgreSQL test database on port 5433...
docker run --name postgres-test ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=manufacturing_test ^
  -p 5433:5432 ^
  -d postgres:15

echo Waiting for database to be ready...
timeout /t 10 /nobreak

echo Testing database connection...
docker exec postgres-test pg_isready -U postgres

echo PostgreSQL test database is now running on localhost:5433
echo Database: manufacturing_test
echo Username: postgres
echo Password: postgres

echo.
echo IMPORTANT: Update your .env.test file to use port 5433:
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5433/manufacturing_test?schema=public"
echo DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/manufacturing_test?schema=public"
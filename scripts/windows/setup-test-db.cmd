@echo off
echo Setting up PostgreSQL test database with Docker...

echo Stopping any existing test database container...
docker stop postgres-test 2>nul
docker rm postgres-test 2>nul

echo Starting PostgreSQL test database...
docker run --name postgres-test ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=manufacturing_test ^
  -p 5432:5432 ^
  -d postgres:15

echo Waiting for database to be ready...
timeout /t 10 /nobreak

echo Testing database connection...
docker exec postgres-test pg_isready -U postgres

echo PostgreSQL test database is now running on localhost:5432
echo Database: manufacturing_test
echo Username: postgres
echo Password: postgres

echo To stop the test database later, run:
echo docker stop postgres-test
echo docker rm postgres-test
@echo off
echo Using existing PostgreSQL instance for testing...

echo Testing connection to existing PostgreSQL...
psql -h localhost -U postgres -d postgres -c "SELECT version();"

echo Creating test database if it doesn't exist...
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE manufacturing_test;" 2>nul

echo Testing connection to test database...
psql -h localhost -U postgres -d manufacturing_test -c "SELECT current_database();"

echo.
echo Existing PostgreSQL setup is ready for testing!
echo Make sure your .env.test file has:
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_test?schema=public"
echo DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_test?schema=public"
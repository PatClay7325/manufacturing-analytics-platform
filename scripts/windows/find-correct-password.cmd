@echo off
echo Finding the correct PostgreSQL password...

echo.
echo === Checking Docker container environment variables ===
docker exec manufacturing-postgres env | findstr POSTGRES

echo.
echo === Checking what's in docker-compose.yml ===
findstr -i postgres docker-compose.yml

echo.
echo === Testing different common passwords ===
echo Testing with 'postgres' password...
docker exec manufacturing-postgres psql -U postgres -c "SELECT 'Connection successful with postgres password';" 2>nul && echo SUCCESS: postgres password works

echo Testing with 'password' password...
docker exec manufacturing-postgres psql -U postgres -c "SELECT 'Connection successful with password password';" 2>nul && echo SUCCESS: password password works

echo Testing with empty password...
docker exec manufacturing-postgres psql -U postgres -c "SELECT 'Connection successful with empty password';" 2>nul && echo SUCCESS: empty password works

echo.
echo If none work, let's try to connect directly from the container...
docker exec manufacturing-postgres psql -U postgres -l
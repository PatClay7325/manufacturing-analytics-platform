@echo off
echo Checking PostgreSQL status...

echo.
echo === Docker containers using port 5432 ===
docker ps -a | findstr 5432

echo.
echo === All PostgreSQL related containers ===
docker ps -a | findstr postgres

echo.
echo === Network connections on port 5432 ===
netstat -an | findstr :5432

echo.
echo === Windows services related to PostgreSQL ===
sc query | findstr -i postgres

echo.
echo To resolve the port conflict, you can:
echo 1. Stop existing PostgreSQL service: net stop postgresql-x64-15
echo 2. Or use a different port for the test database
echo 3. Or use the existing PostgreSQL instance for testing
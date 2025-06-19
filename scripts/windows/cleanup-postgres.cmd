@echo off
echo Cleaning up PostgreSQL Docker containers and services...

echo.
echo === Stopping and removing legacy PostgreSQL containers ===
echo Stopping postgres-test (failed container)...
docker stop postgres-test 2>nul
docker rm postgres-test 2>nul

echo Stopping factory-postgres (legacy)...
docker stop factory-postgres 2>nul
docker rm factory-postgres 2>nul

echo.
echo === Keeping manufacturing-postgres (newest with hierarchical schema) ===
echo Current status of manufacturing-postgres:
docker ps | findstr manufacturing-postgres

echo.
echo === Stopping Windows PostgreSQL services (to avoid conflicts) ===
echo Stopping postgresql-x64-13...
net stop postgresql-x64-13 2>nul
echo Stopping postgresql-x64-17...
net stop postgresql-x64-17 2>nul

echo.
echo === Verifying the primary database ===
echo Testing connection to manufacturing-postgres...
docker exec manufacturing-postgres pg_isready -U postgres

echo.
echo === Checking if the manufacturing database exists ===
docker exec manufacturing-postgres psql -U postgres -l | findstr manufacturing

echo.
echo === Final status ===
echo Docker containers:
docker ps -a | findstr postgres

echo.
echo Network connections on port 5432:
netstat -an | findstr :5432

echo.
echo Cleanup complete! 
echo Primary database: manufacturing-postgres (postgres:15-alpine) on port 5432
echo Database: manufacturing (with hierarchical schema)
echo To connect: postgresql://postgres:password@localhost:5432/manufacturing
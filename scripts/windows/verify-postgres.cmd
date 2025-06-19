@echo off
echo === Verifying PostgreSQL Setup ===
echo.

echo Checking if PostgreSQL container is running...
docker ps | findstr manufacturing-postgres
if %errorlevel% neq 0 (
    echo PostgreSQL container is NOT running!
    echo.
    echo Starting PostgreSQL with password...
    docker run -d --name manufacturing-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=manufacturing -p 5432:5432 postgres:15-alpine
    echo.
    echo Waiting for PostgreSQL to start...
    timeout /t 10 /nobreak >nul
)

echo.
echo Testing connection with psql...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT current_database();"

echo.
echo Testing connection with environment variable...
docker exec -e PGPASSWORD=postgres manufacturing-postgres psql -h localhost -U postgres -d manufacturing -c "SELECT version();"

echo.
echo Now let's try Prisma with explicit connection...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
echo Connection string: %DATABASE_URL%
echo.
npx prisma db push

pause
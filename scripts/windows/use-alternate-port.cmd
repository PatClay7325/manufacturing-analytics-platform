@echo off
echo === Using Alternate Port Solution ===
echo.
echo Since Windows PostgreSQL is blocking port 5432,
echo we'll use port 5433 for Docker PostgreSQL.
echo.

echo [1] Removing old Docker containers...
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul

echo.
echo [2] Starting PostgreSQL on port 5433...
docker run -d ^
    --name manufacturing-postgres ^
    --restart unless-stopped ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -e POSTGRES_DB=manufacturing ^
    -p 5433:5432 ^
    -v manufacturing_postgres_data:/var/lib/postgresql/data ^
    postgres:15-alpine

echo.
echo Waiting for PostgreSQL to start...
timeout /t 5 /nobreak >nul

echo.
echo [3] Testing connection on port 5433...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Connected on port 5433!' as status;"

echo.
echo [4] Updating .env to use port 5433...
(
echo # Database Configuration
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5433/manufacturing"
echo DIRECT_URL="postgresql://postgres:postgres@localhost:5433/manufacturing"
echo.
echo # Application Configuration
echo NODE_ENV=development
echo PORT=3000
echo.
echo # Public API URLs
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000
) > .env

echo.
echo [5] Updating .env.local too...
copy .env .env.local >nul

echo.
echo [6] Creating test database...
docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing_test;" 2>nul

echo.
echo [7] Applying Prisma schema...
npx prisma db push

echo.
echo === Setup Complete! ===
echo.
echo PostgreSQL is now running on port 5433 (instead of 5432)
echo Your .env files have been updated accordingly.
echo.
echo Connection details:
echo - Host: localhost
echo - Port: 5433
echo - User: postgres
echo - Password: postgres
echo - Database: manufacturing
echo.
pause
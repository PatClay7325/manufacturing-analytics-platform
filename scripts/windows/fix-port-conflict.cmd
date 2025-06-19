@echo off
echo === Fixing Port 5432 Conflict ===
echo.

echo [1] Finding what's using port 5432...
netstat -ano | findstr :5432
echo.

echo [2] Checking for PostgreSQL services...
sc query | findstr -i postgres
echo.

echo [3] Checking Docker containers...
docker ps -a | findstr postgres
echo.

echo [4] Let's stop all PostgreSQL instances...
echo Stopping Windows PostgreSQL service if exists...
net stop postgresql-x64-15 2>nul
net stop postgresql-x64-14 2>nul
net stop postgresql-x64-13 2>nul
net stop postgresql 2>nul

echo.
echo Stopping all Docker PostgreSQL containers...
for /f "tokens=1" %%i in ('docker ps -a -q --filter "ancestor=postgres"') do docker stop %%i 2>nul
for /f "tokens=1" %%i in ('docker ps -a -q --filter "ancestor=postgres"') do docker rm %%i 2>nul

echo.
echo [5] Starting fresh PostgreSQL container on standard port...
docker run -d ^
    --name manufacturing-postgres ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -e POSTGRES_DB=manufacturing ^
    -p 5432:5432 ^
    postgres:15-alpine

echo.
echo Waiting for PostgreSQL to start...
timeout /t 5 /nobreak >nul

echo.
echo [6] Verifying connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();"

echo.
echo [7] Testing Prisma connection...
npx prisma db push

echo.
pause
@echo off
echo === Complete Test Fix and Run ===
echo.

echo [1/5] Stopping any existing PostgreSQL...
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul
taskkill /F /IM postgres.exe 2>nul

echo.
echo [2/5] Starting PostgreSQL with password...
docker run -d --name manufacturing-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=manufacturing -p 5432:5432 postgres:15-alpine

echo.
echo Waiting for PostgreSQL to start...
timeout /t 10 /nobreak >nul

echo.
echo [3/5] Testing database connection...
docker exec manufacturing-postgres psql -U postgres -c "SELECT version();"

echo.
echo [4/5] Setting up database schema...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npx prisma db push

echo.
echo [5/5] Running tests...
npm run test:e2e

echo.
echo === Complete! ===
pause
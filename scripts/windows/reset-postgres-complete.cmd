@echo off
echo === Complete PostgreSQL Reset ===
echo.

echo [1/6] Stopping ALL PostgreSQL containers...
docker stop manufacturing-postgres 2>nul
docker stop factory-postgres 2>nul  
docker stop postgres 2>nul
docker rm manufacturing-postgres 2>nul
docker rm factory-postgres 2>nul
docker rm postgres 2>nul

echo.
echo [2/6] Killing any PostgreSQL processes on port 5432...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5432') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo [3/6] Starting fresh PostgreSQL container...
docker run -d --name manufacturing-postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_DB=manufacturing ^
  -p 5432:5432 ^
  postgres:15-alpine

echo.
echo [4/6] Waiting for PostgreSQL to be fully ready...
:WAIT
timeout /t 3 /nobreak >nul
docker exec manufacturing-postgres pg_isready -U postgres -h localhost >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for PostgreSQL...
    goto WAIT
)

echo PostgreSQL is ready!
echo.

echo [5/6] Testing direct connection...
docker exec -it manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Connection successful!' as status;"

echo.
echo [6/6] Pushing Prisma schema...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set PGPASSWORD=postgres
npx prisma db push --skip-generate

echo.
echo === Setup Complete! ===
echo.
echo Database is ready at: postgresql://postgres:postgres@localhost:5432/manufacturing
echo.
echo You can now run: npm run test:e2e
echo.
pause
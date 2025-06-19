@echo off
echo === Stopping Windows PostgreSQL Services ===
echo.

echo [1] Stopping PostgreSQL Windows services...
echo.

REM Stop any PostgreSQL Windows services
net stop "postgresql-x64-16" 2>nul
net stop "postgresql-x64-15" 2>nul
net stop "postgresql-x64-14" 2>nul
net stop "postgresql-x64-13" 2>nul
net stop "postgresql-x64-12" 2>nul
net stop "PostgreSQL" 2>nul

echo.
echo [2] Killing PostgreSQL processes directly...
echo.

REM Kill all postgres.exe processes
taskkill /F /IM postgres.exe 2>nul

echo.
echo [3] Verifying port 5432 is free...
netstat -ano | findstr :5432 | findstr LISTENING
if %errorlevel% equ 0 (
    echo WARNING: Port 5432 is still in use!
) else (
    echo SUCCESS: Port 5432 is now free!
)

echo.
echo [4] Starting Docker PostgreSQL container...
docker run -d ^
    --name manufacturing-postgres ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -e POSTGRES_DB=manufacturing ^
    -p 5432:5432 ^
    -v manufacturing_postgres_data:/var/lib/postgresql/data ^
    postgres:15-alpine

echo.
echo Waiting for PostgreSQL to start...
timeout /t 10 /nobreak >nul

echo.
echo [5] Verifying Docker PostgreSQL is running...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Docker PostgreSQL is running!' as status;"

echo.
echo [6] Updating .env to use localhost (now that port is free)...
(
echo # Database Configuration
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
echo DIRECT_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
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
echo [7] Running Prisma db push...
npx prisma db push

echo.
echo === Setup Complete! ===
echo.
echo Windows PostgreSQL services have been stopped.
echo Docker PostgreSQL is now running on port 5432.
echo.
pause
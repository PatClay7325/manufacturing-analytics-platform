@echo off
echo === Using WSL2 Localhost Configuration ===
echo.

echo [1] Getting WSL2 IP address...
for /f "tokens=*" %%i in ('wsl hostname -I') do set WSL_IP=%%i
echo WSL IP: %WSL_IP%

echo.
echo [2] Checking Docker Desktop settings...
echo Make sure "Use the WSL 2 based engine" is enabled in Docker Desktop
echo.

echo [3] Restarting PostgreSQL with proper port binding...
docker stop manufacturing-postgres
docker rm manufacturing-postgres

docker run -d ^
    --name manufacturing-postgres ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -e POSTGRES_DB=manufacturing ^
    -p 127.0.0.1:5432:5432 ^
    postgres:15-alpine

echo.
echo Waiting for PostgreSQL to start...
timeout /t 5 /nobreak >nul

echo.
echo [4] Testing connection on 127.0.0.1...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Connected via 127.0.0.1' as status;"

echo.
echo [5] Updating .env for 127.0.0.1...
(
echo # Database Configuration
echo DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing"
echo DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing"
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
echo [6] Clearing Prisma cache and regenerating...
rmdir /s /q node_modules\.prisma 2>nul
npx prisma generate

echo.
echo [7] Running Prisma db push...
npx prisma db push

echo.
pause
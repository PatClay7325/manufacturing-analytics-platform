@echo off
echo === Setting Up Docker PostgreSQL - Final Setup ===
echo.

echo [1] Removing any existing Docker containers...
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul

echo.
echo [2] Starting fresh PostgreSQL container on port 5432...
docker run -d ^
    --name manufacturing-postgres ^
    --restart unless-stopped ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -e POSTGRES_DB=manufacturing ^
    -p 5432:5432 ^
    -v manufacturing_postgres_data:/var/lib/postgresql/data ^
    postgres:15-alpine

echo.
echo Waiting for PostgreSQL to be ready...
:WAIT
timeout /t 3 /nobreak >nul
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for PostgreSQL...
    goto WAIT
)

echo PostgreSQL is ready!
echo.

echo [3] Creating test database...
docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing_test;" 2>nul
if %errorlevel% equ 0 (
    echo Test database created successfully!
) else (
    echo Test database already exists.
)

echo.
echo [4] Verifying connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();"

echo.
echo [5] Ensuring .env is configured correctly...
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
echo [6] Clearing Prisma cache and regenerating client...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma\client 2>nul
npx prisma generate

echo.
echo [7] Applying Prisma schema to development database...
npx prisma db push

echo.
echo [8] Applying schema to test database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
npx prisma db push --skip-generate

echo.
echo [9] Running seed data (if available)...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npx prisma db seed 2>nul || echo No seed file configured.

echo.
echo === Setup Complete! ===
echo.
echo PostgreSQL is running successfully on port 5432
echo.
echo Databases ready:
echo - manufacturing (development)
echo - manufacturing_test (testing)
echo.
echo You can now run: npm run test:e2e
echo.
pause
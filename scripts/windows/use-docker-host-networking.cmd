@echo off
echo === Using Docker Host Networking Mode ===
echo.

echo [1] Stopping current container...
docker stop manufacturing-postgres
docker rm manufacturing-postgres

echo.
echo [2] Starting PostgreSQL with host networking...
docker run -d ^
    --name manufacturing-postgres ^
    --network host ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -e POSTGRES_DB=manufacturing ^
    postgres:15-alpine

echo.
echo [3] Waiting for PostgreSQL...
timeout /t 5 /nobreak >nul

echo.
echo [4] Testing connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 1;"

echo.
echo [5] Updating .env for localhost connection...
(
echo # Database Configuration
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
echo DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
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
echo [6] Pushing schema with Prisma...
npx prisma db push

echo.
pause
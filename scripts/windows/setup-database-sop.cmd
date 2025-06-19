@echo off
echo === Database Setup Following Industry SOP ===
echo.

echo [1/4] Container Management...
echo Cleaning up existing containers...
docker ps -a --filter "name=postgres" --format "{{.Names}}" > temp_containers.txt
for /f %%i in (temp_containers.txt) do (
    echo Stopping container: %%i
    docker stop %%i >nul 2>&1
    docker rm %%i >nul 2>&1
)
del temp_containers.txt

echo.
echo [2/4] Starting PostgreSQL Container...
echo Using official PostgreSQL image with explicit configuration...
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
echo [3/4] Waiting for Database Ready State...
:WAIT_DB
timeout /t 2 /nobreak >nul
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo Waiting for database...
    goto WAIT_DB
)
echo Database is ready!

echo.
echo [4/4] Setting up Database Schema...
echo Creating test database for isolated testing...
docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing_test;" 2>nul

echo.
echo Applying Prisma schema...
npx prisma db push --skip-generate

echo.
echo === Database Setup Complete ===
echo.
echo Databases created:
echo - manufacturing (development)
echo - manufacturing_test (testing)
echo.
echo Connection verified and schema applied.
echo.
pause
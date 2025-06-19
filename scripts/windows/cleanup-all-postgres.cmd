@echo off
echo === Complete PostgreSQL Cleanup ===
echo.
echo This will remove ALL PostgreSQL instances except the one we need.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [1] Force killing ALL PostgreSQL processes...
taskkill /F /IM postgres.exe 2>nul
taskkill /F /IM pg_ctl.exe 2>nul
taskkill /F /IM psql.exe 2>nul

echo.
echo [2] Stopping and removing ALL Docker PostgreSQL containers...
for /f "tokens=1" %%i in ('docker ps -a --filter "ancestor=postgres" -q') do (
    echo Stopping container: %%i
    docker stop %%i 2>nul
    docker rm %%i 2>nul
)

REM Also remove by name pattern
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul
docker stop factory-postgres 2>nul
docker rm factory-postgres 2>nul

echo.
echo [3] Removing Docker volumes (optional - will delete data)...
echo WARNING: This will delete all PostgreSQL data!
set /p DELETE_VOLUMES="Delete Docker volumes too? (y/N): "
if /i "%DELETE_VOLUMES%"=="y" (
    docker volume rm manufacturing_postgres_data 2>nul
    docker volume rm factory_postgres_data 2>nul
    docker volume prune -f
)

echo.
echo [4] Waiting for ports to be released...
timeout /t 5 /nobreak >nul

echo.
echo [5] Verifying port 5432 is free...
netstat -ano | findstr :5432 | findstr LISTENING
if %errorlevel% equ 0 (
    echo.
    echo Port 5432 is STILL in use. Checking what's holding it...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5432 ^| findstr LISTENING') do (
        echo Process %%a is using port 5432
        echo Forcing termination...
        taskkill /F /PID %%a
    )
    timeout /t 3 /nobreak >nul
)

echo.
echo [6] Final check - port should be free now...
netstat -ano | findstr :5432 | findstr LISTENING
if %errorlevel% equ 0 (
    echo ERROR: Port 5432 is still blocked!
    pause
    exit /b 1
) else (
    echo SUCCESS: Port 5432 is free!
)

echo.
echo [7] Starting ONE clean PostgreSQL container...
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
:WAIT_LOOP
timeout /t 2 /nobreak >nul
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting...
    goto WAIT_LOOP
)

echo.
echo [8] PostgreSQL is ready! Testing connection...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();"

echo.
echo [9] Creating test database...
docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing_test;" 2>nul

echo.
echo [10] Applying Prisma schema...
npx prisma db push

echo.
echo === Cleanup Complete! ===
echo.
echo Only ONE PostgreSQL instance is now running:
docker ps --filter "name=manufacturing-postgres"
echo.
echo Connection details:
echo - Host: localhost
echo - Port: 5432
echo - User: postgres
echo - Password: postgres
echo - Database: manufacturing (and manufacturing_test)
echo.
pause
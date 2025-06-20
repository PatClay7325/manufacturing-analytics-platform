@echo off
echo ==================================================
echo Testing Database Connection
echo ==================================================
echo.

echo Checking Docker PostgreSQL container...
docker ps | findstr postgres

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ PostgreSQL container is not running!
    echo.
    echo Starting PostgreSQL...
    docker-compose -f docker-compose.db.yml up -d
    
    echo.
    echo Waiting for PostgreSQL to start...
    timeout /t 5 /nobreak > nul
)

echo.
echo Running database connection test...
npx tsx scripts/test-db-connection.ts

echo.
echo ==================================================
echo If the test failed, try these commands:
echo ==================================================
echo 1. Check PostgreSQL logs:
echo    docker-compose -f docker-compose.db.yml logs postgres
echo.
echo 2. Restart PostgreSQL:
echo    docker-compose -f docker-compose.db.yml restart
echo.
echo 3. Reset database:
echo    npm run prisma:push
echo ==================================================
pause
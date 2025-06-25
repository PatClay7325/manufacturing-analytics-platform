@echo off
echo ===============================================
echo QUICK DATABASE SETUP
echo Manufacturing Analytics Platform
echo ===============================================
echo.

:: Set environment variables
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=development

echo [1/5] Checking PostgreSQL...
echo ===============================================

:: Try to connect to PostgreSQL
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo PostgreSQL is not running. Starting with Docker...
    docker run -d --name postgres-manufacturing -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=manufacturing postgres:15
    
    echo Waiting for PostgreSQL to start...
    timeout /t 10 /nobreak >nul
) else (
    echo PostgreSQL is running.
)

echo.
echo [2/5] Setting up database schema...
echo ===============================================
call npx prisma generate
call npx prisma db push --accept-data-loss

if errorlevel 1 (
    echo ERROR: Failed to setup database schema
    pause
    exit /b 1
)

echo.
echo [3/5] Creating test users...
echo ===============================================
call npx tsx scripts/seed-users.ts

echo.
echo [4/5] Seeding sample data (optional)...
echo ===============================================
echo Do you want to seed sample manufacturing data? (Y/N)
set /p seed_data=

if /i "%seed_data%"=="Y" (
    echo Seeding manufacturing data...
    call npx tsx prisma/seed.ts
)

echo.
echo [5/5] Verifying setup...
echo ===============================================
call npx tsx -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then(count => console.log(`Total users: ${count}`)).then(() => prisma.$disconnect())"

echo.
echo ===============================================
echo DATABASE SETUP COMPLETE!
echo ===============================================
echo.
echo Test users created:
echo   admin@example.com / admin123
echo   operator@example.com / operator123
echo   analyst@example.com / analyst123
echo   viewer@example.com / viewer123
echo.
echo Start the development server with: npm run dev
echo.
pause
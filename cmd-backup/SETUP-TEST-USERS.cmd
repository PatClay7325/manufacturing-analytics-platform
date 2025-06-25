@echo off
echo ===============================================
echo SETUP TEST USERS
echo Manufacturing Analytics Platform
echo ===============================================
echo.

echo This will create the following test users:
echo - admin@example.com / admin123 (Admin role)
echo - operator@example.com / operator123 (Operator role)
echo - analyst@example.com / analyst123 (Analyst role)
echo - viewer@example.com / viewer123 (Viewer role)
echo.

:: Check if database is running
echo Checking database connection...
call npx prisma db push --accept-data-loss >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to database
    echo Please make sure PostgreSQL is running on localhost:5432
    echo.
    echo To start PostgreSQL in Docker:
    echo docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
    echo.
    pause
    exit /b 1
)

echo Database connected successfully!
echo.

:: Run the seed script
echo Creating test users...
call npx tsx scripts/seed-users.ts

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create users
    echo Check the error message above
    pause
    exit /b 1
)

echo.
echo ===============================================
echo TEST USERS CREATED SUCCESSFULLY!
echo ===============================================
echo.
echo You can now login with:
echo.
echo Admin Account:
echo   Email: admin@example.com
echo   Password: admin123
echo.
echo Other test accounts:
echo   operator@example.com / operator123
echo   analyst@example.com / analyst123
echo   viewer@example.com / viewer123
echo.
echo ===============================================
echo.
pause
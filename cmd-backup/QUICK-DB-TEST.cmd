@echo off
echo ==================================================
echo Quick Database Connection Test
echo ==================================================
echo.

echo Testing with psql directly...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT version();"

if %ERRORLEVEL% neq 0 (
    echo.
    echo Trying with manufacturing_db database...
    docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT version();"
    
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ❌ Database name mismatch detected!
        echo Your database is named 'manufacturing_db' but DATABASE_URL points to 'manufacturing'
        echo.
        echo To fix, either:
        echo 1. Update .env.local to use:
        echo    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_db"
        echo.
        echo 2. Or create the 'manufacturing' database:
        echo    docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing;"
    )
) else (
    echo.
    echo ✅ Database 'manufacturing' exists!
    echo.
    echo Testing table structure...
    docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt"
)

echo.
pause
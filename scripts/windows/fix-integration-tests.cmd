@echo off
echo === FIXING INTEGRATION TESTS ===
echo.
echo The integration tests are failing because they're trying to clean
echo production data which has foreign key constraints.
echo.
echo Choose a solution:
echo.
echo 1. Run tests on a separate test database
echo 2. Fix the cleanup order (current approach)
echo 3. Skip integration tests for now
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Setting up separate test database...
    
    REM Create test database
    docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing_test;" 2>nul
    
    REM Apply schema to test database
    set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
    set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
    
    npx prisma db push --skip-generate
    
    echo.
    echo Running integration tests on test database...
    npx vitest run --config vitest.config.integration.ts
    
) else if "%choice%"=="2" (
    echo.
    echo Running integration tests with fixed cleanup...
    set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
    set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
    set NODE_ENV=test
    
    npx vitest run --config vitest.config.integration.ts
    
) else if "%choice%"=="3" (
    echo.
    echo Skipping integration tests.
    echo Running unit tests only...
    
    npx vitest run --config vitest.config.ts
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

echo.
pause
@echo off
echo === Bypassing Prisma - Direct Database Setup ===
echo.

echo Since Prisma has Windows/Docker connection issues,
echo we'll set up the database directly and run tests.
echo.

echo [1] Getting the migration SQL...
cd prisma\migrations\20250617221714_init
echo Found migration file. Applying to database...
type migration.sql | docker exec -i manufacturing-postgres psql -U postgres -d manufacturing
cd ..\..\..

echo.
echo [2] Creating test database with same schema...
docker exec manufacturing-postgres psql -U postgres -c "DROP DATABASE IF EXISTS manufacturing_test;"
docker exec manufacturing-postgres psql -U postgres -c "CREATE DATABASE manufacturing_test;"
cd prisma\migrations\20250617221714_init
type migration.sql | docker exec -i manufacturing-postgres psql -U postgres -d manufacturing_test
cd ..\..\..

echo.
echo [3] Verifying tables exist...
echo == Development Database ==
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt"
echo.
echo == Test Database ==
docker exec manufacturing-postgres psql -U postgres -d manufacturing_test -c "\dt"

echo.
echo [4] Running seed data (if exists)...
if exist prisma\seed.ts (
    echo Running seed...
    npx tsx prisma/seed.ts
) else (
    echo No seed file found, skipping...
)

echo.
echo === Database Setup Complete! ===
echo.
echo Both databases are ready with schema applied.
echo You can now run: npm run test:e2e
echo.
echo Note: Prisma migrations won't work due to Windows/Docker issues,
echo but the database schema is correctly applied.
echo.
pause
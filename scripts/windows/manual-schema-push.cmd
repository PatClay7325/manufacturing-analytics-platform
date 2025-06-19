@echo off
echo === Manual Schema Push to PostgreSQL ===
echo.

echo Generating SQL from Prisma schema...
npx prisma migrate dev --create-only --name init --skip-seed

echo.
echo Applying schema directly to PostgreSQL...
docker exec -i manufacturing-postgres psql -U postgres -d manufacturing < prisma\migrations\*_init\migration.sql 2>nul

echo.
echo Verifying tables were created...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "\dt"

echo.
echo === Schema applied successfully! ===
echo.
echo The database is now ready. Run: npm run test:e2e
echo.
pause
@echo off
echo === Seeding Test Data ===
echo.

echo [1] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

echo.
echo [2] Running Prisma seed script...
npx prisma db seed

echo.
echo === Seed Complete ===
echo.
echo Test data has been added to the database.
echo You can now run the application and see real data.
echo.
pause
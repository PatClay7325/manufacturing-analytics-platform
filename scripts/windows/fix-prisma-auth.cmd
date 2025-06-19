@echo off
echo === Fixing Prisma Authentication Issue ===
echo.

echo The issue: Prisma schema requires both DATABASE_URL and DIRECT_URL
echo but .env only has DATABASE_URL
echo.

echo Updating .env to include DIRECT_URL...
echo DIRECT_URL="postgresql://postgres:postgres@localhost:5432/manufacturing" >> .env

echo.
echo Forcing Prisma to use .env.local (which has both URLs)...
set DOTENV_CONFIG_PATH=.env.local

echo.
echo Pushing schema with explicit environment...
npx prisma db push --skip-generate

echo.
echo If that didn't work, let's try with direct environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npx prisma db push --skip-generate

echo.
echo === Done ===
pause
@echo off
echo === Direct Database Setup ===
echo.

echo Creating override environment file...
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing > .env.override
echo DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing >> .env.override

echo.
echo Method 1: Using Windows environment variable precedence...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

REM Temporarily rename .env to prevent Prisma from reading it
move .env .env.temp >nul 2>&1

echo.
echo Pushing schema without .env file interference...
npx prisma db push

REM Restore .env
move .env.temp .env >nul 2>&1

echo.
echo === Database setup complete! ===
echo.
echo Now you can run: npm run test:e2e
echo.
pause
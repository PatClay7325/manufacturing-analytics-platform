@echo off
echo === Fixing Prisma on Windows - Proper Solution ===
echo.

echo [1] Installing cross-env for proper environment handling...
npm install --save-dev cross-env

echo.
echo [2] Creating Prisma configuration file...
echo { > prisma\.env
echo   "DATABASE_URL": "postgresql://postgres:postgres@127.0.0.1:5432/manufacturing", >> prisma\.env
echo   "DIRECT_URL": "postgresql://postgres:postgres@127.0.0.1:5432/manufacturing" >> prisma\.env
echo } >> prisma\.env

echo.
echo [3] Testing with explicit environment variable...
set DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/manufacturing

echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo DIRECT_URL=%DIRECT_URL%
echo.

echo [4] Running Prisma with cross-env...
npx cross-env DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing" DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing" prisma db push

echo.
echo [5] If that worked, updating package.json scripts...
echo Add these to your package.json scripts:
echo "prisma:push": "cross-env DATABASE_URL=\"postgresql://postgres:postgres@127.0.0.1:5432/manufacturing\" prisma db push"
echo "prisma:migrate": "cross-env DATABASE_URL=\"postgresql://postgres:postgres@127.0.0.1:5432/manufacturing\" prisma migrate dev"
echo.

pause
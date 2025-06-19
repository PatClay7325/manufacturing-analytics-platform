@echo off
echo === Running Tests with Environment Override ===
echo.

REM Override environment variables
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo.

echo Pushing schema with override...
npx prisma db push --skip-generate

echo.
echo Running tests...
npm run test:e2e

pause
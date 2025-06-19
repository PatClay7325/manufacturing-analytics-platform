@echo off
echo === Setting up PostgreSQL for Testing ===
echo.

echo Stopping existing PostgreSQL containers...
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul

echo.
echo Starting fresh PostgreSQL with trust authentication...
docker run -d --name manufacturing-postgres -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=postgres -e POSTGRES_DB=manufacturing -p 5432:5432 postgres:15-alpine

echo.
echo Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

echo.
echo Creating .env.test file with correct connection string...
echo DATABASE_URL=postgresql://postgres@localhost:5432/manufacturing > .env.test
echo DIRECT_URL=postgresql://postgres@localhost:5432/manufacturing >> .env.test
echo NODE_ENV=test >> .env.test

echo.
echo Pushing schema to database...
set DATABASE_URL=postgresql://postgres@localhost:5432/manufacturing
npx prisma db push --skip-generate

echo.
echo Running seed (if it exists)...
npx prisma db seed 2>nul || echo No seed file found, skipping...

echo.
echo === PostgreSQL Setup Complete! ===
echo.
echo Database is ready at: postgresql://postgres@localhost:5432/manufacturing
echo.
pause
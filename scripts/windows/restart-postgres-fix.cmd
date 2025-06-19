@echo off
echo Restarting PostgreSQL to apply authentication changes...

echo.
echo === Restarting the container ===
docker restart manufacturing-postgres

echo Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak

echo.
echo === Verifying PostgreSQL is ready ===
docker exec manufacturing-postgres pg_isready -U postgres

echo.
echo === Testing connection now ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public

echo.
echo === Applying schema ===
npx prisma db push

echo.
echo === If still failing, let's check what Prisma is actually using ===
npx prisma db push --preview-feature

echo.
echo === Alternative: Use connection without password ===
set DATABASE_URL=postgresql://postgres@localhost:5432/manufacturing_db?schema=public
npx prisma db push
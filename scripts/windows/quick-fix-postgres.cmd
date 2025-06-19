@echo off
echo Quick fix for PostgreSQL authentication...

echo.
echo === Method 1: Reset PostgreSQL password in container ===
docker exec manufacturing-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"

echo.
echo === Method 2: Apply schema directly in container ===
echo Copying current schema to container...
docker cp prisma/schema.prisma manufacturing-postgres:/tmp/schema.prisma

echo Generating SQL from schema...
npx prisma db push --skip-generate --accept-data-loss --force-reset

echo.
echo === Method 3: Restart container with known environment ===
echo Getting container details...
docker inspect manufacturing-postgres | findstr -i postgres_password

echo.
echo === Testing the fix ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
npx prisma db push --skip-generate
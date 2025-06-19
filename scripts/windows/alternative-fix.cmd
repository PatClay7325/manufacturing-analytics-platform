@echo off
echo Alternative fix - Connect through Docker network...

echo.
echo === Finding the correct Docker network ===
docker network ls | findstr manufacturing

echo.
echo === Getting container details ===
docker inspect manufacturing-postgres | findstr -A 5 NetworkMode

echo.
echo === Running Prisma inside a container on the same network ===
echo Creating temporary container to run Prisma...

docker run --rm ^
  --network manufacturing-analytics-platform_default ^
  -v "%cd%:/app" ^
  -w /app ^
  -e DATABASE_URL="postgresql://postgres:postgres@manufacturing-postgres:5432/manufacturing_db?schema=public" ^
  -e DIRECT_DATABASE_URL="postgresql://postgres:postgres@manufacturing-postgres:5432/manufacturing_db?schema=public" ^
  node:18-alpine sh -c "npm install && npx prisma generate && npx prisma db push && npx prisma db seed"

echo.
echo === Verifying setup ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Enterprise', 'Site', 'Area', 'WorkCenter', 'WorkUnit') ORDER BY tablename;"
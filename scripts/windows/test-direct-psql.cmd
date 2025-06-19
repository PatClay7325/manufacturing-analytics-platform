@echo off
echo Testing PostgreSQL connection methods...

echo.
echo === Method 1: Direct psql from host (if installed) ===
psql -h localhost -p 5432 -U postgres -d manufacturing_db -c "SELECT version();" 2>nul || echo "psql not installed on host"

echo.
echo === Method 2: Using Docker exec (guaranteed to work) ===
docker exec -e PGPASSWORD=postgres manufacturing-postgres psql -U postgres -d manufacturing_db -c "SELECT version();"

echo.
echo === Method 3: Test from another container ===
docker run --rm --network host -e PGPASSWORD=postgres postgres:15-alpine psql -h localhost -U postgres -d manufacturing_db -c "SELECT version();" 2>nul || echo "Connection from external container failed"

echo.
echo === Method 4: Check Docker network ===
docker network ls
docker inspect manufacturing-postgres | findstr IPAddress

echo.
echo === Method 5: Force Prisma with explicit URL ===
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_db
npx prisma db push --schema=prisma/schema.prisma
@echo off
echo Direct Docker solution - Running everything inside the container...

echo.
echo === Step 1: Copy schema to container ===
docker cp prisma manufacturing-postgres:/tmp/

echo.
echo === Step 2: Install Node.js in PostgreSQL container temporarily ===
docker exec manufacturing-postgres sh -c "apk add --no-cache nodejs npm"

echo.
echo === Step 3: Apply schema directly inside container ===
docker exec -w /tmp/prisma manufacturing-postgres sh -c "DATABASE_URL='postgresql://postgres:postgres@localhost:5432/manufacturing_db?schema=public' npm install && npx prisma generate && npx prisma db push"

echo.
echo === Step 4: Verify tables were created ===
docker exec manufacturing-postgres psql -U postgres -d manufacturing_db -c "\dt"

echo.
echo === Step 5: Clean solution - Update Windows hosts file ===
echo Adding manufacturing-postgres to hosts file...
echo 127.0.0.1 manufacturing-postgres >> C:\Windows\System32\drivers\etc\hosts

echo.
echo === Step 6: Update DATABASE_URL to use hostname ===
set DATABASE_URL=postgresql://postgres:postgres@manufacturing-postgres:5432/manufacturing_db?schema=public
echo Updated DATABASE_URL: %DATABASE_URL%

echo.
echo === Final test ===
npx prisma db push
@echo off
echo === Verifying Prisma Configuration ===
echo.

echo [1] Checking Prisma schema datasource configuration...
type prisma\schema.prisma | findstr "url"
echo.

echo [2] Checking current environment files...
echo.
echo == .env ==
type .env | findstr "URL"
echo.
echo == .env.local ==
type .env.local | findstr "URL"
echo.

echo [3] Testing database connection directly...
echo From Docker:
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT current_database(), current_user;"
echo.

echo [4] Testing with Prisma CLI...
npx prisma db pull --print

echo.
echo === Analysis Complete ===
pause
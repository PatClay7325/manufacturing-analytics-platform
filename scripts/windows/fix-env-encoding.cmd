@echo off
echo === Fixing Environment File Encoding ===
echo.

echo [1] Creating clean .env file with correct encoding...
(
echo # Database Configuration
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
echo DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
echo.
echo # Application Configuration
echo NODE_ENV=development
echo PORT=3000
echo.
echo # Public API URLs
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000
) > .env.new

echo.
echo [2] Backing up current .env...
copy .env .env.backup-with-issue

echo.
echo [3] Replacing with clean version...
move /y .env.new .env

echo.
echo [4] Testing Prisma with clean file...
npx prisma db push

echo.
echo [5] If that didn't work, let's check what's in prisma.schema...
type prisma\schema.prisma | findstr -n "url"

echo.
pause
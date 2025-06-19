@echo off
echo === Diagnosing Root Cause of Prisma Connection Issue ===
echo.

echo [1] Check what Prisma is actually reading...
echo.
echo Current .env file content:
echo -------------------------
type .env
echo -------------------------
echo.

echo [2] Check if Prisma is caching old values...
echo Clearing Prisma engine cache...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma\client 2>nul

echo.
echo [3] Regenerating Prisma Client...
npx prisma generate

echo.
echo [4] Check Windows hosts file...
type C:\Windows\System32\drivers\etc\hosts | findstr localhost
echo.

echo [5] Test if 127.0.0.1 works instead of localhost...
(
echo # Database Configuration
echo DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing"
echo DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/manufacturing"
echo.
echo # Application Configuration
echo NODE_ENV=development
echo PORT=3000
echo.
echo # Public API URLs
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000
) > .env

echo.
echo Updated .env to use 127.0.0.1 instead of localhost
echo.

echo [6] Testing connection with 127.0.0.1...
npx prisma db push

echo.
pause
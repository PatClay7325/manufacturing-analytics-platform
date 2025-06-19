@echo off
echo === Fixing Root Cause: .env.local Override ===
echo.

echo The issue: .env.local is overriding .env with old connection string
echo.

echo Backing up .env.local...
copy .env.local .env.local.backup >nul

echo.
echo Updating DATABASE_URL in .env.local...
powershell -Command "(Get-Content .env.local) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/manufacturing\"' | Set-Content .env.local"

echo.
echo Updated .env.local. Now pushing schema...
npx prisma db push

echo.
echo === Root cause fixed! ===
echo.
echo The issue was that .env.local was overriding .env with an old connection string.
echo In Next.js, the priority order is:
echo 1. .env.local (highest priority)
echo 2. .env
echo.
echo Now you can run: npm run test:e2e
echo.
pause
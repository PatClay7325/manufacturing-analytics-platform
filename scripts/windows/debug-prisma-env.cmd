@echo off
echo === Debugging Prisma Environment Loading ===
echo.

echo [1] Show what Prisma sees...
npx prisma version
echo.

echo [2] Show environment info...
npx prisma db pull --print 2>&1 | findstr "DATABASE_URL"
echo.

echo [3] Force with dotenv-cli...
npm install -D dotenv-cli
echo.

echo [4] Create minimal env file...
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing > .env.minimal
echo DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing >> .env.minimal

echo.
echo [5] Push with explicit env file...
npx dotenv -e .env.minimal -- prisma db push

echo.
echo [6] If that worked, let's apply to main env...
copy .env .env.old
copy .env.minimal .env
npx prisma db push
copy .env.old .env

echo.
pause
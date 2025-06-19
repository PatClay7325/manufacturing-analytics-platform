@echo off
echo === Diagnosing Environment Variables ===
echo.

echo Checking all .env files for DATABASE_URL...
echo.
echo [.env]
type .env | findstr DATABASE_URL
echo.
echo [.env.local]
type .env.local | findstr DATABASE_URL
echo.
echo [.env.test]
type .env.test | findstr DATABASE_URL
echo.
echo [.env.production]
type .env.production | findstr DATABASE_URL
echo.

echo Testing which file Prisma is actually using...
echo.
echo Temporarily renaming files to isolate the issue...
ren .env.local .env.local.disabled
ren .env.test .env.test.disabled
ren .env.production .env.production.disabled

echo.
echo Now testing with only .env file...
npx prisma db push

echo.
echo Restoring files...
ren .env.local.disabled .env.local
ren .env.test.disabled .env.test  
ren .env.production.disabled .env.production

pause
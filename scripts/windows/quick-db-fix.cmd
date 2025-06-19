@echo off
echo === Quick Database Fix ===
echo.

REM Create a temporary .env with correct credentials
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing" > .env.temp
echo DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing" >> .env.temp
type .env | findstr /v "DATABASE_URL" | findstr /v "DIRECT_DATABASE_URL" >> .env.temp
move /y .env.temp .env >nul

echo Database URLs updated in .env file!
echo.

echo Now pushing schema...
npx prisma db push

echo.
echo Schema pushed! You can now run: npm run test:e2e
echo.
pause
@echo off
echo ========================================
echo Complete Prisma Fix
echo ========================================
echo.

echo Step 1: Installing Prisma client...
call npm install @prisma/client --save

echo.
echo Step 2: Installing Prisma dev dependency...
call npm install prisma --save-dev

echo.
echo Step 3: Setting correct DATABASE_URL...
set DATABASE_URL=postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public

echo.
echo Step 4: Generating Prisma client...
call npx prisma generate

echo.
echo Step 5: Pushing schema to database (if needed)...
call npx prisma db push --skip-generate

echo.
echo ========================================
echo Fix completed!
echo.
echo DATABASE_URL: %DATABASE_URL%
echo.
echo Now you can start the dev server with:
echo npm run dev
echo ========================================
pause
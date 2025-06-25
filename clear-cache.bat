@echo off
echo Clearing Next.js and Prisma cache...

echo.
echo Step 1: Stopping any Node processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Step 2: Clearing Next.js cache...
rmdir /s /q .next 2>nul

echo.
echo Step 3: Clearing Prisma client...
rmdir /s /q node_modules\.prisma 2>nul

echo.
echo Step 4: Regenerating Prisma client...
npx prisma generate

echo.
echo ✅ Cache cleared successfully!
echo.
echo Now run: npm run dev
pause
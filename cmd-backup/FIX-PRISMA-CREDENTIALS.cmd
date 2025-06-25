@echo off
echo ========================================
echo Fixing Prisma Database Credentials
echo ========================================
echo.

echo Step 1: Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Step 2: Clearing Next.js cache...
rmdir /s /q .next 2>nul

echo.
echo Step 3: Clearing Prisma client...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma\client 2>nul

echo.
echo Step 4: Setting correct DATABASE_URL...
set DATABASE_URL=postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public

echo.
echo Step 5: Regenerating Prisma client with correct credentials...
call npx prisma generate

echo.
echo Step 6: Verifying environment...
echo DATABASE_URL is: %DATABASE_URL%

echo.
echo ========================================
echo Fix completed! 
echo.
echo Now start the dev server with:
echo npm run dev
echo.
echo The correct credentials are:
echo - Host: localhost
echo - Port: 5433
echo - Database: manufacturing
echo - Username: analytics
echo - Password: development_password
echo ========================================
pause
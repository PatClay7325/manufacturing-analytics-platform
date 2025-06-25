@echo off
echo ========================================
echo Restarting Dev Server with Correct Credentials
echo ========================================
echo.

echo Step 1: Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 3 >nul

echo.
echo Step 2: Setting environment variables...
set DATABASE_URL=postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public
set NODE_ENV=development

echo.
echo Step 3: Clearing Next.js cache...
rmdir /s /q .next 2>nul

echo.
echo Step 4: Testing database connection...
node diagnose-prisma-env.js

echo.
echo Step 5: Starting development server...
echo.
echo DATABASE_URL: %DATABASE_URL%
echo.
echo Starting Next.js with correct credentials...
npm run dev
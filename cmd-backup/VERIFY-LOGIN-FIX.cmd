@echo off
echo ====================================================
echo    VERIFYING LOGIN FIX - Manufacturing Analytics
echo ====================================================
echo.

echo [1/4] Checking database connection...
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:password@localhost:5432/manufacturing?schema=public' } } }); p.$connect().then(() => { console.log('✅ Database connection: OK'); p.$disconnect(); }).catch(e => { console.log('❌ Database connection: FAILED'); console.log(e.message); process.exit(1); });"
if errorlevel 1 goto :error

echo.
echo [2/4] Verifying demo user credentials...
node verify-demo-users.js
if errorlevel 1 echo Warning: Demo user verification had issues

echo.
echo [3/4] Testing login endpoint...
echo Testing with: admin@example.com / demo123
timeout /t 2 >nul
node test-login-debug.js

echo.
echo [4/4] Running complete authentication flow test...
timeout /t 2 >nul
node test-complete-auth-flow.js

echo.
echo ====================================================
echo    VERIFICATION COMPLETE
echo ====================================================
echo.
echo If login is still failing:
echo 1. Restart the dev server: Ctrl+C then npm run dev
echo 2. The DATABASE_URL fix requires a server restart
echo 3. Run this script again after restart
echo.
pause
goto :eof

:error
echo.
echo ❌ Database connection failed!
echo.
echo Please ensure:
echo 1. PostgreSQL is running (docker ps)
echo 2. Password is "password" not "postgres"
echo 3. Database "manufacturing" exists
echo.
pause
@echo off
echo Fixing Manufacturing App Login...

REM Push database schema
echo Pushing database schema...
call npx prisma db push

REM Create users
echo Creating default users...
call node scripts/setup-database.js

REM Test connection
echo Testing database connection...
call node scripts/test-connection.js

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Default Login Credentials:
echo   Admin:    admin@manufacturing.local / admin123
echo   Demo:     demo@manufacturing.local / demo123
echo   Operator: operator@manufacturing.local / operator123
echo.
echo Next Steps:
echo 1. Restart your Next.js app (Ctrl+C then npm run dev)
echo 2. Go to http://localhost:3000/login
echo 3. Login with one of the credentials above
echo.
pause
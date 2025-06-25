@echo off
echo Running User Setup...
echo.

REM First ensure we have the right dependencies
call npm install bcryptjs --save 2>nul

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate

REM Push database schema (without seeding)
echo.
echo Pushing database schema...
call npx prisma db push

REM Run the user setup
echo.
echo Creating users...
node setup-users.js

echo.
echo Done! You can now login to the app.
pause
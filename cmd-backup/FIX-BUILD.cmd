@echo off
echo Fixing build issues for Manufacturing Analytics Platform...
echo.

echo Step 1: Cleaning npm cache...
npm cache clean --force

echo.
echo Step 2: Installing only missing dependencies...
npm install recharts --no-save --legacy-peer-deps

echo.
echo Step 3: Generating Prisma client...
npx prisma generate

echo.
echo Step 4: Building the application...
npm run build

echo.
echo Build fix complete! You can now run: docker-compose up -d
pause
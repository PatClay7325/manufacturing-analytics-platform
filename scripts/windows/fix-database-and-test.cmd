@echo off
echo === Fixing Database Connection and Running Tests ===
echo.

echo [1/4] Updating .env with correct DATABASE_URL...
copy .env .env.backup >nul
powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/manufacturing\"' | Set-Content .env"

echo.
echo [2/4] Stopping and restarting PostgreSQL...
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul
docker run -d --name manufacturing-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=manufacturing -p 5432:5432 postgres:15-alpine

echo.
echo Waiting for PostgreSQL to be ready...
:WAIT_LOOP
timeout /t 2 /nobreak >nul
docker exec manufacturing-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 goto WAIT_LOOP

echo PostgreSQL is ready!
echo.

echo [3/4] Pushing database schema...
npx prisma db push

echo.
echo [4/4] Running Playwright tests...
npm run test:e2e

echo.
echo === Complete! ===
echo.
echo Your original .env was backed up to .env.backup
echo.
pause
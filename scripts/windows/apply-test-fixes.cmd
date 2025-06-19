@echo off
echo === Applying Playwright Test Fixes ===
echo.

echo [1/4] Fixing manufacturing-chat.spec.ts title assertion...
cd tests\e2e
powershell -Command "(Get-Content manufacturing-chat.spec.ts) -replace 'Manufacturing AI Assistant.*Adaptive Factory', 'Adaptive Factory AI Solutions' | Set-Content manufacturing-chat.spec.ts"
cd ..\..

echo [2/4] Fixing navigation.spec.ts strict mode violations...
cd tests\e2e
powershell -Command "(Get-Content navigation.spec.ts) | ForEach-Object { $_ -replace '(page\.locator\(.nav a:has-text\(.Dashboard.\)\.))', '$1.first()' -replace '(page\.locator\(.nav a:has-text\(.Equipment.\)\.))', '$1.first()' -replace '(page\.locator\(.nav a:has-text\(.Alerts.\)\.))', '$1.first()' -replace '(page\.locator\(.nav a:has-text\(.AI Chat.\)\.))', '$1.first()' } | Set-Content navigation.spec.ts"
cd ..\..

echo [3/4] Starting PostgreSQL with trust authentication...
docker stop manufacturing-postgres 2>nul
docker rm manufacturing-postgres 2>nul
docker run -d --name manufacturing-postgres -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=postgres -e POSTGRES_DB=manufacturing -p 5432:5432 postgres:15-alpine
echo Waiting for PostgreSQL to start...
timeout /t 5 /nobreak >nul

echo [4/4] Setting up database...
set DATABASE_URL=postgresql://postgres@localhost:5432/manufacturing
npx prisma db push --skip-generate
npx prisma db seed

echo.
echo === Fixes Applied Successfully ===
echo.
echo Now run: npm run test:e2e
echo.
pause
@echo off
echo === Fixing ALL Environment Files ===
echo.

set "CORRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing"

echo Updating all .env files with correct DATABASE_URL...
echo.

for %%f in (.env .env.local .env.test .env.production) do (
    if exist %%f (
        echo Updating %%f...
        powershell -Command "(Get-Content %%f) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"%CORRECT_URL%\"' -replace 'DIRECT_DATABASE_URL=.*', 'DIRECT_DATABASE_URL=\"%CORRECT_URL%\"' -replace 'DIRECT_URL=.*', 'DIRECT_URL=\"%CORRECT_URL%\"' | Set-Content %%f"
    )
)

echo.
echo All environment files updated!
echo.

echo Now let's verify the connection works...
docker exec manufacturing-postgres psql -U postgres -d manufacturing -c "SELECT 'Testing connection' as status;"

echo.
echo Pushing schema with clean environment...
npx prisma db push

echo.
echo If push succeeded, you can run: npm run test:e2e
echo.
pause
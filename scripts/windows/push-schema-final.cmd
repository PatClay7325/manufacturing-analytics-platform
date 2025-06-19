@echo off
echo === Final Schema Push ===
echo.

echo Setting environment variables explicitly...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

echo.
echo Pushing schema to development database...
npx prisma db push

echo.
echo If successful, setting up test database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
npx prisma db push

echo.
echo === Schema Push Complete ===
echo.
echo Databases ready:
echo - manufacturing (development)
echo - manufacturing_test (testing)
echo.
echo You can now run: npm run test:e2e
echo.
pause
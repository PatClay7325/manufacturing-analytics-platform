@echo off
echo === Running E2E Tests with UI ===
echo.

echo [1] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

echo.
echo [2] Starting E2E tests with Playwright UI...
echo This will open a browser window where you can run and debug tests.
echo.

npm run test:e2e:ui

echo.
echo === Tests Complete ===
pause
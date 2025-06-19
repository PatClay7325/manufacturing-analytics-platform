@echo off
echo === Running E2E Tests with Visible Browsers ===
echo.

echo [1] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

echo.
echo [2] Running E2E tests with visible browsers...
echo You will see the browsers open and run the tests.
echo.

npx playwright test --headed

echo.
echo === Tests Complete ===
echo.
echo Test results saved in: playwright-report\index.html
echo.
pause
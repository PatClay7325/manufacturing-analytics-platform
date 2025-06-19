@echo off
echo === Testing Alerts Page Only ===
echo.

set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

npx playwright test tests/e2e/alerts.spec.ts --reporter=list

pause
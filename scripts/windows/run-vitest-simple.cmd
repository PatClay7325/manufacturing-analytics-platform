@echo off
echo === VITEST TEST RUNNER ===
echo.

set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo Running all unit tests...
echo.

echo The CJS build warning is expected and can be ignored for now
echo.

npx vitest run --reporter=verbose

echo.
echo === Test Summary ===
echo.
echo To run specific tests:
echo   npx vitest run [pattern]
echo.
echo To run with coverage:
echo   npx vitest run --coverage
echo.
echo To run integration tests:
echo   npx vitest run --config vitest.config.integration.ts
echo.
pause
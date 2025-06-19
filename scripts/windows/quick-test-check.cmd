@echo off
echo === QUICK TEST CHECK ===
echo.
echo This will run a quick test to check if everything is working
echo.

echo [1] Environment check...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

echo.
echo [2] Running quick unit test...
npx vitest run --reporter=verbose src/__tests__/basic.test.ts

echo.
echo [3] Checking test file counts...
echo.
echo Unit test files:
dir /s /b src\__tests__\*.test.ts* 2>nul | find /c ".test.ts"
echo.
echo Integration test files:
dir /s /b src\__tests__\integration\*.test.ts 2>nul | find /c ".test.ts"
echo.
echo E2E test files:
dir /s /b tests\e2e\*.spec.ts 2>nul | find /c ".spec.ts"

echo.
echo [4] Quick typecheck...
npx tsc --noEmit --pretty

echo.
echo === Quick Check Complete ===
echo.
echo To run full tests use:
echo - run-vitest-only.cmd (for unit/integration tests)
echo - RUN-E2E-TESTS.cmd (for E2E tests)
echo - run-full-test-suite.cmd (for everything)
echo.
pause
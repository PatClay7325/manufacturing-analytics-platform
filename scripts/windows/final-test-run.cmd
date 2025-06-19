@echo off
echo =====================================================
echo    FINAL TEST RUN - VERIFY COMPLETE POC
echo =====================================================
echo.
echo Your POC is set up! Let's run all tests to confirm.
echo.
pause

echo [1] Running Unit Tests...
echo.
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set NODE_ENV=test

call npx vitest run --config vitest.config.ts --reporter=verbose

echo.
echo [2] Running Integration Tests (on test database)...
echo.
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test

call npx vitest run --config vitest.config.integration.ts --reporter=verbose

echo.
echo [3] Running E2E Tests...
echo.
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

call npx playwright test --reporter=list

echo.
echo =====================================================
echo    TEST SUMMARY
echo =====================================================
echo.
echo Expected Results:
echo - Unit Tests: ~83 passing
echo - Integration Tests: Should pass on clean test DB
echo - E2E Tests: ~88 passing (2 skipped)
echo.
echo To view detailed reports:
echo - E2E Report: npx playwright show-report
echo - Coverage: open coverage/index.html
echo.
pause
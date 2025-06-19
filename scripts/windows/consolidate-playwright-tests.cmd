@echo off
echo Consolidating Playwright tests into a single location...

echo.
echo === Step 1: Create backup of current test structure ===
mkdir playwright-backup 2>nul
xcopy /E /I /Y e2e playwright-backup\e2e 2>nul
xcopy /E /I /Y tests\e2e playwright-backup\tests-e2e 2>nul
xcopy /E /I /Y testing\e2e playwright-backup\testing-e2e 2>nul
copy playwright.config.ts playwright-backup\ 2>nul
copy testing\playwright.config.ts playwright-backup\testing-playwright.config.ts 2>nul
copy playwright-audit-wsl.config.ts playwright-backup\ 2>nul

echo.
echo === Step 2: Ensure tests/e2e directory exists ===
mkdir tests\e2e 2>nul

echo.
echo === Step 3: Copy all unique test files to tests/e2e ===
echo Copying from /e2e/...
copy e2e\*.spec.ts tests\e2e\ 2>nul

echo Copying from /testing/e2e/...
rem Copy only files that don't already exist or are newer
xcopy /Y /D testing\e2e\*.spec.ts tests\e2e\ 2>nul

echo.
echo === Step 4: Remove old test directories ===
echo Removing /e2e/ directory...
rmdir /S /Q e2e 2>nul

echo Removing /testing/e2e/ directory...
rmdir /S /Q testing\e2e 2>nul

echo.
echo === Step 5: Remove extra playwright configs ===
echo Removing testing/playwright.config.ts...
del testing\playwright.config.ts 2>nul

echo Removing playwright-audit-wsl.config.ts...
del playwright-audit-wsl.config.ts 2>nul

echo.
echo === Step 6: List consolidated test files ===
echo Test files now in tests/e2e/:
dir /B tests\e2e\*.spec.ts

echo.
echo === Step 7: Update package.json test scripts if needed ===
echo Please verify that your test scripts in package.json still work correctly.

echo.
echo === Consolidation complete! ===
echo All Playwright tests are now in: tests/e2e/
echo Configuration file: playwright.config.ts (root)
echo Backup created in: playwright-backup/
echo.
echo To run tests: npm run test:e2e
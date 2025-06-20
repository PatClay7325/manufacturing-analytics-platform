@echo off
echo ================================
echo Fixing All Playwright Test IDs
echo ================================

REM Compile and run the TypeScript fix script
echo.
echo Compiling fix script...
npx tsx scripts/fix-playwright-test-ids.ts

echo.
echo Test ID fixes completed!
echo.
echo Next steps:
echo 1. Review the changes made
echo 2. Run: npm run test:e2e
echo.
pause
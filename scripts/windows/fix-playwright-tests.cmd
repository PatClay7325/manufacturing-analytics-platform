@echo off
echo Fixing Playwright tests to conform to Prisma schema...

echo.
echo === Step 1: Fix page titles in test files ===
echo Updating ai-chat.spec.ts...
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace '\/Manufacturing Intelligence Platform\/', '/Adaptive Factory AI Solutions/' | Set-Content tests\e2e\ai-chat.spec.ts"

echo Updating alerts.spec.ts...
powershell -Command "(Get-Content tests\e2e\alerts.spec.ts) -replace '\/Manufacturing Intelligence Platform\/', '/Adaptive Factory AI Solutions/' | Set-Content tests\e2e\alerts.spec.ts"

echo Updating manufacturing-chat.spec.ts...
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace '\/Manufacturing AI Assistant\/', '/Manufacturing AI Assistant.*Adaptive Factory/' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

echo.
echo === Step 2: Update Equipment references to WorkUnit ===
echo This requires manual review as tests reference UI elements
echo Please run: npm run test:e2e to see remaining issues

echo.
echo === Fixes applied! ===
echo Next steps:
echo 1. Review the test failures for missing data-testid attributes
echo 2. Update components to include proper test IDs
echo 3. Ensure all references match the Prisma schema
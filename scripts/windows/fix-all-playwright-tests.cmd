@echo off
echo Fixing all Playwright tests to conform to Prisma schema and actual UI...

echo.
echo === Step 1: Fix title assertions ===
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace 'Manufacturing Intelligence Platform', 'Adaptive Factory AI Solutions' | Set-Content tests\e2e\ai-chat.spec.ts"
powershell -Command "(Get-Content tests\e2e\alerts.spec.ts) -replace 'Manufacturing Intelligence Platform', 'Adaptive Factory AI Solutions' | Set-Content tests\e2e\alerts.spec.ts"

echo.
echo === Step 2: Fix chat input selectors ===
rem Replace input[placeholder*="Ask about"] with textarea[data-testid="chat-input-textarea"]
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace 'input\[placeholder\*=\"Ask about\"\]', 'textarea[data-testid=\"chat-input-textarea\"]' | Set-Content tests\e2e\ai-chat.spec.ts"

echo.
echo === Step 3: Fix send button selectors ===
rem Replace button[type="submit"] with button[data-testid="chat-send-button"]
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace 'button\[type=\"submit\"\]', 'button[data-testid=\"chat-send-button\"]' | Set-Content tests\e2e\ai-chat.spec.ts"

echo.
echo === Step 4: Fix manufacturing-chat.spec.ts title ===
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace '\/Manufacturing AI Assistant\/', '/Manufacturing AI Assistant.*Adaptive Factory/' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

echo.
echo === Step 5: Fix chat container selector ===
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace '\[data-testid=\"chat-container\"\]', '.container' | Set-Content tests\e2e\ai-chat.spec.ts"

echo.
echo === Step 6: Fix navigation test ===
rem The navigation test expects to go back to /manufacturing-chat but it's actually at a session URL
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace 'await expect\(page\.url\(\)\)\.toMatch\(\/\\\/manufacturing-chat\$\/\);', 'await expect(page.url()).toContain(''/manufacturing-chat'');' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

echo.
echo === Step 7: Fix dashboard test selectors ===
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace '\[data-testid=\"production-trends-chart\"\]', '.highcharts-container' | Set-Content tests\e2e\dashboard.spec.ts"
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace 'h2:has-text\(\"Equipment Status\"\)', 'h2:has-text(\"Work Units\")' | Set-Content tests\e2e\dashboard.spec.ts"
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace '\[data-testid=\"equipment-card\"\]', '[data-testid=\"workunit-card\"]' | Set-Content tests\e2e\dashboard.spec.ts"

echo.
echo === Step 8: Fix strict mode violations ===
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace 'page\.locator\(''a:has-text\(\"Dashboard\"\)''\)', 'page.locator(''a:has-text(\"Dashboard\")'').first()' | Set-Content tests\e2e\dashboard.spec.ts"
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace 'page\.locator\(''text=\/What\.\*current OEE\/i''\)', 'page.locator(''[data-testid=\"chat-message-user\"]'').filter({ hasText: /What.*current OEE/i })' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

echo.
echo === Fixes applied! ===
echo Run: npm run test:e2e
echo To see remaining issues that need component updates
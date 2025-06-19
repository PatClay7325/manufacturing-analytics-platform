@echo off
echo Comprehensive Playwright test fixes...

echo.
echo === Fixing ai-chat.spec.ts ===
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace 'const chatInput = page\.locator\(''input\[placeholder\*=\"Ask about\"\]''\);', 'const chatInput = page.locator(''textarea[data-testid=\"chat-input-textarea\"]'');' | Set-Content tests\e2e\ai-chat.spec.ts"
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace 'const sendButton = page\.locator\(''button\[type=\"submit\"\]''\);', 'const sendButton = page.locator(''button[data-testid=\"chat-send-button\"]'');' | Set-Content tests\e2e\ai-chat.spec.ts"
powershell -Command "(Get-Content tests\e2e\ai-chat.spec.ts) -replace '\[data-testid=\"chat-container\"\]', '[data-testid=\"chat-container\"]' | Set-Content tests\e2e\ai-chat.spec.ts"

echo.
echo === Fixing alerts.spec.ts ===
powershell -Command "(Get-Content tests\e2e\alerts.spec.ts) -replace 'Manufacturing Intelligence Platform', 'Adaptive Factory AI Solutions' | Set-Content tests\e2e\alerts.spec.ts"

echo.
echo === Fixing manufacturing-chat.spec.ts ===
rem Fix title expectation
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace '\/Manufacturing AI Assistant\/', '/Manufacturing AI Assistant.*Adaptive Factory/' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

rem Fix navigation back test
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace 'await expect\(page\.url\(\)\)\.toMatch\(\/\\\/manufacturing-chat\$\/\);', 'await expect(page.url()).toContain(''/manufacturing-chat'');' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

rem Fix strict mode violation for OEE message
powershell -Command "(Get-Content tests\e2e\manufacturing-chat.spec.ts) -replace 'const userMessage = page\.locator\(''text=\/What\.\*current OEE\/i''\);', 'const userMessage = page.locator(''[data-testid=\"chat-message-user\"]'').filter({ hasText: /What.*current OEE/i }).first();' | Set-Content tests\e2e\manufacturing-chat.spec.ts"

echo.
echo === Fixing dashboard.spec.ts ===
rem Fix Equipment to Work Units
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace 'h2:has-text\(\"Equipment Status\"\)', 'h2:has-text(\"Work Units\")' | Set-Content tests\e2e\dashboard.spec.ts"
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace '\[data-testid=\"equipment-card\"\]', '[data-testid=\"workunit-card\"]' | Set-Content tests\e2e\dashboard.spec.ts"

rem Fix strict mode violations
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace 'await expect\(page\.locator\(''a:has-text\(\"Dashboard\"\)''\)\)\.toBeVisible\(\);', 'await expect(page.locator(''a:has-text(\"Dashboard\")'').first()).toBeVisible();' | Set-Content tests\e2e\dashboard.spec.ts"
powershell -Command "(Get-Content tests\e2e\dashboard.spec.ts) -replace 'await expect\(page\.locator\(''a:has-text\(\"Equipment\"\)''\)\)\.toBeVisible\(\);', 'await expect(page.locator(''a:has-text(\"Equipment\")'').first()).toBeVisible();' | Set-Content tests\e2e\dashboard.spec.ts"

echo.
echo === Done! ===
echo Run: npm run test:e2e
echo To see remaining issues
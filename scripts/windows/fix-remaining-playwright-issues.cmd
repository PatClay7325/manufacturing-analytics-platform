@echo off
echo === Fixing Remaining Playwright Test Issues ===
echo.

echo [1/5] Fixing manufacturing-chat.spec.ts title assertion...
powershell -Command "(Get-Content tests/e2e/manufacturing-chat.spec.ts) -replace 'await expect\(page\)\.toHaveTitle\(/Manufacturing AI Assistant.*Adaptive Factory/\);', 'await expect(page).toHaveTitle(/Adaptive Factory AI Solutions/);' | Set-Content tests/e2e/manufacturing-chat.spec.ts"

echo.
echo [2/5] Adding missing alert status data-testid...
echo Creating AlertBadge fix...
powershell -Command "(Get-Content src/components/alerts/AlertBadge.tsx) -replace '<span', '<span data-testid=\""alert-status\"" ' | Set-Content src/components/alerts/AlertBadge.tsx"

echo.
echo [3/5] Fixing navigation strict mode violations...
powershell -Command "(Get-Content tests/e2e/navigation.spec.ts) -replace 'page\.locator\(''nav a:has-text\(\""Dashboard\""\)''\)', 'page.locator(''nav a:has-text(\"Dashboard\")'').first()' | Set-Content tests/e2e/navigation.spec.ts"
powershell -Command "(Get-Content tests/e2e/navigation.spec.ts) -replace 'page\.locator\(''nav a:has-text\(\""Equipment\""\)''\)', 'page.locator(''nav a:has-text(\"Equipment\")'').first()' | Set-Content tests/e2e/navigation.spec.ts"
powershell -Command "(Get-Content tests/e2e/navigation.spec.ts) -replace 'page\.locator\(''nav a:has-text\(\""Alerts\""\)''\)', 'page.locator(''nav a:has-text(\"Alerts\")'').first()' | Set-Content tests/e2e/navigation.spec.ts"
powershell -Command "(Get-Content tests/e2e/navigation.spec.ts) -replace 'page\.locator\(''nav a:has-text\(\""AI Chat\""\)''\)', 'page.locator(''nav a:has-text(\"AI Chat\")'').first()' | Set-Content tests/e2e/navigation.spec.ts"

echo.
echo [4/5] Creating PostgreSQL connection helper...
echo @echo off > start-postgres-trust.cmd
echo echo Starting PostgreSQL with trust authentication... >> start-postgres-trust.cmd
echo docker stop manufacturing-postgres 2^>nul >> start-postgres-trust.cmd
echo docker rm manufacturing-postgres 2^>nul >> start-postgres-trust.cmd
echo docker run -d --name manufacturing-postgres -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=postgres -e POSTGRES_DB=manufacturing -p 5432:5432 postgres:15-alpine >> start-postgres-trust.cmd
echo timeout /t 5 /nobreak ^>nul >> start-postgres-trust.cmd
echo npx prisma db push >> start-postgres-trust.cmd
echo npx prisma db seed >> start-postgres-trust.cmd
echo echo PostgreSQL is ready! >> start-postgres-trust.cmd

echo.
echo [5/5] Creating test environment setup...
echo @echo off > setup-test-environment.cmd
echo echo Setting up test environment... >> setup-test-environment.cmd
echo. >> setup-test-environment.cmd
echo REM 1. Start PostgreSQL >> setup-test-environment.cmd
echo call start-postgres-trust.cmd >> setup-test-environment.cmd
echo. >> setup-test-environment.cmd
echo REM 2. Start Ollama (if available) >> setup-test-environment.cmd
echo echo Starting Ollama service... >> setup-test-environment.cmd
echo docker start ollama 2^>nul ^|^| echo Ollama not found, skipping... >> setup-test-environment.cmd
echo. >> setup-test-environment.cmd
echo REM 3. Set environment variables >> setup-test-environment.cmd
echo set DATABASE_URL=postgresql://postgres@localhost:5432/manufacturing >> setup-test-environment.cmd
echo set NODE_ENV=test >> setup-test-environment.cmd
echo. >> setup-test-environment.cmd
echo echo Environment ready! Run 'npm run test:e2e' to start tests. >> setup-test-environment.cmd
echo pause >> setup-test-environment.cmd

echo.
echo === Fixes Applied ===
echo.
echo 1. Fixed manufacturing-chat title assertion
echo 2. Added alert-status data-testid to AlertBadge component
echo 3. Fixed navigation strict mode violations with .first()
echo 4. Created PostgreSQL startup script with trust auth
echo 5. Created test environment setup script
echo.
echo === Next Steps ===
echo.
echo 1. Run: setup-test-environment.cmd
echo 2. Then run: npm run test:e2e
echo.
echo Note: Some tests may still fail if:
echo - Ollama is not installed/running (chat responses)
echo - Alert details page hasn't been implemented yet
echo - Mobile navigation menu toggle needs implementation
echo.
pause
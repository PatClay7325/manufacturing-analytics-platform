@echo off
echo === Running Previously Failed E2E Tests ===
echo.

echo [1] Setting environment variables...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

echo.
echo [2] Running specific failing tests...
echo.

echo Testing Alerts functionality...
npx playwright test tests/e2e/alerts.spec.ts --headed

echo.
echo Testing Navigation functionality...
npx playwright test tests/e2e/navigation.spec.ts --headed

echo.
echo Testing AI Chat functionality...
npx playwright test tests/e2e/ai-chat.spec.ts --headed

echo.
echo === Test Results ===
echo.
echo If tests are still failing, check:
echo 1. Chat API - Ensure Ollama is running or fallback is working
echo 2. Mobile navigation - Menu button visibility on mobile viewport
echo 3. Alert actions - Acknowledge button functionality
echo.
pause
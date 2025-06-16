@echo off
echo Installing test dependencies for Manufacturing Analytics Platform...
echo.

REM Install Vitest and related dependencies
echo Installing Vitest and related dependencies...
call npm install --save-dev vitest jsdom @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react happy-dom

REM Install Playwright
echo.
echo Installing Playwright...
call npm install --save-dev @playwright/test
call npx playwright install

REM Install MSW for API mocking
echo.
echo Installing Mock Service Worker...
call npm install --save-dev msw

echo.
echo Installation complete!
echo Run "npm run test" to run unit tests
echo Run "npm run test:e2e" to run end-to-end tests
echo.
echo For WSL environments, use "CI=true npm run test:e2e" to run E2E tests without browser dependencies
echo.
@echo off
echo Installing Vitest and testing dependencies...
npm install -D vitest @vitest/ui c8 @vitest/coverage-c8 happy-dom @testing-library/react @testing-library/jest-dom

echo Installing Playwright...
npm install -D @playwright/test

echo Setting up test configurations...

echo Creating Vitest configuration...
echo import { defineConfig } from 'vitest/config';
echo import react from '@vitejs/plugin-react';
echo import path from 'path';
echo.
echo export default defineConfig({
echo   plugins: [react()],
echo   test: {
echo     environment: 'happy-dom',
echo     coverage: {
echo       provider: 'c8',
echo       reporter: ['text', 'json', 'html'],
echo     },
echo     globals: true,
echo     setupFiles: ['./vitest.setup.ts'],
echo   },
echo   resolve: {
echo     alias: {
echo       '@': path.resolve(__dirname, './src'),
echo     },
echo   },
echo });
echo. > vitest.config.ts

echo Creating Vitest setup file...
echo import '@testing-library/jest-dom';
echo. > vitest.setup.ts

echo Adding test scripts to package.json...
npx json -I -f package.json -e "this.scripts.test = 'vitest'"
npx json -I -f package.json -e "this.scripts['test:ui'] = 'vitest --ui'"
npx json -I -f package.json -e "this.scripts['test:coverage'] = 'vitest run --coverage'"
npx json -I -f package.json -e "this.scripts['test:e2e'] = 'playwright test'"

echo.
echo Installing @vitejs/plugin-react for JSX support in tests...
npm install -D @vitejs/plugin-react

echo.
echo Setup complete! You can now run tests with:
echo - npm test           (Run Vitest tests)
echo - npm run test:ui    (Run Vitest with UI)
echo - npm run test:coverage (Run tests with coverage)
echo - npx playwright install (Install Playwright browsers)
echo - npm run test:e2e   (Run Playwright E2E tests)
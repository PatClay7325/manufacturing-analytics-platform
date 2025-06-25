@echo off
echo ===============================================
echo QUICK PAGE VALIDATION TEST
echo Testing all pages are accessible and load correctly
echo ===============================================
echo.

:: Start server if not running
echo Starting development server...
start /B cmd /c "npm run dev > server.log 2>&1"
timeout /t 10 /nobreak >nul

echo.
echo Running quick page validation tests...
echo ===============================================

:: Create a simple page validation test
echo Creating page validation test...
(
echo import { test, expect } from '@playwright/test';
echo.
echo const pages = [
echo   { path: '/', title: 'Manufacturing Analytics' },
echo   { path: '/login', title: 'Login' },
echo   { path: '/register', title: 'Register' },
echo   { path: '/dashboards', title: 'Dashboards' },
echo   { path: '/dashboard', title: 'Dashboard' },
echo   { path: '/alerts', title: 'Alerts' },
echo   { path: '/equipment', title: 'Equipment' },
echo   { path: '/ai-chat', title: 'AI Chat' },
echo   { path: '/manufacturing-chat', title: 'Manufacturing' },
echo   { path: '/monitoring', title: 'Monitoring' },
echo   { path: '/analytics-demo', title: 'Analytics' },
echo   { path: '/explore', title: 'Explore' },
echo   { path: '/teams', title: 'Teams' },
echo   { path: '/users', title: 'Users' },
echo   { path: '/profile', title: 'Profile' },
echo   { path: '/status', title: 'Status' },
echo   { path: '/support', title: 'Support' },
echo   { path: '/org', title: 'Organization' },
echo   { path: '/datasources', title: 'Data Sources' },
echo   { path: '/plugins', title: 'Plugins' },
echo   { path: '/admin/general', title: 'Admin' },
echo   { path: '/playlists', title: 'Playlists' },
echo ];
echo.
echo test.describe('Page Accessibility Tests', () =^> {
echo   pages.forEach(({ path, title }) =^> {
echo     test(`should load ${path}`, async ({ page }) =^> {
echo       // Navigate to page
echo       const response = await page.goto(`http://localhost:3000${path}`^);
echo       
echo       // Check response status
echo       expect(response?.status(^)^).toBeLessThan(400^);
echo       
echo       // Wait for page to load
echo       await page.waitForLoadState('networkidle'^);
echo       
echo       // Check page has content
echo       const bodyText = await page.textContent('body'^);
echo       expect(bodyText^).toBeTruthy(^);
echo       
echo       // Take screenshot for visual validation
echo       await page.screenshot({ 
echo         path: `playwright-results/page-${path.replace(/\//g, '-'^)}.png`,
echo         fullPage: true 
echo       }^);
echo       
echo       console.log(`✓ ${path} loaded successfully`^);
echo     }^);
echo   }^);
echo }^);
) > tests/e2e/page-validation.spec.ts

:: Run the validation test
call npx playwright test tests/e2e/page-validation.spec.ts --reporter=list --timeout=60000

:: Clean up
del tests\e2e\page-validation.spec.ts

echo.
echo ===============================================
echo Page validation completed!
echo Screenshots saved to: playwright-results/
echo ===============================================
echo.

:: Stop server
taskkill /F /IM node.exe >nul 2>&1

pause
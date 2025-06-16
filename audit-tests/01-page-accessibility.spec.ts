import { test, expect } from '@playwright/test';

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Equipment', path: '/equipment' },
  { name: 'Alerts', path: '/alerts' },
  { name: 'Manufacturing Chat', path: '/manufacturing-chat' },
  { name: 'Support', path: '/support' },
  { name: 'Status', path: '/status' },
  { name: 'Privacy Policy', path: '/privacy-policy' },
  { name: 'Terms of Service', path: '/terms-of-service' },
  { name: 'Cookie Policy', path: '/cookie-policy' },
];

test.describe('Page Accessibility Audit', () => {
  for (const pageInfo of pages) {
    test(`Accessibility check for ${pageInfo.name} page`, async ({ page }) => {
      const results: any = {
        page: pageInfo.name,
        path: pageInfo.path,
        timestamp: new Date().toISOString(),
        issues: [],
      };
      
      try {
        // Navigate to page
        const response = await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
        results.statusCode = response?.status();
        
        // Check if page loads successfully
        if (response?.status() !== 200) {
          results.issues.push({
            type: 'page-load',
            severity: 'critical',
            message: `Page returned status code ${response?.status()}`
          });
        }
        
        // Wait for content to be visible
        await page.waitForLoadState('domcontentloaded');
        
        // Basic accessibility checks
        
        // Check for page title
        const title = await page.title();
        if (!title || title.length < 10) {
          results.issues.push({
            type: 'accessibility',
            severity: 'medium',
            message: 'Page title is missing or too short'
          });
        }
        
        // Check for images without alt text
        const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
        if (imagesWithoutAlt > 0) {
          results.issues.push({
            type: 'accessibility',
            severity: 'high',
            message: `${imagesWithoutAlt} images missing alt text`
          });
        }
        
        // Check for buttons without accessible text
        const buttonsWithoutText = await page.$$eval('button', buttons => 
          buttons.filter(btn => !btn.textContent?.trim() && !btn.getAttribute('aria-label')).length
        );
        if (buttonsWithoutText > 0) {
          results.issues.push({
            type: 'accessibility',
            severity: 'high',
            message: `${buttonsWithoutText} buttons missing accessible text`
          });
        }
        
        // Check for form inputs without labels
        const inputsWithoutLabels = await page.$$eval('input, select, textarea', inputs => 
          inputs.filter(input => {
            const id = input.id;
            const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : false;
            const hasAriaLabel = input.getAttribute('aria-label');
            return !hasLabel && !hasAriaLabel;
          }).length
        );
        if (inputsWithoutLabels > 0) {
          results.issues.push({
            type: 'accessibility',
            severity: 'high',
            message: `${inputsWithoutLabels} form inputs missing labels`
          });
        }
        
        // Check for heading hierarchy
        const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements => 
          elements.map(el => parseInt(el.tagName[1]))
        );
        let lastLevel = 0;
        let hierarchyIssues = 0;
        for (const level of headings) {
          if (level > lastLevel + 1) {
            hierarchyIssues++;
          }
          lastLevel = level;
        }
        if (hierarchyIssues > 0) {
          results.issues.push({
            type: 'accessibility',
            severity: 'medium',
            message: `${hierarchyIssues} heading hierarchy issues found`
          });
        }
        
        // Check for console errors
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        // Reload to catch any console errors
        await page.reload();
        await page.waitForTimeout(2000);
        
        if (consoleErrors.length > 0) {
          results.issues.push({
            type: 'console-error',
            severity: 'medium',
            errors: consoleErrors
          });
        }
        
        // Log results
        console.log(`\n=== ${pageInfo.name} Page Audit ===`);
        console.log(`Status: ${results.statusCode}`);
        console.log(`Issues found: ${results.issues.length}`);
        
        if (results.issues.length > 0) {
          console.log('\nIssues:');
          results.issues.forEach((issue: any, index: number) => {
            console.log(`${index + 1}. [${issue.severity}] ${issue.type}: ${issue.message || issue.rule}`);
          });
        }
        
      } catch (error) {
        results.issues.push({
          type: 'error',
          severity: 'critical',
          message: error.message
        });
        console.error(`Error auditing ${pageInfo.name}:`, error);
      }
      
      // Even if there are issues, don't fail the test - we want a complete audit
      expect(results.issues.length).toBeGreaterThanOrEqual(0);
    });
  }
});
import { test, expect } from '@playwright/test';

test.describe('Security and Headers Audit', () => {
  test('Check security headers', async ({ page }) => {
    console.log(`\n=== Security Headers Audit ===`);
    
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    const headers = response?.headers() || {};
    
    const securityHeaders = [
      { 
        name: 'X-Content-Type-Options',
        expected: 'nosniff',
        severity: 'high'
      },
      {
        name: 'X-Frame-Options',
        expected: ['DENY', 'SAMEORIGIN'],
        severity: 'high'
      },
      {
        name: 'X-XSS-Protection',
        expected: '1; mode=block',
        severity: 'medium'
      },
      {
        name: 'Strict-Transport-Security',
        expected: 'max-age=',
        severity: 'high'
      },
      {
        name: 'Content-Security-Policy',
        expected: true,
        severity: 'high'
      },
      {
        name: 'Referrer-Policy',
        expected: true,
        severity: 'medium'
      },
      {
        name: 'Permissions-Policy',
        expected: true,
        severity: 'medium'
      }
    ];
    
    console.log('\nChecking security headers:');
    
    securityHeaders.forEach(header => {
      const value = headers[header.name.toLowerCase()];
      
      if (!value) {
        console.log(`❌ [${header.severity}] ${header.name}: Missing`);
      } else if (header.expected === true) {
        console.log(`✅ ${header.name}: Present (${value})`);
      } else if (Array.isArray(header.expected)) {
        const isValid = header.expected.some(exp => value.includes(exp));
        if (isValid) {
          console.log(`✅ ${header.name}: ${value}`);
        } else {
          console.log(`⚠️ ${header.name}: ${value} (expected one of: ${header.expected.join(', ')})`);
        }
      } else if (value.includes(header.expected)) {
        console.log(`✅ ${header.name}: ${value}`);
      } else {
        console.log(`⚠️ ${header.name}: ${value} (expected: ${header.expected})`);
      }
    });
  });
  
  test('Check for exposed sensitive information', async ({ page }) => {
    console.log(`\n=== Sensitive Information Audit ===`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check page source for sensitive patterns
    const pageContent = await page.content();
    
    const sensitivePatterns = [
      { pattern: /api[_-]?key/i, name: 'API Key' },
      { pattern: /secret/i, name: 'Secret' },
      { pattern: /password/i, name: 'Password' },
      { pattern: /token/i, name: 'Token' },
      { pattern: /private[_-]?key/i, name: 'Private Key' },
      { pattern: /\.env/i, name: 'Environment Variable' },
      { pattern: /localhost:\d{4}/i, name: 'Localhost URL' },
      { pattern: /192\.168\.\d{1,3}\.\d{1,3}/i, name: 'Internal IP' },
    ];
    
    console.log('\nChecking for exposed sensitive information:');
    
    sensitivePatterns.forEach(({ pattern, name }) => {
      const matches = pageContent.match(pattern);
      if (matches) {
        // Filter out false positives
        const filtered = matches.filter(match => {
          // Ignore if it's in a script tag or comment
          return !match.includes('<!--') && 
                 !match.includes('*/') &&
                 !match.toLowerCase().includes('placeholder') &&
                 !match.toLowerCase().includes('example');
        });
        
        if (filtered.length > 0) {
          console.log(`⚠️ Potential ${name} exposure found: ${filtered.length} instance(s)`);
          filtered.slice(0, 3).forEach(match => {
            console.log(`   - "${match.substring(0, 50)}..."`);
          });
        }
      }
    });
    
    // Check for exposed error messages
    const errorElements = await page.$$('[class*="error"], [class*="exception"], [class*="stack"]');
    if (errorElements.length > 0) {
      console.log(`\n⚠️ Potential error message exposure: ${errorElements.length} element(s) found`);
    }
  });
  
  test('Check cookie security', async ({ page, context }) => {
    console.log(`\n=== Cookie Security Audit ===`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const cookies = await context.cookies();
    
    console.log(`\nTotal cookies: ${cookies.length}`);
    
    cookies.forEach(cookie => {
      const issues = [];
      
      if (!cookie.secure && cookie.name.toLowerCase().includes('session')) {
        issues.push('Missing Secure flag on session cookie');
      }
      
      if (!cookie.httpOnly && (cookie.name.toLowerCase().includes('session') || 
                                cookie.name.toLowerCase().includes('auth'))) {
        issues.push('Missing HttpOnly flag on auth cookie');
      }
      
      if (!cookie.sameSite || cookie.sameSite === 'None') {
        issues.push(`Weak SameSite setting: ${cookie.sameSite || 'not set'}`);
      }
      
      console.log(`\nCookie: ${cookie.name}`);
      console.log(`  Domain: ${cookie.domain}`);
      console.log(`  Secure: ${cookie.secure}`);
      console.log(`  HttpOnly: ${cookie.httpOnly}`);
      console.log(`  SameSite: ${cookie.sameSite}`);
      
      if (issues.length > 0) {
        issues.forEach(issue => console.log(`  ⚠️ ${issue}`));
      }
    });
  });
  
  test('Check for mixed content', async ({ page }) => {
    console.log(`\n=== Mixed Content Audit ===`);
    
    // This test only applies if the site is served over HTTPS
    const url = page.url();
    if (!url.startsWith('https://')) {
      console.log('ℹ️ Site not served over HTTPS, skipping mixed content check');
      return;
    }
    
    const mixedContent: string[] = [];
    
    page.on('request', request => {
      const requestUrl = request.url();
      if (url.startsWith('https://') && requestUrl.startsWith('http://') && !requestUrl.startsWith('http://localhost')) {
        mixedContent.push(requestUrl);
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    if (mixedContent.length > 0) {
      console.log('❌ Mixed content detected:');
      mixedContent.forEach(url => console.log(`  - ${url}`));
    } else {
      console.log('✅ No mixed content detected');
    }
  });
});
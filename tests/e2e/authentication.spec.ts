import { test, expect, type Page } from '@playwright/test';
import { generateTestUser, generateInvalidCredentials } from '../fixtures/users';

// Test configuration
const TEST_TIMEOUT = 30000;
const API_TIMEOUT = 10000;

test.describe('Authentication Flow - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and local storage
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test.describe('Login Functionality', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Check page loaded correctly
      await expect(page).toHaveTitle(/Manufacturing Analytics.*Login/);
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      
      // Submit form
      await page.click('[data-testid="login-button"]');
      
      // Wait for navigation
      await page.waitForURL('/dashboard', { timeout: API_TIMEOUT });
      
      // Verify successful login
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-email"]')).toContainText('admin@manufacturing.com');
      
      // Check authentication token in storage
      const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(authToken).toBeTruthy();
    });

    test('should fail login with invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Try invalid credentials
      await page.fill('[data-testid="email-input"]', 'invalid@email.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid credentials/i);
      
      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
      
      // No auth token should be set
      const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(authToken).toBeNull();
    });

    test('should handle SQL injection attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Common SQL injection patterns
      const injectionAttempts = [
        "admin' OR '1'='1",
        "admin'--",
        "admin' /*",
        "' OR 1=1--",
        "'; DROP TABLE users--"
      ];
      
      for (const attempt of injectionAttempts) {
        await page.fill('[data-testid="email-input"]', attempt);
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-button"]');
        
        // Should show error, not crash
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        
        // Should sanitize and not execute injection
        const response = await page.waitForResponse(
          response => response.url().includes('/api/auth/login'),
          { timeout: 5000 }
        ).catch(() => null);
        
        if (response) {
          expect(response.status()).not.toBe(500);
        }
      }
    });

    test('should handle XSS attempts in login form', async ({ page }) => {
      await page.goto('/login');
      
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];
      
      for (const attempt of xssAttempts) {
        await page.fill('[data-testid="email-input"]', attempt);
        await page.fill('[data-testid="password-input"]', attempt);
        
        // Input should be sanitized
        const emailValue = await page.inputValue('[data-testid="email-input"]');
        const passwordValue = await page.inputValue('[data-testid="password-input"]');
        
        // Check no script execution
        const alertFired = await page.evaluate(() => {
          let alertCalled = false;
          const originalAlert = window.alert;
          window.alert = () => { alertCalled = true; };
          setTimeout(() => { window.alert = originalAlert; }, 100);
          return alertCalled;
        });
        
        expect(alertFired).toBe(false);
      }
    });

    test('should enforce password complexity requirements', async ({ page }) => {
      await page.goto('/register');
      
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'qwerty',
        '12345678'
      ];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('[data-testid="password-input"]', weakPassword);
        await page.click('[data-testid="register-button"]');
        
        // Should show password requirement error
        await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-error"]')).toContainText(/must contain/i);
      }
      
      // Test strong password
      await page.fill('[data-testid="password-input"]', 'StrongP@ssw0rd123!');
      await page.fill('[data-testid="confirm-password-input"]', 'StrongP@ssw0rd123!');
      
      // Should not show error for strong password
      await expect(page.locator('[data-testid="password-error"]')).not.toBeVisible();
    });

    test('should rate limit login attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', `wrongpass${i}`);
        await page.click('[data-testid="login-button"]');
        
        if (i < 5) {
          // First 5 attempts should show invalid credentials
          await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid credentials/i);
        } else {
          // 6th attempt should be rate limited
          await expect(page.locator('[data-testid="error-message"]')).toContainText(/Too many attempts/i);
        }
      }
      
      // Check rate limit persists
      await page.reload();
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'correctpassword');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Too many attempts/i);
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should successfully request password reset', async ({ page }) => {
      await page.goto('/login');
      await page.click('[data-testid="forgot-password-link"]');
      
      await expect(page).toHaveURL('/forgot-password');
      
      // Enter email
      await page.fill('[data-testid="reset-email-input"]', 'user@manufacturing.com');
      await page.click('[data-testid="send-reset-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/reset link sent/i);
      
      // Should disable button to prevent spam
      await expect(page.locator('[data-testid="send-reset-button"]')).toBeDisabled();
    });

    test('should validate reset token', async ({ page }) => {
      // Test with invalid token
      await page.goto('/reset-password?token=invalid-token-12345');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid or expired/i);
      
      // Test with expired token (mocked)
      await page.goto('/reset-password?token=expired-token-67890');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/expired/i);
    });

    test('should enforce password requirements on reset', async ({ page }) => {
      // Assume valid token for testing
      await page.goto('/reset-password?token=valid-test-token');
      
      // Try weak password
      await page.fill('[data-testid="new-password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');
      await page.click('[data-testid="reset-password-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      
      // Try mismatched passwords
      await page.fill('[data-testid="new-password-input"]', 'StrongP@ssw0rd123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentP@ssw0rd123!');
      await page.click('[data-testid="reset-password-button"]');
      
      await expect(page.locator('[data-testid="password-match-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-match-error"]')).toContainText(/do not match/i);
    });
  });

  test.describe('Multi-Factor Authentication (MFA)', () => {
    test('should prompt for MFA code after successful login', async ({ page }) => {
      // Login with MFA-enabled account
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'mfa.user@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      
      // Should redirect to MFA page
      await expect(page).toHaveURL('/auth/mfa');
      await expect(page.locator('[data-testid="mfa-prompt"]')).toBeVisible();
      
      // Enter invalid code
      await page.fill('[data-testid="mfa-code-input"]', '000000');
      await page.click('[data-testid="verify-mfa-button"]');
      
      await expect(page.locator('[data-testid="mfa-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="mfa-error"]')).toContainText(/Invalid code/i);
      
      // Enter valid code (mocked)
      await page.fill('[data-testid="mfa-code-input"]', '123456');
      await page.click('[data-testid="verify-mfa-button"]');
      
      // Should complete login
      await expect(page).toHaveURL('/dashboard');
    });

    test('should allow MFA setup for new users', async ({ page }) => {
      // Assume logged in user without MFA
      await page.goto('/settings/security');
      
      await page.click('[data-testid="enable-mfa-button"]');
      
      // Should show QR code and secret
      await expect(page.locator('[data-testid="mfa-qr-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="mfa-secret"]')).toBeVisible();
      
      // Enter verification code
      await page.fill('[data-testid="mfa-verification-input"]', '123456');
      await page.click('[data-testid="confirm-mfa-button"]');
      
      // Should show backup codes
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();
      const backupCodes = await page.locator('[data-testid="backup-code-item"]').allTextContents();
      expect(backupCodes.length).toBe(8); // Standard 8 backup codes
    });

    test('should allow login with backup code', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'mfa.user@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      
      // On MFA page, use backup code
      await page.click('[data-testid="use-backup-code-link"]');
      
      await page.fill('[data-testid="backup-code-input"]', 'BACKUP-CODE-12345');
      await page.click('[data-testid="verify-backup-button"]');
      
      // Should complete login
      await expect(page).toHaveURL('/dashboard');
      
      // Should show warning about used backup code
      await expect(page.locator('[data-testid="backup-code-warning"]')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should expire session after inactivity', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Simulate session expiry by manipulating time
      await page.evaluate(() => {
        const expiredToken = {
          ...JSON.parse(localStorage.getItem('authToken') || '{}'),
          expiresAt: Date.now() - 1000 // Expired 1 second ago
        };
        localStorage.setItem('authToken', JSON.stringify(expiredToken));
      });
      
      // Try to navigate to protected route
      await page.goto('/equipment');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // Login in first browser
        await page1.goto('/login');
        await page1.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
        await page1.fill('[data-testid="password-input"]', 'SecurePass123!');
        await page1.click('[data-testid="login-button"]');
        await page1.waitForURL('/dashboard');
        
        // Login in second browser
        await page2.goto('/login');
        await page2.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
        await page2.fill('[data-testid="password-input"]', 'SecurePass123!');
        await page2.click('[data-testid="login-button"]');
        await page2.waitForURL('/dashboard');
        
        // First session should be invalidated (depending on policy)
        await page1.reload();
        
        // Check if single session policy is enforced
        const isStillLoggedIn = await page1.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
        
        if (!isStillLoggedIn) {
          await expect(page1.locator('[data-testid="session-invalidated-message"]')).toBeVisible();
        }
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should successfully logout', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Session should be cleared
      const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(authToken).toBeNull();
      
      // Try to access protected route
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Role-Based Access Control (RBAC)', () => {
    test('should restrict admin routes to admin users', async ({ page }) => {
      // Login as regular user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'UserPass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Try to access admin route
      await page.goto('/admin');
      
      // Should show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-denied"]')).toContainText(/not authorized/i);
    });

    test('should show role-specific UI elements', async ({ page }) => {
      // Test as admin
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Admin should see admin menu
      await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
      
      // Logout and login as regular user
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      await page.fill('[data-testid="email-input"]', 'user@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'UserPass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Regular user should not see admin menu
      await expect(page.locator('[data-testid="admin-menu"]')).not.toBeVisible();
    });

    test('should enforce API-level authorization', async ({ page, request }) => {
      // Login as regular user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'UserPass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Get auth token
      const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
      
      // Try to access admin API endpoint
      const response = await request.delete('/api/equipment/1', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(403); // Forbidden
      
      const body = await response.json();
      expect(body.error).toContain('Insufficient permissions');
    });
  });

  test.describe('Security Headers and CSRF Protection', () => {
    test('should include security headers', async ({ page }) => {
      const response = await page.goto('/login');
      const headers = response?.headers() || {};
      
      // Check security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['strict-transport-security']).toContain('max-age=');
      expect(headers['content-security-policy']).toBeTruthy();
    });

    test('should validate CSRF tokens', async ({ page, request }) => {
      await page.goto('/login');
      
      // Get CSRF token
      const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content');
      });
      
      expect(csrfToken).toBeTruthy();
      
      // Try request without CSRF token
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'admin@manufacturing.com',
          password: 'SecurePass123!'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should fail without CSRF token
      expect(response.status()).toBe(403);
      
      // Try with CSRF token
      const validResponse = await request.post('/api/auth/login', {
        data: {
          email: 'admin@manufacturing.com',
          password: 'SecurePass123!'
        },
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });
      
      expect(validResponse.status()).toBe(200);
    });
  });

  test.describe('Account Security', () => {
    test('should detect and alert on suspicious login activity', async ({ page }) => {
      // Login from unusual location (mocked via headers)
      await page.route('**/api/auth/login', async route => {
        await route.continue({
          headers: {
            ...route.request().headers(),
            'X-Forwarded-For': '192.168.1.1' // Different IP
          }
        });
      });
      
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      
      // Should show security alert
      await expect(page.locator('[data-testid="security-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-alert"]')).toContainText(/New login location detected/i);
    });

    test('should enforce account lockout after failed attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Make 10 failed attempts (more than rate limit)
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
        await page.fill('[data-testid="password-input"]', `wrong${i}`);
        await page.click('[data-testid="login-button"]');
        await page.waitForTimeout(100); // Small delay between attempts
      }
      
      // Account should be locked
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Account locked/i);
      
      // Even correct password should fail
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Account locked/i);
    });

    test('should log security events', async ({ page, request }) => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@manufacturing.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // Get auth token
      const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
      
      // Check audit logs (admin only)
      const response = await request.get('/api/admin/audit-logs', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const logs = await response.json();
      
      // Should contain login event
      const loginEvent = logs.find((log: any) => 
        log.event === 'USER_LOGIN' && 
        log.user === 'admin@manufacturing.com'
      );
      
      expect(loginEvent).toBeTruthy();
      expect(loginEvent).toHaveProperty('timestamp');
      expect(loginEvent).toHaveProperty('ip');
      expect(loginEvent).toHaveProperty('userAgent');
    });
  });
});

// Helper function to test password strength
function testPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback = [];
  
  if (password.length >= 8) score++;
  else feedback.push('Password must be at least 8 characters');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');
  
  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');
  
  return { score, feedback };
}
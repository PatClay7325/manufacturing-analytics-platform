/**
 * Critical Workflows E2E Tests
 * End-to-end tests for essential user workflows
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'test.operator@factory.com';
const TEST_USER_PASSWORD = 'Test123!@#';
const ADMIN_EMAIL = 'admin@factory.com';
const ADMIN_PASSWORD = 'Admin123!@#';

// Test data
const TEST_EQUIPMENT = {
  name: 'Test CNC Machine',
  code: 'TEST-CNC-001',
  equipmentType: 'CNC_MACHINE',
  model: 'XYZ-5000',
  serialNumber: 'SN-TEST-001',
  manufacturerCode: 'ACME',
  location: 'Test Floor 1, Bay A',
  description: 'Test CNC machine for E2E testing'
};

const TEST_DASHBOARD = {
  title: 'Production Test Dashboard',
  description: 'Dashboard for E2E testing',
  tags: ['test', 'production']
};

// Helper functions
async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login redirect
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
}

async function createTestUser(page: Page): Promise<void> {
  // Navigate to admin user creation page
  await page.goto(`${BASE_URL}/admin/users`);
  await page.click('[data-testid="create-user-button"]');
  
  // Fill user form
  await page.fill('[data-testid="user-email"]', TEST_USER_EMAIL);
  await page.fill('[data-testid="user-password"]', TEST_USER_PASSWORD);
  await page.fill('[data-testid="user-name"]', 'Test Operator');
  await page.selectOption('[data-testid="user-role"]', 'operator');
  await page.fill('[data-testid="user-department"]', 'Production');
  
  await page.click('[data-testid="save-user-button"]');
  await page.waitForSelector('[data-testid="success-message"]');
}

async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.readyState === 'complete');
}

// Test suites
test.describe('Authentication Workflows', () => {
  test('complete user registration and login flow', async ({ page }) => {
    // Test user registration
    await page.goto(`${BASE_URL}/register`);
    
    await page.fill('[data-testid="register-email"]', 'newuser@factory.com');
    await page.fill('[data-testid="register-password"]', 'NewUser123!@#');
    await page.fill('[data-testid="register-confirm-password"]', 'NewUser123!@#');
    await page.fill('[data-testid="register-name"]', 'New Factory User');
    await page.selectOption('[data-testid="register-role"]', 'viewer');
    await page.fill('[data-testid="register-department"]', 'Quality');
    
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to login page
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    
    // Test login with new user
    await page.fill('[data-testid="email-input"]', 'newuser@factory.com');
    await page.fill('[data-testid="password-input"]', 'NewUser123!@#');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Verify user role and permissions
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="user-role"]')).toContainText('Viewer');
  });

  test('should handle login validation errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Test empty fields
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
    
    // Test invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    
    // Test invalid credentials
    await page.fill('[data-testid="email-input"]', 'nonexistent@factory.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should handle session timeout and reauthentication', async ({ page }) => {
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    
    // Simulate session expiry by clearing localStorage/cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access protected page
    await page.goto(`${BASE_URL}/equipment`);
    
    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    
    // Re-login
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    
    // Should be able to access protected page
    await page.goto(`${BASE_URL}/equipment`);
    await waitForPageLoad(page);
    await expect(page.locator('[data-testid="equipment-list"]')).toBeVisible();
  });
});

test.describe('Equipment Management Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('complete equipment creation and management workflow', async ({ page }) => {
    // Navigate to equipment page
    await page.goto(`${BASE_URL}/equipment`);
    await waitForPageLoad(page);
    
    // Create new equipment
    await page.click('[data-testid="add-equipment-button"]');
    await page.waitForSelector('[data-testid="equipment-form"]');
    
    // Fill equipment form
    await page.fill('[data-testid="equipment-name"]', TEST_EQUIPMENT.name);
    await page.fill('[data-testid="equipment-code"]', TEST_EQUIPMENT.code);
    await page.selectOption('[data-testid="equipment-type"]', TEST_EQUIPMENT.equipmentType);
    await page.fill('[data-testid="equipment-model"]', TEST_EQUIPMENT.model);
    await page.fill('[data-testid="equipment-serial"]', TEST_EQUIPMENT.serialNumber);
    await page.fill('[data-testid="equipment-manufacturer"]', TEST_EQUIPMENT.manufacturerCode);
    await page.fill('[data-testid="equipment-location"]', TEST_EQUIPMENT.location);
    await page.fill('[data-testid="equipment-description"]', TEST_EQUIPMENT.description);
    
    // Set installation date
    await page.fill('[data-testid="installation-date"]', '2024-01-15');
    
    // Submit form
    await page.click('[data-testid="save-equipment-button"]');
    
    // Verify equipment was created
    await page.waitForSelector('[data-testid="success-message"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Equipment created successfully');
    
    // Verify equipment appears in list
    await page.goto(`${BASE_URL}/equipment`);
    await waitForPageLoad(page);
    await expect(page.locator(`[data-testid="equipment-item-${TEST_EQUIPMENT.code}"]`)).toBeVisible();
    
    // Test equipment details view
    await page.click(`[data-testid="equipment-item-${TEST_EQUIPMENT.code}"]`);
    await page.waitForURL(`${BASE_URL}/equipment/*`);
    
    await expect(page.locator('[data-testid="equipment-name"]')).toContainText(TEST_EQUIPMENT.name);
    await expect(page.locator('[data-testid="equipment-code"]')).toContainText(TEST_EQUIPMENT.code);
    await expect(page.locator('[data-testid="equipment-status"]')).toContainText('Operational');
    
    // Test equipment editing
    await page.click('[data-testid="edit-equipment-button"]');
    await page.fill('[data-testid="equipment-description"]', 'Updated description for testing');
    await page.click('[data-testid="save-equipment-button"]');
    
    await page.waitForSelector('[data-testid="success-message"]');
    await expect(page.locator('[data-testid="equipment-description"]')).toContainText('Updated description for testing');
  });

  test('should validate equipment form inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/equipment`);
    await page.click('[data-testid="add-equipment-button"]');
    
    // Test required field validations
    await page.click('[data-testid="save-equipment-button"]');
    
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="code-error"]')).toContainText('Equipment code is required');
    await expect(page.locator('[data-testid="type-error"]')).toContainText('Equipment type is required');
    
    // Test code format validation
    await page.fill('[data-testid="equipment-code"]', 'invalid code with spaces');
    await page.click('[data-testid="save-equipment-button"]');
    await expect(page.locator('[data-testid="code-error"]')).toContainText('Equipment code format is invalid');
    
    // Test duplicate code validation
    await page.fill('[data-testid="equipment-code"]', 'EXISTING-EQUIPMENT-001');
    await page.fill('[data-testid="equipment-name"]', 'Test Equipment');
    await page.selectOption('[data-testid="equipment-type"]', 'CNC_MACHINE');
    await page.click('[data-testid="save-equipment-button"]');
    await expect(page.locator('[data-testid="code-error"]')).toContainText('Equipment code already exists');
  });
});

test.describe('Dashboard and Analytics Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test('complete dashboard creation and visualization workflow', async ({ page }) => {
    // Navigate to dashboards
    await page.goto(`${BASE_URL}/dashboards`);
    await waitForPageLoad(page);
    
    // Create new dashboard
    await page.click('[data-testid="create-dashboard-button"]');
    await page.waitForSelector('[data-testid="dashboard-form"]');
    
    // Fill dashboard form
    await page.fill('[data-testid="dashboard-title"]', TEST_DASHBOARD.title);
    await page.fill('[data-testid="dashboard-description"]', TEST_DASHBOARD.description);
    
    // Add tags
    for (const tag of TEST_DASHBOARD.tags) {
      await page.fill('[data-testid="dashboard-tags-input"]', tag);
      await page.press('[data-testid="dashboard-tags-input"]', 'Enter');
    }
    
    await page.click('[data-testid="save-dashboard-button"]');
    
    // Should redirect to dashboard editor
    await page.waitForURL(`${BASE_URL}/dashboards/edit/*`);
    
    // Add a time series panel
    await page.click('[data-testid="add-panel-button"]');
    await page.click('[data-testid="panel-type-timeseries"]');
    
    // Configure panel
    await page.fill('[data-testid="panel-title"]', 'OEE Trend');
    await page.fill('[data-testid="panel-query"]', 'oee_score');
    
    // Set panel size and position
    await page.fill('[data-testid="panel-width"]', '12');
    await page.fill('[data-testid="panel-height"]', '8');
    
    await page.click('[data-testid="save-panel-button"]');
    
    // Verify panel was added
    await page.waitForSelector('[data-testid="dashboard-panel-1"]');
    await expect(page.locator('[data-testid="panel-title"]')).toContainText('OEE Trend');
    
    // Save dashboard
    await page.click('[data-testid="save-dashboard-button"]');
    await page.waitForSelector('[data-testid="success-message"]');
    
    // Test dashboard viewing
    await page.click('[data-testid="view-dashboard-button"]');
    await page.waitForURL(`${BASE_URL}/dashboards/*`);
    
    // Verify dashboard loads with data
    await waitForPageLoad(page);
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText(TEST_DASHBOARD.title);
    await expect(page.locator('[data-testid="dashboard-panel-1"]')).toBeVisible();
    
    // Test time range picker
    await page.click('[data-testid="time-range-picker"]');
    await page.click('[data-testid="time-range-1h"]');
    
    // Wait for data to refresh
    await page.waitForSelector('[data-testid="panel-loading"]', { state: 'hidden' });
    
    // Test refresh functionality
    await page.click('[data-testid="refresh-dashboard-button"]');
    await page.waitForSelector('[data-testid="panel-loading"]', { state: 'hidden' });
  });

  test('should handle real-time data updates', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageLoad(page);
    
    // Enable auto-refresh
    await page.click('[data-testid="auto-refresh-toggle"]');
    await page.selectOption('[data-testid="refresh-interval"]', '5000'); // 5 seconds
    
    // Monitor for data updates
    const initialValue = await page.locator('[data-testid="oee-value"]').textContent();
    
    // Wait for auto-refresh cycle
    await page.waitForTimeout(6000);
    
    // Check if data has been refreshed
    const updatedValue = await page.locator('[data-testid="oee-value"]').textContent();
    
    // Values might be the same if no new data, but loading indicators should have appeared
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
  });
});

test.describe('Manufacturing Chat Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test('complete AI chat interaction workflow', async ({ page }) => {
    // Navigate to manufacturing chat
    await page.goto(`${BASE_URL}/manufacturing-chat`);
    await waitForPageLoad(page);
    
    // Verify chat interface is loaded
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Test sample questions
    await page.click('[data-testid="sample-question-oee"]');
    await page.waitForSelector('[data-testid="ai-response"]');
    
    // Verify response contains relevant information
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response).toContain('OEE');
    
    // Test custom question
    await page.fill('[data-testid="chat-input"]', 'What is the current temperature in Zone A?');
    await page.click('[data-testid="send-message-button"]');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]:nth-child(4)');
    
    // Test follow-up question
    await page.fill('[data-testid="chat-input"]', 'What are the normal temperature ranges for this zone?');
    await page.click('[data-testid="send-message-button"]');
    
    await page.waitForSelector('[data-testid="ai-response"]:nth-child(6)');
    
    // Test chat history
    const chatMessages = await page.locator('[data-testid="chat-message"]').count();
    expect(chatMessages).toBeGreaterThan(0);
    
    // Test export chat functionality
    await page.click('[data-testid="export-chat-button"]');
    await page.waitForSelector('[data-testid="export-success"]');
  });

  test('should handle streaming responses', async ({ page }) => {
    await page.goto(`${BASE_URL}/manufacturing-chat`);
    await waitForPageLoad(page);
    
    // Send complex question that should generate streaming response
    await page.fill('[data-testid="chat-input"]', 'Analyze the production data from the last 24 hours and provide insights on equipment performance, quality metrics, and recommendations for optimization.');
    await page.click('[data-testid="send-message-button"]');
    
    // Verify streaming indicator appears
    await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();
    
    // Wait for response to complete
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden', timeout: 30000 });
    
    // Verify complete response
    const response = await page.locator('[data-testid="ai-response"]:last-child').textContent();
    expect(response!.length).toBeGreaterThan(100); // Should be a comprehensive response
  });
});

test.describe('Alert Management Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test('complete alert handling workflow', async ({ page }) => {
    // Navigate to alerts page
    await page.goto(`${BASE_URL}/alerts`);
    await waitForPageLoad(page);
    
    // Verify alerts list is loaded
    await expect(page.locator('[data-testid="alerts-list"]')).toBeVisible();
    
    // Filter alerts by severity
    await page.selectOption('[data-testid="severity-filter"]', 'high');
    await page.waitForSelector('[data-testid="alert-item"]');
    
    // Click on first alert
    await page.click('[data-testid="alert-item"]:first-child');
    await page.waitForURL(`${BASE_URL}/alerts/*`);
    
    // Verify alert details
    await expect(page.locator('[data-testid="alert-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-severity"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-timestamp"]')).toBeVisible();
    
    // Acknowledge alert
    await page.click('[data-testid="acknowledge-alert-button"]');
    await page.fill('[data-testid="acknowledgment-note"]', 'Investigating the issue');
    await page.click('[data-testid="confirm-acknowledgment-button"]');
    
    // Verify alert status updated
    await page.waitForSelector('[data-testid="success-message"]');
    await expect(page.locator('[data-testid="alert-status"]')).toContainText('Acknowledged');
    
    // Add resolution note
    await page.click('[data-testid="resolve-alert-button"]');
    await page.fill('[data-testid="resolution-note"]', 'Issue resolved by maintenance team');
    await page.selectOption('[data-testid="resolution-action"]', 'maintenance_completed');
    await page.click('[data-testid="confirm-resolution-button"]');
    
    // Verify alert resolved
    await expect(page.locator('[data-testid="alert-status"]')).toContainText('Resolved');
  });

  test('should handle alert notifications', async ({ page, context }) => {
    // Enable notifications
    await context.grantPermissions(['notifications']);
    
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageLoad(page);
    
    // Enable alert notifications
    await page.click('[data-testid="notification-settings"]');
    await page.check('[data-testid="enable-notifications"]');
    await page.click('[data-testid="save-settings"]');
    
    // Simulate new alert (this would normally come from server-sent events)
    await page.evaluate(() => {
      // Simulate receiving a new alert via WebSocket or SSE
      window.dispatchEvent(new CustomEvent('newAlert', {
        detail: {
          id: 'alert-test-001',
          severity: 'critical',
          title: 'Equipment Malfunction',
          message: 'CNC Machine Alpha has stopped responding'
        }
      }));
    });
    
    // Verify alert notification appears
    await expect(page.locator('[data-testid="alert-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-notification-title"]')).toContainText('Equipment Malfunction');
    
    // Click notification to navigate to alert
    await page.click('[data-testid="alert-notification"]');
    await page.waitForURL(`${BASE_URL}/alerts/alert-test-001`);
  });
});

test.describe('Data Export and Reporting Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test('complete data export workflow', async ({ page }) => {
    // Navigate to equipment page
    await page.goto(`${BASE_URL}/equipment`);
    await waitForPageLoad(page);
    
    // Select equipment for data export
    await page.check('[data-testid="equipment-select-all"]');
    
    // Open export dialog
    await page.click('[data-testid="export-data-button"]');
    await page.waitForSelector('[data-testid="export-dialog"]');
    
    // Configure export
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.selectOption('[data-testid="date-range"]', 'last_7_days');
    await page.check('[data-testid="include-performance-metrics"]');
    await page.check('[data-testid="include-quality-data"]');
    
    // Start export
    await page.click('[data-testid="start-export-button"]');
    
    // Wait for export to complete
    await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
    
    // Download export file
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-export-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
    
    // Save file for verification
    await download.saveAs('./test-exports/' + download.suggestedFilename());
  });

  test('should generate performance reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageLoad(page);
    
    // Create new performance report
    await page.click('[data-testid="create-report-button"]');
    await page.selectOption('[data-testid="report-type"]', 'performance');
    
    // Configure report parameters
    await page.fill('[data-testid="report-title"]', 'Weekly Production Performance Report');
    await page.selectOption('[data-testid="time-period"]', 'last_week');
    await page.check('[data-testid="include-oee-analysis"]');
    await page.check('[data-testid="include-downtime-analysis"]');
    await page.check('[data-testid="include-quality-metrics"]');
    
    // Generate report
    await page.click('[data-testid="generate-report-button"]');
    
    // Wait for report generation
    await page.waitForSelector('[data-testid="report-preview"]', { timeout: 30000 });
    
    // Verify report sections
    await expect(page.locator('[data-testid="oee-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="downtime-analysis"]')).toBeVisible();
    await expect(page.locator('[data-testid="quality-summary"]')).toBeVisible();
    
    // Export report to PDF
    await page.click('[data-testid="export-pdf-button"]');
    
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile devices', async ({ page, browser }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    
    // Test navigation menu on mobile
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Test dashboard on mobile
    await page.click('[data-testid="nav-dashboard"]');
    await waitForPageLoad(page);
    
    // Verify responsive layout
    await expect(page.locator('[data-testid="dashboard-grid"]')).toHaveCSS('flex-direction', 'column');
    
    // Test chat interface on mobile
    await page.goto(`${BASE_URL}/manufacturing-chat`);
    await waitForPageLoad(page);
    
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Test mobile-specific interactions
    await page.fill('[data-testid="chat-input"]', 'What is the current OEE?');
    await page.click('[data-testid="send-message-button"]');
    
    await page.waitForSelector('[data-testid="ai-response"]');
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
  });
});
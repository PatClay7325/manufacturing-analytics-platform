import { test, expect, Page } from '@playwright/test';

interface PageRoute {
  path: string;
  name: string;
  expectedTitle?: string;
  skipAssets?: boolean;
}

// Comprehensive list of all pages in the application
const allRoutes: PageRoute[] = [
  // Main pages
  { path: '/', name: 'Home Page', expectedTitle: 'Manufacturing Analytics Platform' },
  { path: '/manufacturingPlatform-demo', name: 'manufacturingPlatform Demo', expectedTitle: 'manufacturingPlatform Demo' },
  
  // Dashboard routes
  { path: '/dashboard', name: 'Dashboard', expectedTitle: 'Dashboard' },
  { path: '/dashboards', name: 'Dashboards List', expectedTitle: 'Dashboards' },
  { path: '/dashboards/browse', name: 'Browse Dashboards', expectedTitle: 'Browse Dashboards' },
  { path: '/dashboards/new', name: 'New Dashboard', expectedTitle: 'New Dashboard' },
  { path: '/dashboards/manufacturing', name: 'Manufacturing Dashboard' },
  { path: '/dashboards/production', name: 'Production Dashboard' },
  { path: '/dashboards/quality', name: 'Quality Dashboard' },
  { path: '/dashboards/maintenance', name: 'Maintenance Dashboard' },
  { path: '/dashboards/oee', name: 'OEE Dashboard' },
  { path: '/dashboards/unified', name: 'Unified Dashboard' },
  { path: '/dashboards/rca', name: 'RCA Dashboard' },
  { path: '/dashboards/library-panels', name: 'Library Panels' },
  { path: '/dashboards/folder/new', name: 'New Folder' },
  { path: '/dashboard/import', name: 'Import Dashboard' },
  { path: '/dashboard-demo', name: 'Dashboard Demo' },
  { path: '/enhanced-dashboard', name: 'Enhanced Dashboard' },
  { path: '/persistent-dashboard', name: 'Persistent Dashboard' },
  { path: '/variable-dashboard', name: 'Variable Dashboard' },
  { path: '/test-dashboard', name: 'Test Dashboard' },
  { path: '/prometheus-dashboard', name: 'Prometheus Dashboard' },
  
  // Analytics
  { path: '/Analytics-dashboard', name: 'Analytics Dashboard' },
  
  // Chat and AI
  { path: '/ai-chat', name: 'AI Chat', expectedTitle: 'AI Chat' },
  { path: '/chat-demo', name: 'Chat Demo' },
  { path: '/manufacturing-chat', name: 'Manufacturing Chat' },
  { path: '/manufacturing-chat/optimized', name: 'Optimized Manufacturing Chat' },
  { path: '/test-chat', name: 'Test Chat' },
  
  // Alerting
  { path: '/alerting', name: 'Alerting', expectedTitle: 'Alerting' },
  { path: '/alerting/list', name: 'Alert Rules List' },
  { path: '/alerting/notifications', name: 'Alert Notifications' },
  { path: '/alerting/routes', name: 'Alert Routes' },
  { path: '/alerting/silences', name: 'Alert Silences' },
  { path: '/alerts', name: 'Alerts' },
  
  // Admin
  { path: '/admin/general', name: 'Admin General' },
  { path: '/admin/users', name: 'Admin Users' },
  { path: '/admin/teams', name: 'Admin Teams' },
  { path: '/admin/plugins', name: 'Admin Plugins' },
  { path: '/admin/apikeys', name: 'Admin API Keys' },
  
  // User management
  { path: '/users', name: 'Users' },
  { path: '/users/new', name: 'New User' },
  { path: '/teams', name: 'Teams' },
  { path: '/teams/new', name: 'New Team' },
  { path: '/org', name: 'Organization' },
  { path: '/org/users', name: 'Organization Users' },
  { path: '/org/serviceaccounts', name: 'Service Accounts' },
  
  // Auth
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/reset-password', name: 'Reset Password' },
  { path: '/profile', name: 'Profile' },
  
  // Data sources and connections
  { path: '/datasources', name: 'Data Sources' },
  { path: '/connections', name: 'Connections' },
  { path: '/connections/datasources', name: 'Connection Data Sources' },
  { path: '/connections/add-new-connection', name: 'Add New Connection' },
  
  // Explore
  { path: '/explore', name: 'Explore' },
  
  // Equipment and monitoring
  { path: '/equipment', name: 'Equipment' },
  { path: '/monitoring', name: 'Monitoring' },
  { path: '/diagnostics', name: 'Diagnostics' },
  
  // API Keys
  { path: '/api-keys', name: 'API Keys' },
  
  // Plugins and playlists
  { path: '/plugins', name: 'Plugins' },
  { path: '/playlists', name: 'Playlists' },
  
  // Legal and support
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/cookie-policy', name: 'Cookie Policy' },
  { path: '/support', name: 'Support' },
  { path: '/status', name: 'Status' },
  
  // Test pages
  { path: '/test-page', name: 'Test Page' },
  { path: '/test-minimal', name: 'Test Minimal' },
  { path: '/test-prometheus', name: 'Test Prometheus' },
  
  // Development
  { path: '/dev', name: 'Development' }
];

// Function to check for 404 errors in network requests
async function checkFor404Errors(page: Page, route: PageRoute) {
  const networkErrors: string[] = [];
  const loadingErrors: string[] = [];
  
  // Listen to all network requests
  page.on('response', async (response) => {
    if (response.status() === 404) {
      networkErrors.push(`404 Error: ${response.url()}`);
    }
    if (response.status() >= 500) {
      networkErrors.push(`Server Error (${response.status()}): ${response.url()}`);
    }
  });

  // Listen to console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('404') || text.includes('Failed to load') || text.includes('net::ERR_ABORTED')) {
        loadingErrors.push(`Console Error: ${text}`);
      }
    }
  });

  // Listen to page errors
  page.on('pageerror', (error) => {
    loadingErrors.push(`Page Error: ${error.message}`);
  });

  try {
    // Navigate to the page with extended timeout
    const response = await page.goto(`http://localhost:3000${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Check if the page itself returned 404
    if (response?.status() === 404) {
      networkErrors.push(`Page not found: ${route.path}`);
    }

    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);

    // Check for error boundaries or error messages in the DOM
    const errorBoundary = await page.locator('[role="alert"], .error-boundary, .error-message').first();
    if (await errorBoundary.isVisible()) {
      const errorText = await errorBoundary.textContent();
      if (errorText?.includes('404') || errorText?.includes('not found')) {
        loadingErrors.push(`Error boundary triggered: ${errorText}`);
      }
    }

    return {
      networkErrors,
      loadingErrors,
      pageLoaded: response?.ok() ?? false
    };

  } catch (error) {
    return {
      networkErrors: [`Navigation failed: ${error.message}`],
      loadingErrors,
      pageLoaded: false
    };
  }
}

// Main test suite
test.describe('Comprehensive 404 Error Check', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for navigation
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  // Test all routes
  for (const route of allRoutes) {
    test(`Check ${route.name} (${route.path}) for 404 errors`, async ({ page }) => {
      console.log(`\n🔍 Testing: ${route.name} - ${route.path}`);
      
      const result = await checkFor404Errors(page, route);
      
      // Log results
      if (result.networkErrors.length > 0) {
        console.log(`❌ Network Errors for ${route.path}:`);
        result.networkErrors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (result.loadingErrors.length > 0) {
        console.log(`⚠️  Loading Errors for ${route.path}:`);
        result.loadingErrors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (result.pageLoaded && result.networkErrors.length === 0 && result.loadingErrors.length === 0) {
        console.log(`✅ ${route.name} loaded successfully`);
      }
      
      // Assert that there are no 404 errors
      expect(result.networkErrors.filter(error => error.includes('404')), 
        `404 errors found on ${route.path}: ${result.networkErrors.join(', ')}`
      ).toHaveLength(0);
      
      // Check that the page loaded successfully
      expect(result.pageLoaded, `Page ${route.path} failed to load`).toBe(true);
    });
  }
});

// Separate test for API endpoints
test.describe('API Endpoint 404 Check', () => {
  const apiEndpoints = [
    '/api/alerts',
    '/api/dashboards',
    '/api/equipment',
    '/api/users',
    '/api/teams',
    '/api/chat',
    '/api/metrics/query',
    '/api/health',
    '/api/diagnostics/system-metrics'
  ];

  for (const endpoint of apiEndpoints) {
    test(`Check API endpoint ${endpoint}`, async ({ request }) => {
      try {
        const response = await request.get(`http://localhost:3000${endpoint}`);
        expect(response.status()).not.toBe(404);
        console.log(`✅ API ${endpoint}: ${response.status()}`);
      } catch (error) {
        console.log(`❌ API ${endpoint} failed: ${error.message}`);
        throw error;
      }
    });
  }
});
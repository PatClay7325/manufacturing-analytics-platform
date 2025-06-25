import fs from 'fs';
import path from 'path';

// Define all remaining pages that need to be created
const remainingPages = [
  // Alerting pages
  { path: 'alerting/groups', name: 'Alert Groups' },
  { path: 'alerting/admin', name: 'Alerting Admin' },
  { path: 'alerting/state-history', name: 'Alert State History' },
  { path: 'alerting/contact-points', name: 'Contact Points' },
  { path: 'alerting/notification-policies', name: 'Notification Policies' },
  { path: 'alerting/silences/new', name: 'New Silence' },
  
  // Dashboard pages
  { path: 'dashboards/playlists', name: 'Playlists' },
  { path: 'dashboards/playlists/new', name: 'New Playlist' },
  { path: 'dashboards/snapshots', name: 'Snapshots' },
  { path: 'dashboards/public', name: 'Public Dashboards' },
  { path: 'dashboards/library-panels/new', name: 'New Library Panel' },
  { path: 'dashboard-solo/[type]/[slug]', name: 'Dashboard Solo' },
  
  // Admin pages
  { path: 'admin/stats', name: 'Server Stats' },
  { path: 'admin/extensions', name: 'Extensions' },
  { path: 'admin/access', name: 'Access Control' },
  { path: 'admin/ldap', name: 'LDAP' },
  { path: 'admin/authentication', name: 'Authentication' },
  { path: 'admin/config', name: 'Configuration' },
  { path: 'admin/storage', name: 'Storage' },
  { path: 'admin/migrations', name: 'Migrations' },
  { path: 'admin/feature-toggles', name: 'Feature Toggles' },
  { path: 'admin/users/public-dashboards', name: 'Public Dashboard Users' },
  
  // Organization pages
  { path: 'org/new', name: 'New Organization' },
  { path: 'org/users/invite', name: 'Invite Users' },
  { path: 'org/serviceaccounts/create', name: 'Create Service Account' },
  { path: 'org/serviceaccounts/[id]', name: 'Service Account Details' },
  { path: 'org/teams', name: 'Organization Teams' },
  { path: 'org/teams/new', name: 'New Team' },
  
  // Data source pages
  { path: 'connections/datasources/new', name: 'New Data Source' },
  { path: 'connections/datasources/edit/[uid]', name: 'Edit Data Source' },
  { path: 'connections/your-connections', name: 'Your Connections' },
  { path: 'connections/connect-data', name: 'Connect Data' },
  
  // User profile pages
  { path: 'profile/preferences', name: 'Preferences' },
  { path: 'profile/sessions', name: 'Sessions' },
  { path: 'profile/tokens', name: 'API Tokens' },
  { path: 'profile/password', name: 'Change Password' },
  { path: 'profile/notifications', name: 'Notifications' },
  { path: 'profile/orgs', name: 'Organizations' },
  { path: 'profile/teams', name: 'Teams' },
  
  // Plugin pages
  { path: 'plugins/[pluginId]', name: 'Plugin Details' },
  { path: 'plugins/[pluginId]/config', name: 'Plugin Config' },
  { path: 'plugins/[pluginId]/dashboards', name: 'Plugin Dashboards' },
  
  // Auth pages
  { path: 'logout', name: 'Logout' },
  { path: 'signup', name: 'Sign Up' },
  { path: 'user/auth-tokens', name: 'Auth Tokens' },
  { path: 'user/password/send-reset-email', name: 'Send Reset Email' },
  { path: 'user/password/reset', name: 'Reset Password' },
  { path: 'verify', name: 'Verify Email' },
  { path: 'invite/[code]', name: 'Accept Invitation' },
  
  // Help pages
  { path: 'help', name: 'Help Center' },
  { path: 'about', name: 'About' },
  { path: 'shortcuts', name: 'Keyboard Shortcuts' },
  { path: 'bookmarks', name: 'Bookmarks' },
  
  // Search pages
  { path: 'search', name: 'Search' },
  { path: 'search/dashboards', name: 'Search Dashboards' },
  { path: 'search/folders', name: 'Search Folders' },
  
  // Advanced pages
  { path: 'reports', name: 'Reports' },
  { path: 'reports/new', name: 'New Report' },
  { path: 'annotations', name: 'Annotations' },
  { path: 'api-keys/new', name: 'New API Key' },
  { path: 'live', name: 'Live' },
  { path: 'monitoring', name: 'Monitoring' },
  { path: 'logs', name: 'Logs' },
  
  // Migration pages
  { path: 'migrate', name: 'Migration Tools' },
  { path: 'migrate/cloud', name: 'Migrate to Cloud' },
  { path: 'import', name: 'Import' },
  { path: 'export', name: 'Export' },
  
  // Recently added
  { path: 'recently-deleted', name: 'Recently Deleted' },
  { path: 'trash', name: 'Trash' },
  { path: 'restore', name: 'Restore' },
  { path: 'home', name: 'Home Dashboard' }
];

// Template for generating page components
const generatePageComponent = (pageName: string, pagePath: string) => {
  const isDynamicRoute = pagePath.includes('[');
  const componentName = pageName.replace(/\s+/g, '') + 'Page';
  
  return `'use client';

import PageLayout from '@/components/layout/PageLayout';
import { Construction } from 'lucide-react';
${isDynamicRoute ? "import { useParams } from 'next/navigation';" : ''}

export default function ${componentName}() {
  ${isDynamicRoute ? 'const params = useParams();' : ''}
  
  return (
    <PageLayout
      title="${pageName}"
      description="This page is under construction"
    >
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Construction className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          ${pageName}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          This page is currently being implemented to match manufacturingPlatform functionality.
        </p>
        ${isDynamicRoute ? `
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>` : ''}
      </div>
    </PageLayout>
  );
}`;
};

// Generate all remaining pages
async function generatePages() {
  const appDir = path.join(process.cwd(), 'src/app');
  let created = 0;
  let skipped = 0;

  for (const page of remainingPages) {
    const pagePath = path.join(appDir, page.path);
    const pageFile = path.join(pagePath, 'page.tsx');
    
    // Check if page already exists
    if (fs.existsSync(pageFile)) {
      console.log(`⏭️  Skipping ${page.path} (already exists)`);
      skipped++;
      continue;
    }
    
    // Create directory if it doesn't exist
    fs.mkdirSync(pagePath, { recursive: true });
    
    // Generate and write component
    const component = generatePageComponent(page.name, page.path);
    fs.writeFileSync(pageFile, component);
    
    console.log(`✅ Created ${page.path}`);
    created++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} pages`);
  console.log(`   Skipped: ${skipped} pages`);
  console.log(`   Total remaining: ${remainingPages.length} pages`);
}

// Run the generator
generatePages().catch(console.error);
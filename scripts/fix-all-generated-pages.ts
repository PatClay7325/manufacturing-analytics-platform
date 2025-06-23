import fs from 'fs';
import path from 'path';

// Pages that were generated and might have issues
const generatedPages = [
  'alerting/groups',
  'alerting/admin',
  'alerting/state-history',
  'alerting/contact-points',
  'alerting/notification-policies',
  'alerting/silences/new',
  'dashboards/playlists',
  'dashboards/playlists/new',
  'dashboards/snapshots',
  'dashboards/public',
  'dashboards/library-panels/new',
  'dashboard-solo/[type]/[slug]',
  'admin/stats',
  'admin/extensions',
  'admin/access',
  'admin/ldap',
  'admin/authentication',
  'admin/config',
  'admin/storage',
  'admin/migrations',
  'admin/feature-toggles',
  'admin/users/public-dashboards',
  'org/new',
  'org/users/invite',
  'org/serviceaccounts/create',
  'org/serviceaccounts/[id]',
  'org/teams',
  'org/teams/new',
  'connections/datasources/new',
  'connections/datasources/edit/[uid]',
  'connections/your-connections',
  'connections/connect-data',
  'profile/preferences',
  'profile/sessions',
  'profile/tokens',
  'profile/password',
  'profile/notifications',
  'profile/orgs',
  'profile/teams',
  'plugins/[pluginId]',
  'plugins/[pluginId]/config',
  'plugins/[pluginId]/dashboards',
  'logout',
  'signup',
  'user/auth-tokens',
  'user/password/send-reset-email',
  'user/password/reset',
  'verify',
  'invite/[code]',
  'help',
  'about',
  'shortcuts',
  'bookmarks',
  'search',
  'search/dashboards',
  'search/folders',
  'reports',
  'reports/new',
  'annotations',
  'api-keys/new',
  'live',
  'monitoring',
  'logs',
  'migrate',
  'migrate/cloud',
  'import',
  'export',
  'recently-deleted',
  'trash',
  'restore',
  'home'
];

async function fixPage(pagePath: string) {
  const fullPath = path.join(process.cwd(), 'src/app', pagePath, 'page.tsx');
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipping ${pagePath} (not found)`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Check if it's using PageLayout
  if (!content.includes('PageLayout')) {
    return false;
  }
  
  // Fix the content - ensure it has proper structure
  const fixedContent = `'use client';

import PageLayout from '@/components/layout/PageLayout';
import { Construction } from 'lucide-react';
${pagePath.includes('[') ? "import { useParams } from 'next/navigation';" : ''}

export default function ${pagePath.split('/').pop()?.replace(/[^a-zA-Z]/g, '') || 'Page'}Page() {
  ${pagePath.includes('[') ? 'const params = useParams();' : ''}
  
  return (
    <PageLayout
      title="${pagePath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Page'}"
      description="This page is under construction"
    >
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Construction className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          ${pagePath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Page'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          This page is currently being implemented to match manufacturingPlatform functionality.
        </p>
        ${pagePath.includes('[') ? `
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>` : ''}
      </div>
    </PageLayout>
  );
}`;

  fs.writeFileSync(fullPath, fixedContent);
  return true;
}

async function main() {
  console.log('🔧 Fixing generated pages...');
  let fixed = 0;
  
  for (const page of generatedPages) {
    if (await fixPage(page)) {
      console.log(`✅ Fixed ${page}`);
      fixed++;
    }
  }
  
  console.log(`\n📊 Fixed ${fixed} pages`);
}

main().catch(console.error);
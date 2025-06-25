#!/usr/bin/env tsx

/**
 * Remove all Analytics references from the codebase
 * Replace with Manufacturing Analytics Platform branding
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Replacement {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const replacements: Replacement[] = [
  // Component names and imports
  {
    pattern: /AnalyticsPanel/g,
    replacement: 'AnalyticsPanel',
    description: 'Component name: AnalyticsPanel → AnalyticsPanel'
  },
  {
    pattern: /ManufacturingDashboard/g,
    replacement: 'ManufacturingDashboard',
    description: 'Component name: ManufacturingDashboard → ManufacturingDashboard'
  },
  {
    pattern: /DashboardEmbed/g,
    replacement: 'DashboardEmbed',
    description: 'Component name: DashboardEmbed → DashboardEmbed'
  },
  {
    pattern: /DashboardLayout/g,
    replacement: 'DashboardLayout',
    description: 'Component name: DashboardLayout → DashboardLayout'
  },
  {
    pattern: /ManufacturingCharts/g,
    replacement: 'ManufacturingCharts',
    description: 'Component name: ManufacturingCharts → ManufacturingCharts'
  },
  {
    pattern: /ManufacturingDashboard/g,
    replacement: 'ManufacturingDashboard',
    description: 'Component name: ManufacturingDashboard → ManufacturingDashboard'
  },
  
  // Text content and UI strings
  {
    pattern: /Analytics Dashboard/gi,
    replacement: 'Analytics Dashboard',
    description: 'UI text: Analytics Dashboard → Analytics Dashboard'
  },
  {
    pattern: /Analytics Dashboard/gi,
    replacement: 'Analytics Dashboard',
    description: 'UI text: Analytics Dashboard → Analytics Dashboard'
  },
  {
    pattern: /Analytics/gi,
    replacement: 'Analytics',
    description: 'UI text: Analytics → Analytics'
  },
  {
    pattern: /Dashboard Integration/gi,
    replacement: 'Dashboard Integration',
    description: 'UI text: Dashboard Integration → Dashboard Integration'
  },
  
  // Route paths
  {
    pattern: /\/dashboards\/Analytics/g,
    replacement: '/dashboards/Analytics',
    description: 'Route: /dashboards/Analytics → /dashboards/Analytics'
  },
  {
    pattern: /\/Analytics-dashboard/g,
    replacement: '/Analytics-dashboard',
    description: 'Route: /Analytics-dashboard → /Analytics-dashboard'
  },
  
  // Environment variables
  {
    pattern: /NEXT_PUBLIC_Analytics_URL/g,
    replacement: 'NEXT_PUBLIC_Analytics_URL',
    description: 'Env var: NEXT_PUBLIC_Analytics_URL → NEXT_PUBLIC_Analytics_URL'
  },
  {
    pattern: /Analytics_API_KEY/g,
    replacement: 'Analytics_API_KEY',
    description: 'Env var: Analytics_API_KEY → Analytics_API_KEY'
  },
  {
    pattern: /Analytics_ORG_ID/g,
    replacement: 'Analytics_ORG_ID',
    description: 'Env var: Analytics_ORG_ID → Analytics_ORG_ID'
  },
  
  // Config and type references
  {
    pattern: /manufacturingPlatform\.config/g,
    replacement: 'Analytics.config',
    description: 'Config: Analytics.config → Analytics.config'
  },
  {
    pattern: /AnalyticsConfig/g,
    replacement: 'AnalyticsConfig',
    description: 'Variable: AnalyticsConfig → AnalyticsConfig'
  },
  {
    pattern: /AnalyticsConfig/g,
    replacement: 'AnalyticsConfig',
    description: 'Type: AnalyticsConfig → AnalyticsConfig'
  },
  
  // Comments and documentation
  {
    pattern: /Analytics([- ])inspired/gi,
    replacement: 'Analytics$1focused',
    description: 'Comment: Analytics-focused → Analytics-focused'
  },
  {
    pattern: /Custom analytics implementation/gi,
    replacement: 'Custom analytics implementation',
    description: 'Comment: Custom analytics implementation → Custom analytics implementation'
  },
  {
    pattern: /from our analytics system/gi,
    replacement: 'from our analytics system',
    description: 'Comment: from our analytics system → from our analytics system'
  },
  
  // Generic Analytics references
  {
    pattern: /\bGrafana\b/g,
    replacement: (match) => {
      // Preserve case
      if (match[0] === 'G') return 'Analytics';
      return 'Analytics';
    },
    description: 'Generic: Analytics → Analytics'
  }
];

const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.md', '.css', '.scss'];

const excludeDirs = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'playwright-report',
  'test-results',
  'coverage'
];

const processFile = (filePath: string, dryRun: boolean): number => {
  const ext = path.extname(filePath);
  if (!fileExtensions.includes(ext)) return 0;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let changeCount = 0;
  
  replacements.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      if (typeof replacement === 'string') {
        content = content.replace(pattern, replacement);
      } else {
        content = content.replace(pattern, replacement);
      }
      changeCount += matches.length;
      
      if (dryRun) {
        console.log(`  Would apply: ${description} (${matches.length} occurrences)`);
      }
    }
  });
  
  if (changeCount > 0 && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated ${path.relative(process.cwd(), filePath)} (${changeCount} changes)`);
  }
  
  return changeCount;
};

const renameFiles = (dryRun: boolean) => {
  const filesToRename = [
    { from: 'AnalyticsPanel.tsx', to: 'AnalyticsPanel.tsx' },
    { from: 'ManufacturingDashboard.tsx', to: 'ManufacturingDashboard.tsx' },
    { from: 'DashboardEmbed.tsx', to: 'DashboardEmbed.tsx' },
    { from: 'DashboardLayout.tsx', to: 'DashboardLayout.tsx' },
    { from: 'ManufacturingCharts.tsx', to: 'ManufacturingCharts.tsx' },
    { from: 'ManufacturingDashboard.tsx', to: 'ManufacturingDashboard.tsx' },
    { from: 'Analytics.config.ts', to: 'Analytics.config.ts' }
  ];
  
  console.log('\n📁 Renaming files...\n');
  
  filesToRename.forEach(({ from, to }) => {
    const files = glob.sync(`**/${from}`, { ignore: excludeDirs });
    
    files.forEach(file => {
      const dir = path.dirname(file);
      const newPath = path.join(dir, to);
      
      if (dryRun) {
        console.log(`  Would rename: ${file} → ${newPath}`);
      } else {
        if (fs.existsSync(file)) {
          fs.renameSync(file, newPath);
          console.log(`✅ Renamed: ${file} → ${newPath}`);
        }
      }
    });
  });
};

const renameFolders = (dryRun: boolean) => {
  console.log('\n📁 Checking for Analytics folders...\n');
  
  const grafanaDir = path.join(process.cwd(), 'src/components/manufacturingPlatform');
  if (fs.existsSync(grafanaDir)) {
    const newDir = path.join(process.cwd(), 'src/components/Analytics');
    if (dryRun) {
      console.log(`  Would rename: ${grafanaDir} → ${newDir}`);
    } else {
      fs.renameSync(grafanaDir, newDir);
      console.log(`✅ Renamed: ${grafanaDir} → ${newDir}`);
    }
  }
  
  const manufacturingPlatformDashboardDir = path.join(process.cwd(), 'src/app/Analytics-dashboard');
  if (fs.existsSync(manufacturingPlatformDashboardDir)) {
    const newDir = path.join(process.cwd(), 'src/app/Analytics-dashboard');
    if (dryRun) {
      console.log(`  Would rename: ${manufacturingPlatformDashboardDir} → ${newDir}`);
    } else {
      fs.renameSync(manufacturingPlatformDashboardDir, newDir);
      console.log(`✅ Renamed: ${manufacturingPlatformDashboardDir} → ${newDir}`);
    }
  }
};

const main = () => {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🔍 Removing Analytics references from Manufacturing Analytics Platform...\n');
  if (isDryRun) {
    console.log('🔸 DRY RUN MODE - No files will be modified\n');
  }
  
  // First rename folders
  renameFolders(isDryRun);
  
  // Then rename files
  renameFiles(isDryRun);
  
  // Process file contents
  console.log('\n📝 Processing file contents...\n');
  
  const files = glob.sync('**/*', { 
    ignore: excludeDirs,
    nodir: true
  });
  
  let totalFiles = 0;
  let totalChanges = 0;
  
  files.forEach(file => {
    const changes = processFile(file, isDryRun);
    if (changes > 0) {
      totalFiles++;
      totalChanges += changes;
    }
  });
  
  // Update imports after renaming
  if (!isDryRun) {
    console.log('\n🔄 Updating import paths...\n');
    
    const importReplacements = [
      { from: '/Analytics/', to: '/Analytics/' },
      { from: '/AnalyticsPanel', to: '/AnalyticsPanel' },
      { from: '/ManufacturingDashboard', to: '/ManufacturingDashboard' },
      { from: '/DashboardEmbed', to: '/DashboardEmbed' },
      { from: '/DashboardLayout', to: '/DashboardLayout' },
      { from: '/ManufacturingCharts', to: '/ManufacturingCharts' }
    ];
    
    files.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        let content = fs.readFileSync(file, 'utf-8');
        let changed = false;
        
        importReplacements.forEach(({ from, to }) => {
          if (content.includes(from)) {
            content = content.replace(new RegExp(from, 'g'), to);
            changed = true;
          }
        });
        
        if (changed) {
          fs.writeFileSync(file, content, 'utf-8');
          console.log(`✅ Updated imports in ${path.relative(process.cwd(), file)}`);
        }
      }
    });
  }
  
  console.log('\n📊 Summary:');
  console.log('─'.repeat(50));
  console.log(`Total files ${isDryRun ? 'to be modified' : 'modified'}: ${totalFiles}`);
  console.log(`Total changes ${isDryRun ? 'to be made' : 'made'}: ${totalChanges}`);
  
  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply these changes.');
  } else {
    console.log('\n✅ All Analytics references have been removed!');
    console.log('🏭 Your Manufacturing Analytics Platform is now fully branded!');
  }
};

main();
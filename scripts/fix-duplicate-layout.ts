#!/usr/bin/env tsx

/**
 * Remove duplicate DashboardLayout wrappers from pages
 */

import * as fs from 'fs';
import * as path from 'path';

const filesToFix = [
  'src/app/Analytics-dashboard/page.tsx',
  'src/app/dashboards/browse/page.tsx',
  'src/app/dashboards/maintenance/page.tsx',
  'src/app/dashboards/oee/page.tsx',
  'src/app/dashboards/production/page.tsx',
  'src/app/dashboards/quality/page.tsx',
  'src/app/dashboards/rca/page.tsx'
];

const fixFile = (filePath: string) => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Remove DashboardLayout import
  content = content.replace(/import\s*{\s*DashboardLayout\s*}\s*from\s*['"]@\/components\/layout\/DashboardLayout['"]\s*;?\s*\n/g, '');
  content = content.replace(/import\s+DashboardLayout\s+from\s*['"]@\/components\/layout\/DashboardLayout['"]\s*;?\s*\n/g, '');
  
  // Remove DashboardLayout wrapper
  // Pattern 1: <DashboardLayout>...</DashboardLayout>
  content = content.replace(/<DashboardLayout>\s*\n/g, '');
  content = content.replace(/\s*<\/DashboardLayout>/g, '');
  
  // Pattern 2: return ( <DashboardLayout>
  content = content.replace(/return\s*\(\s*\n\s*<DashboardLayout>/g, 'return (');
  content = content.replace(/return\s*<DashboardLayout>/g, 'return');
  
  // Fix indentation by removing extra spaces from wrapped content
  const lines = content.split('\n');
  let inReturn = false;
  let fixedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('return (') || line.includes('return <')) {
      inReturn = true;
    }
    
    if (inReturn && line.match(/^\s{4,}/)) {
      // Reduce indentation by 2 spaces for lines that were inside DashboardLayout
      fixedLines.push(line.replace(/^  /, ''));
    } else {
      fixedLines.push(line);
    }
    
    if (line.includes('};') || (line.trim() === '}' && i === lines.length - 1)) {
      inReturn = false;
    }
  }
  
  content = fixedLines.join('\n');
  
  // Write back
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ Fixed: ${filePath}`);
};

console.log('🔧 Removing duplicate DashboardLayout wrappers...\n');

filesToFix.forEach(file => {
  fixFile(file);
});

console.log('\n✅ All files have been updated!');
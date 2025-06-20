#!/usr/bin/env tsx

/**
 * Fix page background styling to be consistent
 * Remove min-h-screen and bg-gray-50 from pages since DashboardLayout provides it
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const fixFile = (filePath: string) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Skip error pages and special pages that need full screen styling
  const skipFiles = ['error.tsx', 'global-error.tsx', 'not-found.tsx', 'layout.tsx'];
  if (skipFiles.some(skip => filePath.endsWith(skip))) {
    return false;
  }
  
  // Replace common patterns
  const patterns = [
    // min-h-screen with bg-gray-50
    {
      from: /className="min-h-screen bg-gray-50([^"]*)"/g,
      to: 'className="$1"'
    },
    // Just min-h-screen
    {
      from: /className="min-h-screen([^"]*)"/g,
      to: 'className="$1"'
    },
    // Container with min-h-screen
    {
      from: /<div className="min-h-screen[^"]*">\s*\n\s*<div className="container/g,
      to: '<div className="container'
    },
    // Clean up empty className
    {
      from: /className="\s*"/g,
      to: ''
    },
    // Remove wrapper divs that only had min-h-screen
    {
      from: /<div>\s*\n(\s*<)/g,
      to: '$1'
    },
    {
      from: />\s*\n\s*<\/div>\s*\n\s*\);/g,
      to: '>\n  );'
    }
  ];
  
  patterns.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  // Special handling for pages that wrap everything in min-h-screen div
  if (content.includes('return (') && !content.includes('PageLayout')) {
    // Check if the main wrapper only has min-h-screen styling
    const returnMatch = content.match(/return \(\s*\n?\s*<div[^>]*>\s*\n?/);
    if (returnMatch && returnMatch[0].includes('min-h-screen')) {
      // This is likely a wrapper that needs to be removed or modified
      content = content
        .replace(/return \(\s*\n?\s*<div[^>]*min-h-screen[^>]*>\s*\n?/, 'return (\n    ')
        .replace(/\s*<\/div>\s*\n?\s*\);$/, '\n  );');
    }
  }
  
  // Add container wrapper if content doesn't have one
  if (!content.includes('container mx-auto') && !content.includes('PageLayout') && !content.includes('DashboardEditor')) {
    // Find the return statement
    const returnIndex = content.lastIndexOf('return (');
    if (returnIndex !== -1) {
      const beforeReturn = content.substring(0, returnIndex);
      const afterReturn = content.substring(returnIndex);
      
      // Check if it needs a container wrapper
      if (!afterReturn.includes('container mx-auto')) {
        afterReturn.replace(
          /return \(\s*\n?\s*</,
          'return (\n    <div className="container mx-auto px-4 py-8">\n      <'
        ).replace(
          />\s*\n?\s*\);$/,
          '>\n    </div>\n  );'
        );
        
        content = beforeReturn + afterReturn;
      }
    }
  }
  
  if (originalContent !== content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
};

console.log('🎨 Fixing page background styling for consistency...\n');

// Find all page.tsx files
const files = glob.sync('src/app/**/page.tsx');

let fixedCount = 0;

files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

// Also check DiagnosticsPageContent and similar files
const additionalFiles = glob.sync('src/app/**/*PageContent.tsx');
additionalFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files!`);

// Report any remaining issues
console.log('\n🔍 Checking for any remaining background issues...\n');
const allFiles = glob.sync('src/app/**/*.tsx');
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('min-h-screen') && !file.includes('error') && !file.includes('not-found')) {
    console.log(`⚠️  Still has min-h-screen: ${path.relative(process.cwd(), file)}`);
  }
});
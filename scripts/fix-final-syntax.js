#!/usr/bin/env node

/**
 * Fix final syntax errors in the 5 remaining files
 */

const fs = require('fs');

const files = [
  'src/components/explore/ExploreVisualization.tsx',
  'src/components/dashboard/ManufacturingDashboard.tsx', 
  'src/components/dashboard/ManufacturingDashboard.tsx',
  'src/app/documentation/api-reference/page.tsx'
];

// Final specific fixes for remaining optional chaining
const finalFixes = [
  {
    pattern: /frame\?\./g,
    replacement: 'frame.',
    description: 'Remove optional chaining from frame objects'
  },
  {
    pattern: /field\?\./g,
    replacement: 'field.',
    description: 'Remove optional chaining from field objects'
  },
  {
    pattern: /data\?\./g,
    replacement: 'data.',
    description: 'Remove optional chaining from data objects'
  },
  {
    pattern: /tableData\?\./g,
    replacement: 'tableData.',
    description: 'Remove optional chaining from tableData'
  },
  {
    pattern: /chartData\?\./g,
    replacement: 'chartData.',
    description: 'Remove optional chaining from chartData'
  },
  {
    pattern: /timeRange\?\./g,
    replacement: 'timeRange.',
    description: 'Remove optional chaining from timeRange'
  },
  {
    pattern: /values\?\./g,
    replacement: 'values.',
    description: 'Remove optional chaining from values arrays'
  },
  {
    pattern: /strokeWidth=\{2\} d="[^"]*h\?\./g,
    replacement: (match) => match.replace('h?.', 'h.'),
    description: 'Fix SVG path optional chaining'
  },
  {
    pattern: /DASHBOARD_CONFIG\?\./g,
    replacement: 'DASHBOARD_CONFIG.',
    description: 'Remove optional chaining from config objects'
  },
  {
    pattern: /MANUFACTURING_PLATFORM_CONFIG\?\./g,
    replacement: 'MANUFACTURING_PLATFORM_CONFIG.',
    description: 'Remove optional chaining from our analytics system config'
  }
];

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let fixedContent = content;
    let changesCount = 0;

    finalFixes.forEach(({ pattern, replacement, description }) => {
      const matches = fixedContent.match(pattern);
      if (matches) {
        if (typeof replacement === 'function') {
          fixedContent = fixedContent.replace(pattern, replacement);
        } else {
          fixedContent = fixedContent.replace(pattern, replacement);
        }
        changesCount += matches.length;
        console.log(`  ✅ ${description}: ${matches.length} fixes`);
      }
    });

    if (changesCount > 0) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Fixed ${filePath} (${changesCount} changes)`);
    } else {
      console.log(`ℹ️  ${filePath} - no changes needed`);
    }

    return changesCount;
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}:`, error.message);
    return 0;
  }
}

console.log('🔧 Fixing final syntax errors in remaining 5 files...\n');

let totalFixes = 0;
files.forEach(file => {
  console.log(`\n📄 Processing ${file}:`);
  totalFixes += fixFile(file);
});

console.log(`\n📊 Summary: Applied ${totalFixes} total fixes`);
console.log('🎯 Final syntax error cleanup complete!');
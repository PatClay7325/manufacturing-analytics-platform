#!/usr/bin/env tsx

/**
 * Fix excessive optional chaining added by auto-formatters
 * This script removes unnecessary optional chaining operators
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const patterns = [
  // Type annotations should not use optional chaining
  { 
    pattern: /:\s*(\w+)\?\.([\w<>,\[\]]+)/g,
    replacement: ': $1.$2',
    description: 'Type annotations'
  },
  // Return type annotations in arrow functions
  {
    pattern: /\):\s*(\w+)\?\.([\w<>,\[\]]+)\s*=>/g,
    replacement: '): $1.$2 =>',
    description: 'Arrow function return types'
  },
  // Static property access on known objects (e.g., Date, Math)
  {
    pattern: /(Date|Math|Array|Object|String|Number|JSON)\?\./g,
    replacement: '$1.',
    description: 'Static global objects'
  },
  // Theme/config object access where the object is defined
  {
    pattern: /MANUFACTURING_THEME\?\./g,
    replacement: 'MANUFACTURING_THEME.',
    description: 'Theme constants'
  },
  // Array methods that don't need optional chaining
  {
    pattern: /(\w+)\.push\?\(/g,
    replacement: '$1.push(',
    description: 'Array push method'
  },
  {
    pattern: /(\w+)\.length\?/g,
    replacement: '$1.length',
    description: 'Array/string length property'
  },
  // Fix double optional chaining
  {
    pattern: /\?\.\?/g,
    replacement: '?.',
    description: 'Double optional chaining'
  }
];

const fixFile = (filePath: string, dryRun: boolean): number => {
  const content = fs.readFileSync(filePath, 'utf-8');
  let fixed = content;
  let totalFixes = 0;

  patterns.forEach(({ pattern, replacement, description }) => {
    const matches = fixed.match(pattern);
    if (matches) {
      const count = matches.length;
      fixed = fixed.replace(pattern, replacement);
      totalFixes += count;
      
      if (dryRun) {
        console.log(`  Would fix ${count} ${description} issues`);
        matches.slice(0, 3).forEach(match => {
          console.log(`    "${match}" → "${match.replace(pattern, replacement)}"`);
        });
        if (matches.length > 3) {
          console.log(`    ... and ${matches.length - 3} more`);
        }
      }
    }
  });

  if (totalFixes > 0 && !dryRun) {
    fs.writeFileSync(filePath, fixed, 'utf-8');
    console.log(`✅ Fixed ${totalFixes} issues in ${path.relative(process.cwd(), filePath)}`);
  }

  return totalFixes;
};

const main = () => {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🔍 Scanning for excessive optional chaining...\n');

  const srcPath = path.join(process.cwd(), 'src');
  const files = glob.sync('**/*.{ts,tsx}', { 
    cwd: srcPath,
    ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/node_modules/**']
  }).map(file => path.join(srcPath, file));

  let totalFiles = 0;
  let totalIssues = 0;

  files.forEach(file => {
    const fixes = fixFile(file, isDryRun);
    if (fixes > 0) {
      totalFiles++;
      totalIssues += fixes;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`──────────────────────────────────────────────────\n`);
  console.log(`Files ${isDryRun ? 'with issues' : 'fixed'}: ${totalFiles}`);
  console.log(`Total issues ${isDryRun ? 'found' : 'fixed'}: ${totalIssues}`);

  if (isDryRun && totalIssues > 0) {
    console.log('\nRun without --dry-run to apply these fixes.');
  }
};

main();
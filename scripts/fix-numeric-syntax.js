#!/usr/bin/env node

/**
 * Fix specific numeric syntax issues from overly aggressive optional chaining fixes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Specific patterns that need fixing
const numericFixes = [
  {
    // Fix strokeWidth attributes with broken optional chaining
    pattern: /strokeWidth=\{(\d+)\.(\d+)\}/g,
    fix: (match, whole, decimal) => `strokeWidth={${whole}.${decimal}}`,
    description: 'Fix strokeWidth attributes'
  },
  {
    // Fix numeric values in SVG paths that got broken
    pattern: /d="([^"]*?)(\d+)\.(\d+)([^"]*?)"/g,
    fix: (match, before, whole, decimal, after) => `d="${before}${whole}.${decimal}${after}"`,
    description: 'Fix numeric values in SVG paths'
  },
  {
    // Fix CSS calc expressions that got broken
    pattern: /calc\(([^)]*?)(\d+)\.(\d+)([^)]*?)\)/g,
    fix: (match, before, whole, decimal, after) => `calc(${before}${whole}.${decimal}${after})`,
    description: 'Fix CSS calc expressions'
  },
  {
    // Fix object properties with numeric values that got broken
    pattern: /(\w+):\s*(\d+)\.(\d+)([,\s}])/g,
    fix: (match, prop, whole, decimal, after) => `${prop}: ${whole}.${decimal}${after}`,
    description: 'Fix object properties with numeric values'
  }
];

function findReactFiles() {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'app/**/*.{ts,tsx,js,jsx}'
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    const found = glob.sync(pattern, { cwd: process.cwd() });
    files = files.concat(found);
  });
  
  return files.filter(file => 
    !file.includes('node_modules') &&
    !file.includes('.test.') &&
    !file.includes('.spec.') &&
    !file.includes('dist/') &&
    !file.includes('build/')
  );
}

function fixNumericSyntax(filePath, dryRun = false) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let fixedContent = originalContent;
  const appliedFixes = [];
  
  // Apply numeric syntax fixes
  numericFixes.forEach(({ pattern, fix, description }) => {
    const matches = fixedContent.match(pattern);
    if (matches) {
      fixedContent = fixedContent.replace(pattern, fix);
      appliedFixes.push({
        description,
        count: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  });
  
  // Only write if there were changes and not a dry run
  if (fixedContent !== originalContent && !dryRun) {
    fs.writeFileSync(filePath, fixedContent);
  }
  
  return {
    changed: fixedContent !== originalContent,
    fixes: appliedFixes
  };
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'fix';
  const dryRun = args.includes('--dry-run');
  
  if (command === 'fix') {
    const files = findReactFiles();
    let totalFixed = 0;
    
    console.log(`🔧 ${dryRun ? 'Analyzing' : 'Fixing'} numeric syntax in ${files.length} files...`);
    
    files.forEach(filePath => {
      const result = fixNumericSyntax(filePath, dryRun);
      if (result.changed) {
        totalFixed++;
        console.log(`${dryRun ? '🔍' : '✅'} ${dryRun ? 'Would fix' : 'Fixed'} ${filePath}`);
        result.fixes.forEach(fix => {
          console.log(`   - ${fix.description} (${fix.count} instances)`);
          if (fix.examples) {
            console.log(`     Examples: ${fix.examples.join(', ')}`);
          }
        });
      }
    });
    
    console.log(`\n📊 Summary: ${dryRun ? 'Would fix' : 'Fixed'} ${totalFixed} files`);
  } else {
    console.log(`Usage: node ${__filename} fix [--dry-run]`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixNumericSyntax };
#!/usr/bin/env tsx

/**
 * Find all Analytics references in the codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const searchPatterns = [
  /\bmanufacturingplatform\b/gi,
  /\bMANUFACTURINGPLATFORM\b/g,
  /AnalyticsPanel/g,
  /ManufacturingDashboard/g,
  /DashboardEmbed/g,
  /DashboardLayout/g,
  /ManufacturingCharts/g,
  /Analytics-dashboard/g,
  /manufacturingPlatform\.config/g
];

const excludeDirs = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'playwright-report',
  'test-results',
  'coverage',
  'scripts/remove-manufacturingPlatform-references.ts',
  'scripts/find-manufacturingPlatform-references.ts',
  'manufacturingPlatform-REFERENCES-AUDIT.md'
];

interface Reference {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

const searchFile = (filePath: string): Reference[] => {
  const references: Reference[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      searchPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          references.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
    });
  } catch (error) {
    // Skip binary files or files that can't be read
  }
  
  return references;
};

const main = () => {
  console.log('🔍 Searching for Analytics references...\n');
  
  const files = glob.sync('**/*', { 
    ignore: excludeDirs,
    nodir: true
  });
  
  const allReferences: Reference[] = [];
  
  files.forEach(file => {
    const refs = searchFile(file);
    if (refs.length > 0) {
      allReferences.push(...refs);
    }
  });
  
  if (allReferences.length === 0) {
    console.log('✅ No Analytics references found!');
    console.log('🏭 Your Manufacturing Analytics Platform is clean!');
    return;
  }
  
  // Group by file
  const byFile = allReferences.reduce((acc, ref) => {
    if (!acc[ref.file]) acc[ref.file] = [];
    acc[ref.file].push(ref);
    return acc;
  }, {} as Record<string, Reference[]>);
  
  console.log(`Found ${allReferences.length} references in ${Object.keys(byFile).length} files:\n`);
  
  // Display results
  Object.entries(byFile).forEach(([file, refs]) => {
    console.log(`\n📄 ${path.relative(process.cwd(), file)} (${refs.length} references)`);
    console.log('─'.repeat(80));
    
    // Show first 5 references per file
    refs.slice(0, 5).forEach(ref => {
      console.log(`  Line ${ref.line}: ${ref.content.substring(0, 100)}${ref.content.length > 100 ? '...' : ''}`);
    });
    
    if (refs.length > 5) {
      console.log(`  ... and ${refs.length - 5} more references`);
    }
  });
  
  // Summary by file type
  console.log('\n📊 Summary by file type:');
  console.log('─'.repeat(50));
  
  const byExtension = allReferences.reduce((acc, ref) => {
    const ext = path.extname(ref.file) || 'no-extension';
    if (!acc[ext]) acc[ext] = 0;
    acc[ext]++;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(byExtension)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, count]) => {
      console.log(`  ${ext}: ${count} references`);
    });
  
  console.log('\n💡 Run REMOVE-manufacturingPlatform-REFERENCES.cmd to clean these up!');
};

main();
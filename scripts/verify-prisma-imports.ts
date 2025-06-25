#!/usr/bin/env node

/**
 * Script to verify that no old Prisma imports remain in the codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FoundImport {
  file: string;
  line: number;
  content: string;
  type: string;
}

const oldImportPatterns = [
  {
    pattern: /@\/lib\/prisma(-singleton|-production)?/,
    type: 'Prisma import'
  }
];

async function findFiles(): Promise<string[]> {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'tests/**/*.{ts,tsx,js,jsx}',
    'scripts/**/*.{ts,tsx,js,jsx}',
    'prisma/**/*.{ts,tsx,js,jsx}'
  ];
  
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: process.cwd(),
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/backup_*/**',
        // Ignore the database module itself
        '**/src/lib/database/**',
        // Ignore the old prisma files
        '**/src/lib/prisma.ts',
        '**/src/lib/prisma.js',
        '**/src/lib/prisma-singleton.ts',
        '**/src/lib/prisma-production.ts',
        // Ignore this script and the update script
        '**/scripts/update-prisma-imports.ts',
        '**/scripts/verify-prisma-imports.ts'
      ]
    });
    files.push(...matches);
  }
  
  return [...new Set(files)];
}

function checkFile(filePath: string): FoundImport[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const found: FoundImport[] = [];
  
  lines.forEach((line, index) => {
    for (const { pattern, type } of oldImportPatterns) {
      if (pattern.test(line)) {
        found.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          type
        });
      }
    }
  });
  
  return found;
}

async function main() {
  console.log('🔍 Verifying Prisma imports...\n');
  
  const files = await findFiles();
  console.log(`Checking ${files.length} files...\n`);
  
  const allFindings: FoundImport[] = [];
  
  for (const file of files) {
    const findings = checkFile(file);
    allFindings.push(...findings);
  }
  
  if (allFindings.length === 0) {
    console.log('✅ Success! No old Prisma imports found.');
    console.log('\nAll imports have been successfully updated to use @/lib/database');
  } else {
    console.log(`❌ Found ${allFindings.length} old Prisma import(s) that need to be updated:\n`);
    
    // Group by file
    const byFile = allFindings.reduce((acc, finding) => {
      const relativePath = path.relative(process.cwd(), finding.file);
      if (!acc[relativePath]) {
        acc[relativePath] = [];
      }
      acc[relativePath].push(finding);
      return acc;
    }, {} as Record<string, FoundImport[]>);
    
    for (const [file, findings] of Object.entries(byFile)) {
      console.log(`\n${file}:`);
      for (const finding of findings) {
        console.log(`  Line ${finding.line}: ${finding.content}`);
      }
    }
    
    console.log('\n💡 Run UPDATE-PRISMA-IMPORTS.cmd to fix these imports automatically.');
  }
  
  // Also check for @/lib/database imports to show current status
  console.log('\n📊 Current @/lib/database usage:');
  let databaseImportCount = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('@/lib/database')) {
      databaseImportCount++;
    }
  }
  
  console.log(`- Files using @/lib/database: ${databaseImportCount}`);
  console.log(`- Files checked: ${files.length}`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
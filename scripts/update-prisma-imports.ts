#!/usr/bin/env node

/**
 * Script to update all Prisma imports to use the new @/lib/database module
 * This will replace imports from:
 * - @/lib/prisma
 * - @/lib/prisma-singleton
 * - @/lib/prisma-production
 * To: @/lib/database
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ImportPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const importPatterns: ImportPattern[] = [
  // Standard ES6 imports
  {
    pattern: /from\s+['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: 'from \'@/lib/database\'',
    description: 'ES6 import statements'
  },
  // Import with curly braces
  {
    pattern: /import\s*\{([^}]+)\}\s*from\s+['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: 'import {$1} from \'@/lib/database\'',
    description: 'ES6 named imports'
  },
  // Import type statements
  {
    pattern: /import\s+type\s*\{([^}]+)\}\s*from\s+['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: 'import type {$1} from \'@/lib/database\'',
    description: 'TypeScript type imports'
  },
  // Dynamic imports
  {
    pattern: /import\(['"]@\/lib\/prisma(-singleton|-production)?['"]\)/g,
    replacement: 'import(\'@/lib/database\')',
    description: 'Dynamic imports'
  },
  // Require statements (CommonJS)
  {
    pattern: /require\(['"]@\/lib\/prisma(-singleton|-production)?['"]\)/g,
    replacement: 'require(\'@/lib/database\')',
    description: 'CommonJS require statements'
  },
  // Jest mocks
  {
    pattern: /jest\.mock\(['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: 'jest.mock(\'@/lib/database\'',
    description: 'Jest mock statements'
  },
  // Vitest mocks
  {
    pattern: /vi\.mock\(['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: 'vi.mock(\'@/lib/database\'',
    description: 'Vitest mock statements'
  }
];

async function findFilesToUpdate(): Promise<string[]> {
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
        // Don't update the database module itself
        '**/src/lib/database/**',
        // Don't update the old prisma files we're replacing
        '**/src/lib/prisma.ts',
        '**/src/lib/prisma.js',
        '**/src/lib/prisma-singleton.ts',
        '**/src/lib/prisma-production.ts'
      ]
    });
    files.push(...matches);
  }
  
  return [...new Set(files)]; // Remove duplicates
}

function updateFile(filePath: string): { updated: boolean; changes: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  let updatedContent = content;
  const changes: string[] = [];
  
  for (const { pattern, replacement, description } of importPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      updatedContent = updatedContent.replace(pattern, replacement);
      changes.push(`- ${description}: ${matches.length} occurrence(s)`);
    }
  }
  
  if (updatedContent !== content) {
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    return { updated: true, changes };
  }
  
  return { updated: false, changes: [] };
}

async function main() {
  console.log('🔍 Finding files with Prisma imports...\n');
  
  const files = await findFilesToUpdate();
  console.log(`Found ${files.length} files to check\n`);
  
  let updatedCount = 0;
  const updatedFiles: { path: string; changes: string[] }[] = [];
  
  for (const file of files) {
    const { updated, changes } = updateFile(file);
    if (updated) {
      updatedCount++;
      updatedFiles.push({ path: file, changes });
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`- Total files checked: ${files.length}`);
  console.log(`- Files updated: ${updatedCount}`);
  console.log(`- Files unchanged: ${files.length - updatedCount}\n`);
  
  if (updatedFiles.length > 0) {
    console.log('✅ Updated files:');
    for (const { path: filePath, changes } of updatedFiles) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`\n${relativePath}:`);
      changes.forEach(change => console.log(change));
    }
  }
  
  console.log('\n✨ Import update complete!');
  console.log('\n⚠️  Next steps:');
  console.log('1. Run your tests to ensure everything still works');
  console.log('2. Run "npm run type-check" to verify TypeScript types');
  console.log('3. You may want to remove the old prisma files:');
  console.log('   - src/lib/prisma.ts');
  console.log('   - src/lib/prisma.js');
  console.log('   - src/lib/prisma-singleton.ts');
  console.log('   - src/lib/prisma-production.ts');
}

// Run the script
main().catch(error => {
  console.error('❌ Error updating imports:', error);
  process.exit(1);
});
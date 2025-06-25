#!/usr/bin/env node

/**
 * Advanced script to update Prisma imports with dry-run and backup options
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { createHash } from 'crypto';

interface UpdateOptions {
  dryRun: boolean;
  backup: boolean;
  verbose: boolean;
}

interface FileUpdate {
  path: string;
  originalContent: string;
  updatedContent: string;
  changes: string[];
  checksum: string;
}

const importPatterns = [
  // Standard imports with optional aliasing
  {
    pattern: /import\s+(\*\s+as\s+\w+|(?:\w+(?:\s*,\s*)?)?(?:\{[^}]+\})?)\s+from\s+['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: (match: string, imports: string) => {
      return `import ${imports} from '@/lib/database'`;
    },
    description: 'Import statements with various patterns'
  },
  // Export from statements
  {
    pattern: /export\s*(?:\*|\{[^}]+\})\s*from\s+['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: (match: string) => {
      return match.replace(/@\/lib\/prisma(-singleton|-production)?/, '@/lib/database');
    },
    description: 'Export from statements'
  },
  // Type imports
  {
    pattern: /import\s+type\s+(?:\{[^}]+\}|\w+)\s+from\s+['"]@\/lib\/prisma(-singleton|-production)?['"]/g,
    replacement: (match: string) => {
      return match.replace(/@\/lib\/prisma(-singleton|-production)?/, '@/lib/database');
    },
    description: 'Type import statements'
  },
  // Dynamic imports with await
  {
    pattern: /await\s+import\(['"]@\/lib\/prisma(-singleton|-production)?['"]\)/g,
    replacement: 'await import(\'@/lib/database\')',
    description: 'Async dynamic imports'
  },
  // Template literal imports
  {
    pattern: /import\(`@\/lib\/prisma(-singleton|-production)?`\)/g,
    replacement: 'import(`@/lib/database`)',
    description: 'Template literal imports'
  },
  // Comments that reference the old paths
  {
    pattern: /\/\/.*@\/lib\/prisma(-singleton|-production)?/g,
    replacement: (match: string) => {
      return match.replace(/@\/lib\/prisma(-singleton|-production)?/, '@/lib/database');
    },
    description: 'Comments with prisma references'
  },
  // JSDoc comments
  {
    pattern: /\*\s*@.*@\/lib\/prisma(-singleton|-production)?/g,
    replacement: (match: string) => {
      return match.replace(/@\/lib\/prisma(-singleton|-production)?/, '@/lib/database');
    },
    description: 'JSDoc comments'
  }
];

function parseArgs(): UpdateOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    backup: args.includes('--backup') || args.includes('-b'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
}

async function findFilesToUpdate(): Promise<string[]> {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    'tests/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    'scripts/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    'prisma/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    // Include config files
    '*.{js,ts,mjs,cjs}',
    'config/**/*.{js,ts,mjs,cjs}'
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
        '**/coverage/**',
        '**/.turbo/**',
        // Don't update the database module itself
        '**/src/lib/database/**',
        // Don't update the old prisma files
        '**/src/lib/prisma.ts',
        '**/src/lib/prisma.js',
        '**/src/lib/prisma-singleton.ts',
        '**/src/lib/prisma-production.ts',
        // Don't update scripts
        '**/update-prisma-imports*.ts',
        '**/verify-prisma-imports.ts'
      ]
    });
    files.push(...matches);
  }
  
  return [...new Set(files)];
}

function getFileChecksum(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

function backupFile(filePath: string, content: string): void {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, content, 'utf-8');
  console.log(`  📁 Backup created: ${path.basename(backupPath)}`);
}

function updateFileContent(content: string, filePath: string, options: UpdateOptions): { updatedContent: string; changes: string[] } {
  let updatedContent = content;
  const changes: string[] = [];
  
  for (const { pattern, replacement, description } of importPatterns) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      if (typeof replacement === 'function') {
        updatedContent = updatedContent.replace(pattern, replacement as any);
      } else {
        updatedContent = updatedContent.replace(pattern, replacement);
      }
      
      changes.push(`- ${description}: ${matches.length} occurrence(s)`);
      
      if (options.verbose) {
        matches.forEach((match, index) => {
          const lineNum = content.substring(0, match.index!).split('\n').length;
          console.log(`    Line ${lineNum}: ${match[0].trim()}`);
        });
      }
    }
  }
  
  return { updatedContent, changes };
}

async function main() {
  const options = parseArgs();
  
  console.log('🔍 Prisma Import Updater\n');
  
  if (options.dryRun) {
    console.log('🏃 Running in DRY-RUN mode (no files will be modified)\n');
  }
  
  if (options.backup && !options.dryRun) {
    console.log('💾 Backup mode enabled\n');
  }
  
  const files = await findFilesToUpdate();
  console.log(`Found ${files.length} files to check\n`);
  
  const updates: FileUpdate[] = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const { updatedContent, changes } = updateFileContent(content, file, options);
    
    if (updatedContent !== content) {
      updates.push({
        path: file,
        originalContent: content,
        updatedContent,
        changes,
        checksum: getFileChecksum(content)
      });
    }
  }
  
  if (updates.length === 0) {
    console.log('✅ No files need updating - all imports are already using @/lib/database');
    return;
  }
  
  console.log(`\n📊 Found ${updates.length} file(s) to update:\n`);
  
  for (const update of updates) {
    const relativePath = path.relative(process.cwd(), update.path);
    console.log(`📄 ${relativePath}`);
    update.changes.forEach(change => console.log(`  ${change}`));
    
    if (!options.dryRun) {
      if (options.backup) {
        backupFile(update.path, update.originalContent);
      }
      
      fs.writeFileSync(update.path, update.updatedContent, 'utf-8');
      console.log('  ✅ Updated');
    }
    
    console.log();
  }
  
  if (options.dryRun) {
    console.log('ℹ️  This was a dry run. To apply changes, run without --dry-run flag');
  } else {
    console.log('✨ Import update complete!');
    console.log('\n⚠️  Next steps:');
    console.log('1. Run "npm run type-check" to verify TypeScript types');
    console.log('2. Run your test suite to ensure everything works');
    console.log('3. If everything works, you can remove the old prisma files');
    
    if (options.backup) {
      console.log('\n💡 Tip: Delete backup files after verifying changes with:');
      console.log('   find . -name "*.backup-*" -type f -delete');
    }
  }
}

// Show usage if --help is passed
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Prisma Import Updater - Updates old Prisma imports to use @/lib/database

Usage: tsx scripts/update-prisma-imports-advanced.ts [options]

Options:
  -d, --dry-run    Show what would be changed without modifying files
  -b, --backup     Create backup files before modifying (*.backup-timestamp)
  -v, --verbose    Show detailed information about changes
  -h, --help       Show this help message

Examples:
  # Dry run to see what would change
  tsx scripts/update-prisma-imports-advanced.ts --dry-run

  # Update files with backups
  tsx scripts/update-prisma-imports-advanced.ts --backup

  # Verbose output with dry run
  tsx scripts/update-prisma-imports-advanced.ts -d -v
`);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
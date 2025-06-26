#!/usr/bin/env tsx

/**
 * Fix AbortSignal.timeout memory leak by replacing with managed fetch
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import glob from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);

// Files to update with managedFetch
const PATTERNS_TO_FIX = [
  'src/**/*.ts',
  'src/**/*.tsx',
];

async function fixAbortSignalMemoryLeak() {
  console.log('🔧 Fixing AbortSignal.timeout memory leak...\n');

  // Find all TypeScript files
  const allFiles: string[] = [];
  for (const pattern of PATTERNS_TO_FIX) {
    const files = await globAsync(pattern, { 
      cwd: process.cwd(),
      ignore: ['node_modules/**', 'backup_*/**', '**/fetch-manager.ts']
    });
    allFiles.push(...files);
  }

  let fixedCount = 0;
  let errorCount = 0;

  for (const file of allFiles) {
    try {
      const filePath = join(process.cwd(), file);
      let content = readFileSync(filePath, 'utf-8');
      let modified = false;

      // Check if file uses AbortSignal.timeout
      if (content.includes('AbortSignal.timeout')) {
        console.log(`📄 Processing: ${file}`);

        // Add import if not present
        if (!content.includes("import { managedFetch }") && 
            !content.includes('fetch-manager')) {
          
          // Find the right place to add import
          const importMatch = content.match(/^import .* from ['"].*['"];?\s*$/m);
          if (importMatch) {
            const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
            content = content.slice(0, lastImportIndex) + 
                     "\nimport { managedFetch } from '@/lib/fetch-manager';" +
                     content.slice(lastImportIndex);
            modified = true;
          } else {
            // Add at the beginning if no imports found
            content = "import { managedFetch } from '@/lib/fetch-manager';\n\n" + content;
            modified = true;
          }
        }

        // Replace fetch calls with AbortSignal.timeout
        const fetchRegex = /await\s+fetch\s*\(([\s\S]*?),\s*\{([\s\S]*?)signal:\s*AbortSignal\.timeout\((\d+)\)([\s\S]*?)\}\s*\)/g;
        
        content = content.replace(fetchRegex, (match, url, preSignal, timeout, postSignal) => {
          // Clean up the options - remove signal line
          let cleanedOptions = preSignal + postSignal;
          
          // Remove trailing comma if it exists after removing signal
          cleanedOptions = cleanedOptions.replace(/,\s*$/, '');
          
          modified = true;
          return `await managedFetch(${url}, {${cleanedOptions}timeout: ${timeout},\n      })`;
        });

        // Also handle cases where AbortSignal.timeout is on its own line
        const standaloneRegex = /signal:\s*AbortSignal\.timeout\((\d+)\),?/g;
        if (content.includes('signal: AbortSignal.timeout')) {
          content = content.replace(standaloneRegex, 'timeout: $1,');
          modified = true;
        }

        if (modified) {
          // Clean up any double commas or trailing commas before closing braces
          content = content.replace(/,\s*,/g, ',');
          content = content.replace(/,\s*\}/g, '\n      }');
          
          writeFileSync(filePath, content);
          console.log(`  ✅ Fixed ${file}`);
          fixedCount++;
        }
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Fixed: ${fixedCount} files`);
  console.log(`  ❌ Errors: ${errorCount} files`);
  console.log(`  📁 Total scanned: ${allFiles.length} files`);
  
  if (fixedCount > 0) {
    console.log('\n💡 Next steps:');
    console.log('  1. Run "npm run typecheck" to verify no TypeScript errors');
    console.log('  2. Restart your development server');
    console.log('  3. The memory leak warning should be resolved');
  }
}

// Run the fix
fixAbortSignalMemoryLeak().catch(console.error);
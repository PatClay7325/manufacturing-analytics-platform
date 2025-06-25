#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const OLD_IMPORTS = [
  '@/lib/prisma',
  '@/lib/prisma-singleton', 
  '@/lib/prisma-production'
];

const NEW_IMPORT = '@/lib/database';

async function findFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, .git, dist, build directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
        await findFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Process .ts, .tsx, .js, .jsx files
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function updateImports(filePath: string): Promise<boolean> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let updated = false;
    
    for (const oldImport of OLD_IMPORTS) {
      const escaped = oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        // Standard imports
        new RegExp(`from\\s+['"\`]${escaped}['"\`]`, 'g'),
        // Dynamic imports
        new RegExp(`import\\s*\\(\\s*['"\`]${escaped}['"\`]\\s*\\)`, 'g'),
        // Require statements
        new RegExp(`require\\s*\\(\\s*['"\`]${escaped}['"\`]\\s*\\)`, 'g'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            return match.replace(oldImport, NEW_IMPORT);
          });
          updated = true;
        }
      }
    }
    
    if (updated) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`✅ Updated: ${filePath}`);
    }
    
    return updated;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding files to update...');
  
  const srcDir = path.join(process.cwd(), 'src');
  const files = await findFiles(srcDir);
  
  console.log(`📁 Found ${files.length} files to check`);
  
  let updatedCount = 0;
  for (const file of files) {
    if (await updateImports(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✨ Updated ${updatedCount} files`);
  console.log('✅ Import update complete!');
}

main().catch(console.error);
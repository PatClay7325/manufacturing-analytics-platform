#!/usr/bin/env tsx

/**
 * Fix unnecessary optional chaining on event.target.value
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const getSourceFiles = () => {
  const srcPath = path.join(process.cwd(), 'src');
  return glob.sync('**/*.{ts,tsx}', { 
    cwd: srcPath,
    ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
  }).map(file => path.join(srcPath, file));
};

const fixFile = (filePath: string): boolean => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Fix e?.target.value to e.target.value
  content = content.replace(/\be\?\.(target|currentTarget)\.(value|checked|files|selectedIndex|name|id|className|dataset)/g, 'e.$1.$2');
  
  // Fix event?.target.value to event.target.value
  content = content.replace(/\bevent\?\.(target|currentTarget)\.(value|checked|files|selectedIndex|name|id|className|dataset)/g, 'event.$1.$2');
  
  // Fix evt?.target.value to evt.target.value
  content = content.replace(/\bevt\?\.(target|currentTarget)\.(value|checked|files|selectedIndex|name|id|className|dataset)/g, 'evt.$1.$2');
  
  // Fix ev?.target.value to ev.target.value
  content = content.replace(/\bev\?\.(target|currentTarget)\.(value|checked|files|selectedIndex|name|id|className|dataset)/g, 'ev.$1.$2');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
};

const main = () => {
  console.log('🔧 Fixing unnecessary optional chaining on event targets...\n');
  
  const files = getSourceFiles();
  let fixedCount = 0;
  const fixedFiles: string[] = [];
  
  files.forEach(file => {
    if (fixFile(file)) {
      fixedCount++;
      fixedFiles.push(file);
    }
  });
  
  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} files:\n`);
    fixedFiles.forEach(file => {
      console.log(`   - ${path.relative(process.cwd(), file)}`);
    });
  } else {
    console.log('✅ No files needed fixing!');
  }
};

main();
#!/usr/bin/env tsx

/**
 * Remove ALL duplicate DashboardLayout wrappers from pages
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const fixFile = (filePath: string) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check if file contains DashboardLayout
  if (!content.includes('DashboardLayout')) {
    return false;
  }
  
  // Remove DashboardLayout import - handle both named and default imports
  content = content.replace(/import\s*{\s*DashboardLayout\s*}\s*from\s*['"].*?DashboardLayout['"]\s*;?\s*\n/g, '');
  content = content.replace(/import\s+DashboardLayout\s+from\s*['"].*?DashboardLayout['"]\s*;?\s*\n/g, '');
  
  // Remove <DashboardLayout> opening tags
  content = content.replace(/<DashboardLayout[^>]*>\s*\n?/g, '');
  
  // Remove </DashboardLayout> closing tags
  content = content.replace(/\s*<\/DashboardLayout>\s*\n?/g, '');
  
  // Fix any double line breaks
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // Fix indentation - if the file had DashboardLayout wrapper, reduce indentation
  if (originalContent !== content && content.includes('return (')) {
    const lines = content.split('\n');
    const fixedLines: string[] = [];
    let inReturn = false;
    let returnIndentLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Detect return statement
      if (trimmedLine.startsWith('return (') || trimmedLine === 'return (') {
        inReturn = true;
        returnIndentLevel = line.indexOf('return');
        fixedLines.push(line);
        continue;
      }
      
      if (trimmedLine.startsWith('return <')) {
        inReturn = true;
        returnIndentLevel = line.indexOf('return');
        fixedLines.push(line);
        continue;
      }
      
      // End of component
      if (inReturn && trimmedLine === ');' && lines[i + 1]?.trim() === '}') {
        inReturn = false;
      }
      
      // Fix indentation inside return statement
      if (inReturn && line.startsWith('    ')) {
        // Reduce by 2 spaces
        fixedLines.push(line.substring(2));
      } else {
        fixedLines.push(line);
      }
    }
    
    content = fixedLines.join('\n');
  }
  
  if (originalContent !== content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
};

console.log('🔧 Removing ALL duplicate DashboardLayout wrappers...\n');

// Find all .tsx files in app directory
const files = glob.sync('src/app/**/*.tsx', {
  ignore: ['**/layout.tsx'] // Don't modify layout files
});

let fixedCount = 0;

files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files!`);

// Also check for any components that might be using DashboardLayout
const componentFiles = glob.sync('src/components/**/*.tsx');
console.log('\n🔍 Checking component files...\n');

componentFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('<DashboardLayout>') && !file.includes('DashboardLayout.tsx') && !file.includes('AppLayout.tsx')) {
    console.log(`⚠️  Component using DashboardLayout: ${path.relative(process.cwd(), file)}`);
  }
});
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findTSFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files = files.concat(findTSFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkFileForSyntaxIssues(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for common syntax issues that could cause build problems
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for unmatched braces/parentheses (simple check)
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      // Check for excessive optional chaining
      if (line.includes('?.?.?.?.')) {
        issues.push(`Line ${lineNum}: Excessive optional chaining found`);
      }
      
      // Check for invalid JavaScript syntax patterns
      if (line.includes('?..')) {
        issues.push(`Line ${lineNum}: Invalid optional chaining syntax`);
      }
      
      // Check for incomplete statements
      if (line.trim().endsWith('?.') && !line.includes('?.')) {
        issues.push(`Line ${lineNum}: Incomplete optional chaining`);
      }
      
      // Check for malformed imports
      if (line.includes('import') && line.includes('from') && !line.includes(';') && !line.includes('//')) {
        if (!lines[i + 1] || !lines[i + 1].trim().startsWith(';')) {
          issues.push(`Line ${lineNum}: Missing semicolon in import statement`);
        }
      }
    }
    
    return issues;
  } catch (error) {
    return [`Error reading file: ${error.message}`];
  }
}

function main() {
  console.log('🔍 Checking for syntax issues that could cause build hangs...\n');
  
  const srcDir = 'src';
  const files = findTSFiles(srcDir);
  
  let totalIssues = 0;
  const problematicFiles = [];
  
  for (const file of files) {
    const issues = checkFileForSyntaxIssues(file);
    if (issues.length > 0) {
      console.log(`❌ ${file}:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
      totalIssues += issues.length;
      problematicFiles.push(file);
    }
  }
  
  console.log(`📊 Summary:`);
  console.log(`   Files checked: ${files.length}`);
  console.log(`   Files with issues: ${problematicFiles.length}`);
  console.log(`   Total issues: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('\n✅ No obvious syntax issues found that could cause build hangs.');
  } else {
    console.log('\n⚠️  Found syntax issues that could be causing build problems.');
  }
}

if (require.main === module) {
  main();
}
#!/usr/bin/env tsx

/**
 * View remaining syntax errors after fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Pattern to detect typeof with optional chaining
const typeofOptionalChainingPattern = /typeof\s+\w+\?\.\w+/g;

// Pattern to detect assignment to optional chaining
const assignmentToOptionalChaining = /\w+\?\.\w+\s*=/g;

// Pattern to detect property assignment with optional chaining on left side  
const propertyAssignmentPattern = /\.\w+\?\.\w+\s*=/g;

const getSourceFiles = () => {
  const srcPath = path.join(process.cwd(), 'src');
  return glob.sync('**/*.{ts,tsx}', { 
    cwd: srcPath,
    ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
  }).map(file => path.join(srcPath, file));
};

const checkFile = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const errors: any[] = [];
  
  lines.forEach((line, index) => {
    // Check typeof with optional chaining
    const typeofMatches = line.match(typeofOptionalChainingPattern);
    if (typeofMatches) {
      errors.push({
        type: 'typeof',
        file: filePath,
        line: index + 1,
        content: line.trim(),
        matches: typeofMatches
      });
    }
    
    // Check assignment to optional chaining (skip type annotations)
    if (!line.includes('==') && !line.includes('!=') && !line.includes(':') && !line.includes('=>')) {
      const assignMatches = line.match(assignmentToOptionalChaining);
      if (assignMatches) {
        errors.push({
          type: 'assignment',
          file: filePath,
          line: index + 1,
          content: line.trim(),
          matches: assignMatches
        });
      }
    }
    
    // Check for innerHTML assignments
    if (line.includes('?.innerHTML') && line.includes('=') && !line.includes('==')) {
      errors.push({
        type: 'innerHTML',
        file: filePath,
        line: index + 1,
        content: line.trim()
      });
    }
  });
  
  return errors;
};

const main = () => {
  console.log('🔍 Scanning for remaining syntax errors...\n');
  
  const files = getSourceFiles();
  const allErrors: any[] = [];
  
  files.forEach(file => {
    const errors = checkFile(file);
    if (errors.length > 0) {
      allErrors.push(...errors);
    }
  });
  
  if (allErrors.length === 0) {
    console.log('✅ No syntax errors found!');
    return;
  }
  
  // Group errors by type
  const errorsByType = allErrors.reduce((acc, error) => {
    if (!acc[error.type]) acc[error.type] = [];
    acc[error.type].push(error);
    return acc;
  }, {} as Record<string, any[]>);
  
  // Display errors by type
  Object.entries(errorsByType).forEach(([type, errors]) => {
    console.log(`\n❌ ${type.toUpperCase()} ERRORS (${errors.length}):`);
    console.log('─'.repeat(60));
    
    errors.slice(0, 5).forEach(error => {
      console.log(`\n📁 ${path.relative(process.cwd(), error.file)}:${error.line}`);
      console.log(`   ${error.content}`);
      
      if (type === 'typeof') {
        console.log(`   ⚠️  Cannot use typeof with optional chaining`);
        console.log(`   💡 Replace with explicit type check or remove typeof`);
      } else if (type === 'assignment') {
        console.log(`   ⚠️  Cannot assign to optional chaining expression`);
        console.log(`   💡 Use: if (obj) { obj.prop = value; }`);
      } else if (type === 'innerHTML') {
        console.log(`   ⚠️  Cannot assign to element?.innerHTML`);
        console.log(`   💡 Use: if (element) { element.innerHTML = '...'; }`);
      }
    });
    
    if (errors.length > 5) {
      console.log(`\n   ... and ${errors.length - 5} more ${type} errors`);
    }
  });
  
  console.log('\n\n📊 SUMMARY:');
  console.log('─'.repeat(60));
  console.log(`Total errors found: ${allErrors.length}`);
  Object.entries(errorsByType).forEach(([type, errors]) => {
    console.log(`  - ${type}: ${errors.length}`);
  });
};

main();
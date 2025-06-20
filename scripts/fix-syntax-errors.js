#!/usr/bin/env node

/**
 * Fix syntax errors caused by overly aggressive optional chaining
 * This script identifies and fixes invalid optional chaining usage
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns that should NOT have optional chaining
const invalidOptionalChaining = [
  {
    // JSX components should not use optional chaining
    pattern: /<(\w+)(\?\.)(\w+)/g,
    fix: (match, component, optional, prop) => `<${component}${prop}`,
    description: 'Remove optional chaining from JSX component names'
  },
  {
    // CSS imports should not use optional chaining
    pattern: /import\s+['"](.*?)\?\.(.*?)['"]/g,
    fix: (match, before, after) => `import '${before}.${after}'`,
    description: 'Remove optional chaining from import paths'
  },
  {
    // Assignment to this.state should not use optional chaining
    pattern: /this\?\.(state|props|refs)\s*=/g,
    fix: (match, property) => `this.${property} =`,
    description: 'Remove optional chaining from this assignments'
  },
  {
    // Variable assignments should not use optional chaining
    pattern: /(\w+)\?\.(current|value|length)\s*=/g,
    fix: (match, variable, property) => `${variable}.${property} =`,
    description: 'Remove optional chaining from direct assignments'
  },
  {
    // Context providers should not use optional chaining
    pattern: /<(\w+Context)\?\.(Provider|Consumer)/g,
    fix: (match, context, type) => `<${context}.${type}`,
    description: 'Remove optional chaining from React context'
  },
  {
    // Mathematical operations should not use optional chaining for numbers
    pattern: /(\d+)\?\.(toFixed|toString|toLocaleString)/g,
    fix: (match, number, method) => `${number}.${method}`,
    description: 'Remove optional chaining from number literals'
  },
  {
    // Known safe objects should not use optional chaining
    pattern: /(Math|Object|Array|JSON|console|window|document|process)\?\./g,
    fix: (match, obj) => `${obj}.`,
    description: 'Remove optional chaining from known safe global objects'
  }
];

// TypeScript/JSX specific fixes
const tsxFixes = [
  {
    // Fix interface property assignments
    pattern: /(\w+):\s*(\w+)\?\./g,
    fix: (match, key, type) => `${key}: ${type}.`,
    description: 'Remove optional chaining from type annotations'
  }
];

function findReactFiles() {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'app/**/*.{ts,tsx,js,jsx}'
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    const found = glob.sync(pattern, { cwd: process.cwd() });
    files = files.concat(found);
  });
  
  return files.filter(file => 
    !file.includes('node_modules') &&
    !file.includes('.test.') &&
    !file.includes('.spec.') &&
    !file.includes('dist/') &&
    !file.includes('build/')
  );
}

function fixSyntaxErrors(filePath, dryRun = false) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let fixedContent = originalContent;
  const appliedFixes = [];
  
  // Apply syntax error fixes
  invalidOptionalChaining.forEach(({ pattern, fix, description }) => {
    const matches = fixedContent.match(pattern);
    if (matches) {
      fixedContent = fixedContent.replace(pattern, fix);
      appliedFixes.push({
        description,
        count: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  });
  
  // Apply TypeScript specific fixes for .tsx files
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    tsxFixes.forEach(({ pattern, fix, description }) => {
      const matches = fixedContent.match(pattern);
      if (matches) {
        fixedContent = fixedContent.replace(pattern, fix);
        appliedFixes.push({
          description,
          count: matches.length
        });
      }
    });
  }
  
  // Only write if there were changes and not a dry run
  if (fixedContent !== originalContent && !dryRun) {
    fs.writeFileSync(filePath, fixedContent);
  }
  
  return {
    changed: fixedContent !== originalContent,
    fixes: appliedFixes,
    hasErrors: checkForSyntaxErrors(fixedContent)
  };
}

function checkForSyntaxErrors(content) {
  const errorPatterns = [
    /×.*Unexpected token/,
    /Expected jsx identifier/,
    /Module not found.*\?\./,
    /left-hand side.*assignment.*property access/,
    /<\w+\?\./,  // JSX with optional chaining
    /import.*\?\./  // Import with optional chaining
  ];
  
  return errorPatterns.some(pattern => pattern.test(content));
}

function validateTypeScript(filePath) {
  try {
    // Basic TypeScript/JSX validation
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for common syntax issues
    const issues = [];
    
    // Check for invalid JSX
    if (content.includes('<') && filePath.endsWith('.tsx')) {
      const jsxOptionalChaining = content.match(/<\w+\?\./g);
      if (jsxOptionalChaining) {
        issues.push(`Invalid JSX optional chaining: ${jsxOptionalChaining.join(', ')}`);
      }
    }
    
    // Check for invalid imports
    const invalidImports = content.match(/import.*['"]\.\w*\?\./g);
    if (invalidImports) {
      issues.push(`Invalid import paths: ${invalidImports.join(', ')}`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      valid: false,
      issues: [error.message]
    };
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'fix';
  
  switch (command) {
    case 'fix':
      const dryRun = args.includes('--dry-run');
      const files = findReactFiles();
      let totalFixed = 0;
      let totalErrors = 0;
      
      console.log(`🔧 ${dryRun ? 'Analyzing' : 'Fixing'} syntax errors in ${files.length} files...`);
      
      files.forEach(filePath => {
        const result = fixSyntaxErrors(filePath, dryRun);
        if (result.changed) {
          totalFixed++;
          console.log(`${dryRun ? '🔍' : '✅'} ${dryRun ? 'Would fix' : 'Fixed'} ${filePath}`);
          result.fixes.forEach(fix => {
            console.log(`   - ${fix.description} (${fix.count} instances)`);
            if (fix.examples) {
              console.log(`     Examples: ${fix.examples.join(', ')}`);
            }
          });
        }
        
        if (result.hasErrors) {
          totalErrors++;
          console.log(`❌ Still has syntax errors: ${filePath}`);
        }
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`${dryRun ? 'Would fix' : 'Fixed'}: ${totalFixed} files`);
      console.log(`Files with remaining errors: ${totalErrors}`);
      
      if (totalErrors > 0) {
        console.log(`\n⚠️  Run with --validate to see specific error details`);
      }
      break;
      
    case 'validate':
      const filesToValidate = findReactFiles();
      let validFiles = 0;
      let invalidFiles = 0;
      
      console.log(`🔍 Validating ${filesToValidate.length} TypeScript/JSX files...`);
      
      filesToValidate.forEach(filePath => {
        const validation = validateTypeScript(filePath);
        if (validation.valid) {
          validFiles++;
        } else {
          invalidFiles++;
          console.log(`❌ ${filePath}:`);
          validation.issues.forEach(issue => {
            console.log(`   - ${issue}`);
          });
        }
      });
      
      console.log(`\n📊 Validation Summary:`);
      console.log(`✅ Valid files: ${validFiles}`);
      console.log(`❌ Files with issues: ${invalidFiles}`);
      break;
      
    case 'check':
      // Quick check for common syntax errors
      const checkFiles = findReactFiles();
      let errorCount = 0;
      
      console.log(`🔍 Quick syntax check on ${checkFiles.length} files...`);
      
      checkFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (checkForSyntaxErrors(content)) {
            errorCount++;
            console.log(`❌ Potential syntax errors in: ${filePath}`);
          }
        } catch (error) {
          console.log(`❌ Cannot read: ${filePath}`);
        }
      });
      
      console.log(`\n📊 Found potential errors in ${errorCount} files`);
      if (errorCount === 0) {
        console.log(`✅ All files passed quick syntax check!`);
      }
      break;
      
    default:
      console.log(`Usage: node ${__filename} <command>
      
Commands:
  fix [--dry-run]     - Fix syntax errors caused by optional chaining
  validate           - Validate TypeScript/JSX syntax
  check              - Quick check for common syntax errors
  
Examples:
  node ${__filename} fix --dry-run
  node ${__filename} fix
  node ${__filename} validate
  node ${__filename} check`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixSyntaxErrors, validateTypeScript, checkForSyntaxErrors };
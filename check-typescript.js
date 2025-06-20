const fs = require('fs');
const path = require('path');

// Check for common TypeScript/Next.js build issues
console.log('🔍 Checking for common build issues...\n');

const srcDir = path.join(__dirname, 'src');

// Common issues that cause build failures
const issues = [
  {
    name: 'Missing imports',
    check: (content, file) => {
      const errors = [];
      
      // Check for JSX without React import (in older React versions)
      if (content.includes('<') && content.includes('>') && !content.includes("'use client'") && !content.includes('import React')) {
        errors.push('Missing React import for JSX');
      }
      
      // Check for undefined components/functions
      const componentMatches = content.match(/<([A-Z][a-zA-Z0-9]*)/g);
      if (componentMatches) {
        componentMatches.forEach(match => {
          const component = match.slice(1);
          if (!content.includes(`import.*${component}`) && !content.includes(`const ${component}`) && !content.includes(`function ${component}`)) {
            // Common components that should be imported
            if (['PageLayout', 'Link', 'LoadingSpinner', 'AlertBadge'].includes(component)) {
              errors.push(`Possibly missing import for ${component}`);
            }
          }
        });
      }
      
      return errors;
    }
  },
  {
    name: 'Type errors',
    check: (content, file) => {
      const errors = [];
      
      // Check for common type issues
      if (content.includes('any[]') && !content.includes('// @ts-ignore')) {
        errors.push('Using any[] type - consider proper typing');
      }
      
      // Check for missing return types on functions
      const funcMatches = content.match(/export\s+(async\s+)?function\s+\w+\s*\([^)]*\)\s*{/g);
      if (funcMatches) {
        funcMatches.forEach(match => {
          if (!match.includes(':') && !match.includes('React.FC')) {
            errors.push('Function missing return type annotation');
          }
        });
      }
      
      return errors;
    }
  },
  {
    name: 'Syntax errors',
    check: (content, file) => {
      const errors = [];
      
      // Check for remaining syntax issues
      const syntaxPatterns = [
        { pattern: /\.\(\(/g, name: 'Double parentheses in chaining' },
        { pattern: /href="\s*\/>/g, name: 'Broken href attribute' },
        { pattern: /className="[^"]*\s*\/>/g, name: 'Broken className' },
        { pattern: /<\w+\s+>/g, name: 'Element with trailing space' },
        { pattern: /}\s*{\s*{/g, name: 'Malformed JSX braces' }
      ];
      
      syntaxPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
          errors.push(name);
        }
      });
      
      return errors;
    }
  }
];

function findTSXFiles(dir) {
  const files = [];
  
  function walk(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walk(fullPath);
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  walk(dir);
  return files;
}

const files = findTSXFiles(srcDir);
let totalIssues = 0;
const fileIssues = [];

console.log(`Checking ${files.length} TypeScript files...\n`);

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(__dirname, file);
    const fileErrors = [];

    issues.forEach(({ name, check }) => {
      const errors = check(content, file);
      errors.forEach(error => {
        fileErrors.push(`${name}: ${error}`);
      });
    });

    if (fileErrors.length > 0) {
      fileIssues.push({
        file: relativeFile,
        errors: fileErrors
      });
      totalIssues += fileErrors.length;
    }
  } catch (error) {
    console.log(`❌ Error reading ${file}: ${error.message}`);
  }
}

if (totalIssues === 0) {
  console.log('✅ No major issues found in TypeScript files!');
  console.log('\n🚀 Project appears ready for build. Common build blockers checked:');
  console.log('   • Import statements');
  console.log('   • Component definitions');
  console.log('   • Syntax errors');
  console.log('   • Type annotations');
} else {
  console.log(`⚠️  Found ${totalIssues} potential issues in ${fileIssues.length} files:\n`);
  
  fileIssues.slice(0, 10).forEach(({ file, errors }) => {
    console.log(`📄 ${file}:`);
    errors.forEach(error => {
      console.log(`   • ${error}`);
    });
    console.log('');
  });
  
  if (fileIssues.length > 10) {
    console.log(`... and ${fileIssues.length - 10} more files with issues`);
  }
}

console.log(`\n📊 Summary: ${totalIssues} issues found in ${fileIssues.length}/${files.length} files`);
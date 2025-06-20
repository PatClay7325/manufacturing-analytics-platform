const fs = require('fs');
const path = require('path');

// Common syntax patterns that cause build failures
const syntaxPatterns = [
  // Broken href patterns
  { pattern: /href="\s*\/>/g, name: 'Broken href with />' },
  // Broken className patterns  
  { pattern: /className="[^"]*\s*\/>/g, name: 'Broken className with />' },
  // Empty div patterns
  { pattern: /<div\s+>/g, name: 'Empty div with space' },
  // Double parentheses in optional chaining
  { pattern: /\.\(\(/g, name: 'Double parentheses in optional chaining' },
  // Malformed optional chaining
  { pattern: /\w+\?\.\(/g, name: 'Incorrect optional chaining with parentheses' },
  // Unit issues
  { pattern: /units\s*\/>/g, name: 'Broken units syntax' },
  // Broken xmlns
  { pattern: /xmlns="http:\s*\/>/g, name: 'Broken xmlns attribute' },
  // Missing closing angle bracket
  { pattern: /<\w+[^>]*\s+>/g, name: 'Element with trailing space before >' },
  // JSX syntax errors
  { pattern: /}\s*{\s*{/g, name: 'Malformed JSX braces' },
  // Assignment in conditions
  { pattern: /while\s*\(\s*\w+\s*=\s*[^)]+\)\s*!==/g, name: 'Assignment in while condition' }
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const errors = [];

    lines.forEach((line, index) => {
      syntaxPatterns.forEach(({pattern, name}) => {
        if (pattern.test(line)) {
          errors.push({
            line: index + 1,
            type: name,
            content: line.trim()
          });
        }
      });
    });

    return errors;
  } catch (error) {
    return [{ line: 0, type: 'File Error', content: error.message }];
  }
}

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function walkDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`Error reading directory ${currentPath}: ${error.message}`);
    }
  }
  
  walkDir(dir);
  return files;
}

// Main validation
console.log('🔍 Validating syntax in TypeScript/JavaScript files...\n');

const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

console.log(`Found ${files.length} files to check\n`);

let totalErrors = 0;
const fileErrors = [];

for (const file of files) {
  const errors = checkFile(file);
  if (errors.length > 0) {
    const relativePath = path.relative(__dirname, file);
    fileErrors.push({ file: relativePath, errors });
    totalErrors += errors.length;
  }
}

if (totalErrors === 0) {
  console.log('✅ No syntax errors found! Build should succeed.');
} else {
  console.log(`❌ Found ${totalErrors} syntax errors in ${fileErrors.length} files:\n`);
  
  fileErrors.forEach(({file, errors}) => {
    console.log(`📄 ${file}:`);
    errors.forEach(error => {
      console.log(`  Line ${error.line}: ${error.type}`);
      if (error.content) {
        console.log(`    ${error.content}`);
      }
    });
    console.log('');
  });
  
  console.log('\n🔧 These errors need to be fixed before the build can succeed.');
}

console.log(`\n📊 Summary: ${totalErrors} errors in ${fileErrors.length} files out of ${files.length} total files checked.`);
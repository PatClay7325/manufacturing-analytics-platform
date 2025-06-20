import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Main syntax patterns to check
const syntaxPatterns = [
  // Broken href patterns
  { pattern: /href="\s*\/>/g, description: 'Broken href with />' },
  // Broken className patterns  
  { pattern: /className="[^"]*\/>/g, description: 'Broken className with />' },
  // Empty div patterns
  { pattern: /<div\s+>/, description: 'Empty div with space' },
  // Double parentheses in optional chaining
  { pattern: /\.\(\(/g, description: 'Double parentheses in optional chaining' },
  // Malformed optional chaining
  { pattern: /\?\.\(/g, description: 'Incorrect optional chaining with parentheses' },
  // Unit issues
  { pattern: /units\s*\/>/g, description: 'Broken units syntax' }
];

async function checkSyntaxErrors() {
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    cwd: '/mnt/d/Source/manufacturing-analytics-platform',
    absolute: true
  });

  console.log(`Checking ${files.length} files for syntax errors...`);
  
  let totalErrors = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const errors: Array<{line: number, pattern: string, match: string}> = [];
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      syntaxPatterns.forEach(({pattern, description}) => {
        const matches = line.match(pattern);
        if (matches) {
          errors.push({
            line: index + 1,
            pattern: description,
            match: matches[0]
          });
        }
      });
    });
    
    if (errors.length > 0) {
      console.log(`\n❌ ${path.relative('/mnt/d/Source/manufacturing-analytics-platform', file)}`);
      errors.forEach(error => {
        console.log(`  Line ${error.line}: ${error.pattern} - "${error.match}"`);
      });
      totalErrors += errors.length;
    }
  }
  
  if (totalErrors === 0) {
    console.log('\n✅ No syntax errors found!');
  } else {
    console.log(`\n❌ Found ${totalErrors} syntax errors`);
  }
}

checkSyntaxErrors().catch(console.error);
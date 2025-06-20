import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

interface SyntaxFix {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const syntaxFixes: SyntaxFix[] = {
  // Fix numeric optional chaining
  {
    pattern: /(\d+)\?\.([$\w]+)/g,
    replacement: '$1?.$2',
    description: 'Fix numeric optional chaining'
  },
  
  // Fix typeof with optional chaining
  {
    pattern: /typeof\s+(\w+)\?\.([$\w]+)/g,
    replacement: 'typeof $1?.$2',
    description: 'Fix typeof with optional chaining'
  },
  
  // Fix malformed xmlns attributes
  {
    pattern: /xmlns="([^"]*)\?([^"]*)"/g,
    replacement: 'xmlns="$1$2"',
    description: 'Fix malformed xmlns attributes'
  },
  
  // Fix double dots
  {
    pattern: /\.\.(\w+)/g,
    replacement: '.$1',
    description: 'Fix double dots in property access'
  },
  
  // Fix empty JSX expressions
  {
    pattern: /{[\s]*}/g,
    replacement: '{null}',
    description: 'Fix empty JSX expressions'
  },
  
  // Fix self-closing tags
  {
    pattern: /<(\w+)([^>]*?)\s*\/(?!>)/g,
    replacement: '<$1$2 />',
    description: 'Fix self-closing tags'
  },
  
  // Fix unclosed template literals (basic)
  {
    pattern: /`([^`\n]*)\n/g,
    replacement: (match, content) => {
      if (!match.includes('`')) {
        return '`' + content + '`\n';
      }
      return match;
    },
    description: 'Fix unclosed template literals'
  },
  
  // Fix trailing commas in function calls
  {
    pattern: /,(\s*\))/g,
    replacement: '$1',
    description: 'Remove trailing commas in function calls'
  },
  
  // Fix missing semicolons after variable declarations
  {
    pattern: /(const|let|var)\s+(\w+)\s*=\s*([^;\n]+)\n/g,
    replacement: '$1 $2 = $3;\n',
    description: 'Add missing semicolons'
  },
  
  // Fix incorrect optional chaining assignments
  {
    pattern: /(\w+)\?\.([$\w]+)\s*=/g,
    replacement: (match, obj, prop) => {
      return `if (${obj}) { ${obj}.${prop} =`;
    },
    description: 'Fix assignment to optional chaining'
  }
];

async function fixSyntaxErrors() {
  const projectRoot = process.cwd();
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'],
    absolute: true
  });

  let totalFixes = 0;
  const fixedFiles: Record<string, number> = {};

  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    let originalContent = content;
    let fileFixes = 0;

    for (const fix of syntaxFixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement as any);
        fileFixes += matches.length;
        console.log(`  ✓ ${fix.description}: ${matches.length} fixes`);
      }
    }

    if (content !== originalContent) {
      await fs.writeFile(file, content, 'utf-8');
      fixedFiles[path.relative(projectRoot, file)] = fileFixes;
      totalFixes += fileFixes;
    }
  }

  console.log('\n========================================');
  console.log('Syntax Fix Summary');
  console.log('========================================\n');

  if (totalFixes > 0) {
    console.log(`✅ Fixed ${totalFixes} syntax errors in ${Object.keys(fixedFiles).length} files:\n`);
    for (const [file, count] of Object.entries(fixedFiles)) {
      console.log(`  📄 ${file}: ${count} fixes`);
    }
  } else {
    console.log('✨ No syntax errors found to fix!');
  }

  return totalFixes;
}

// Run if called directly
if (require.main === module) {
  fixSyntaxErrors().catch(console.error);
}

export { fixSyntaxErrors };
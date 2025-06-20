import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { parse } from '@babel/parser';

interface SyntaxFix {
  name: string;
  pattern: RegExp;
  fix: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const syntaxFixes: SyntaxFix[] = [
  // Fix incorrect optional chaining with parentheses
  {
    name: 'incorrect-optional-chaining-parentheses',
    pattern: /(\w+)\?\.\((\w+)\s*\|\|\s*([^)]+)\)/g,
    fix: (match: string, obj: string, prop: string, fallback: string) => {
      return `(${obj}?.${prop} || ${fallback})`;
    },
    description: 'Fix (obj?.prop || default) to (obj?.prop || default)'
  },
  
  // Fix numeric optional chaining
  {
    name: 'numeric-optional-chaining',
    pattern: /(\d+)\?\.([$\w]+)/g,
    fix: '$1.$2',
    description: 'Fix numeric optional chaining (e.g., 0?.1 to 0.1)'
  },
  
  // Fix typeof with optional chaining
  {
    name: 'typeof-optional-chaining',
    pattern: /typeof\s+(\w+)\?\.([$\w]+)/g,
    fix: 'typeof ($1?.$2)',
    description: 'Fix typeof obj?.prop to typeof (obj?.prop)'
  },
  
  // Fix assignment to optional chaining
  {
    name: 'assignment-to-optional-chaining',
    pattern: /(\w+)\?\.([$\w]+)\s*=\s*(.+?)([;\n])/g,
    fix: (match: string, obj: string, prop: string, value: string, terminator: string) => {
      return `if (${obj}) { ${obj}.${prop} = ${value}${terminator}`;
    },
    description: 'Fix assignment to optional chaining'
  },
  
  // Fix malformed xmlns attributes
  {
    name: 'malformed-xmlns',
    pattern: /xmlns="([^"]*)\?([^"]*)"/g,
    fix: 'xmlns="$1$2"',
    description: 'Fix malformed xmlns attributes'
  },
  
  // Fix double dots in property access
  {
    name: 'double-dots',
    pattern: /\.\.(\w+)/g,
    fix: '.$1',
    description: 'Fix double dots in property access'
  },
  
  // Fix empty JSX expressions
  {
    name: 'empty-jsx-expression',
    pattern: /\{[\s]*\}/g,
    fix: '{null}',
    description: 'Fix empty JSX expressions'
  },
  
  // Fix self-closing tags without proper closing
  {
    name: 'self-closing-tags',
    pattern: /<(\w+)([^>]*?)\s*\/(?!>)/g,
    fix: '<$1$2 />',
    description: 'Fix self-closing tags'
  },
  
  // Fix missing array fallback parentheses
  {
    name: 'missing-array-fallback-parentheses',
    pattern: /(\w+)\?\.([\w.]+)\s*\|\|\s*\[\](?![)])/g,
    fix: '($1?.$2 || [])',
    description: 'Add parentheses to optional chaining with array fallback'
  },
  
  // Fix incorrect method chaining after optional
  {
    name: 'incorrect-method-chaining',
    pattern: /(\w+)\?\.\(([^)]+)\)\.(map|filter|forEach|reduce|find|some|every)/g,
    fix: (match: string, obj: string, prop: string, method: string) => {
      // Handle the case where prop contains '||'
      if (prop.includes('||')) {
        const [actualProp, fallback] = prop.split('||').map(s => s.trim());
        return `(${obj}?.${actualProp} || ${fallback}).${method}`;
      }
      return `${obj}?.${prop}.${method}`;
    },
    description: 'Fix method chaining after optional chaining'
  },
  
  // Fix double question marks in URLs
  {
    name: 'double-question-marks-url',
    pattern: /(https?:\/\/[^"'\s]*)\?\?([^"'\s]*)/g,
    fix: '$1?$2',
    description: 'Fix double question marks in URLs'
  },
  
  // Fix trailing commas in function parameters (ES5 compat)
  {
    name: 'trailing-comma-params',
    pattern: /,(\s*\))/g,
    fix: '$1',
    description: 'Remove trailing commas in function parameters'
  }
];

async function findAndFixSyntaxErrors() {
  const projectRoot = process.cwd();
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**'
    ],
    absolute: true
  });

  console.log(`\n🔍 Scanning ${files.length} files for syntax errors...\n`);

  let totalFixes = 0;
  const fixedFiles: Record<string, { fixes: number; details: string[] }> = {};

  for (const file of files) {
    try {
      let content = await fs.readFile(file, 'utf-8');
      const originalContent = content;
      let fileFixes = 0;
      const fixDetails: string[] = [];

      // Apply each fix pattern
      for (const fix of syntaxFixes) {
        const matches = [...content.matchAll(new RegExp(fix.pattern.source, fix.pattern.flags))];
        
        if (matches.length > 0) {
          content = content.replace(fix.pattern, fix.fix as any);
          fileFixes += matches.length;
          fixDetails.push(`${fix.description}: ${matches.length} fixes`);
          
          // Log specific matches for debugging
          if (matches.length <= 3) {
            matches.forEach(match => {
              console.log(`  Found: "${match[0]}" in ${path.basename(file)}`);
            });
          }
        }
      }

      // Additional AST-based validation
      try {
        parse(content, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
          errorRecovery: false
        });
      } catch (parseError: any) {
        console.warn(`⚠️  Parse error in ${path.relative(projectRoot, file)}: ${parseError.message}`);
        // Revert changes if parsing fails
        content = originalContent;
        fileFixes = 0;
        fixDetails.length = 0;
      }

      // Write back if changes were made and valid
      if (content !== originalContent && fileFixes > 0) {
        await fs.writeFile(file, content, 'utf-8');
        fixedFiles[path.relative(projectRoot, file)] = {
          fixes: fileFixes,
          details: fixDetails
        };
        totalFixes += fileFixes;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }

  // Report results
  console.log('\n' + '='.repeat(60));
  console.log('SYNTAX FIX SUMMARY');
  console.log('='.repeat(60) + '\n');

  if (totalFixes > 0) {
    console.log(`✅ Fixed ${totalFixes} syntax errors in ${Object.keys(fixedFiles).length} files:\n`);
    
    // Group by fix type
    const fixesByType: Record<string, number> = {};
    for (const [file, info] of Object.entries(fixedFiles)) {
      console.log(`📄 ${file}:`);
      for (const detail of info.details) {
        console.log(`   ✓ ${detail}`);
        const fixType = detail.split(':')[0];
        fixesByType[fixType] = (fixesByType[fixType] || 0) + parseInt(detail.match(/(\d+) fixes/)?.[1] || '0');
      }
    }
    
    console.log('\n📊 Fixes by type:');
    for (const [type, count] of Object.entries(fixesByType)) {
      console.log(`   - ${type}: ${count}`);
    }
  } else {
    console.log('✨ No syntax errors found!');
  }
  
  console.log('\n💡 Run "npm run build" to verify all syntax errors are resolved.');

  return totalFixes;
}

// Run if called directly
if (require.main === module) {
  findAndFixSyntaxErrors()
    .then(fixes => {
      process.exit(fixes > 0 ? 0 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { findAndFixSyntaxErrors };
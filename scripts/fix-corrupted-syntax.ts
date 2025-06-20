import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

interface CorruptionFix {
  name: string;
  pattern: RegExp;
  fix: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const corruptionFixes: CorruptionFix[] = [
  // Fix broken href attributes with spaces
  {
    name: 'broken-href-slash',
    pattern: /href="\s*\/>/g,
    fix: 'href="/',
    description: 'Fix broken href attributes with spaces before slash'
  },
  
  // Fix specific broken hrefs
  {
    name: 'broken-href-paths',
    pattern: /href="\s*\/>\s*(\w+)"/g,
    fix: 'href="/$1"',
    description: 'Fix broken href paths'
  },
  
  // Fix broken xmlns attributes
  {
    name: 'broken-xmlns',
    pattern: /xmlns="http:\s*\/>\s*\/www\.w3\.org\/2000\/svg"/g,
    fix: 'xmlns="http://www.w3.org/2000/svg"',
    description: 'Fix broken xmlns attributes'
  },
  
  // Fix broken class names with />
  {
    name: 'broken-class-slash',
    pattern: /className="([^"]*?)\/>/g,
    fix: 'className="$1/',
    description: 'Fix broken className attributes'
  },
  
  // Fix broken width attributes
  {
    name: 'broken-width',
    pattern: /md:w-1\s*\/>2/g,
    fix: 'md:w-1/2',
    description: 'Fix broken width classes'
  },
  
  // Fix units with broken slashes
  {
    name: 'broken-units',
    pattern: /units\s*\/>hr/g,
    fix: 'units/hr',
    description: 'Fix broken unit text'
  },
  
  // Fix double parentheses in optional chaining
  {
    name: 'double-parentheses',
    pattern: /\(\(([^)]+)\)\)/g,
    fix: '($1)',
    description: 'Fix double parentheses'
  },
  
  // Fix missing closing tags in JSX
  {
    name: 'unclosed-svg',
    pattern: /(<svg[^>]*>(?:(?!<\/svg>).)*?)(\n\s*<\/button>|\n\s*<\/div>)/gs,
    fix: '$1</svg>$2',
    description: 'Add missing closing SVG tags'
  },
  
  // Fix missing semicolons after JSX blocks
  {
    name: 'missing-semicolon-jsx',
    pattern: /(<\/\w+>)\s*\n\s*(\w+\s*\()/g,
    fix: '$1;\n$2',
    description: 'Add missing semicolons after JSX'
  },
  
  // Fix "No newline at end of file" markers
  {
    name: 'no-newline-marker',
    pattern: /\s*No newline at end of file/g,
    fix: '',
    description: 'Remove "No newline at end of file" markers'
  }
];

async function fixCorruptedFiles() {
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
      '**/test-results/**',
      '**/scripts/fix-*.ts' // Don't fix the fix scripts!
    ],
    absolute: true
  });

  console.log(`\n🔍 Scanning ${files.length} files for corrupted syntax...\n`);

  let totalFixes = 0;
  const fixedFiles: Record<string, { fixes: number; details: string[] }> = {};

  for (const file of files) {
    try {
      let content = await fs.readFile(file, 'utf-8');
      const originalContent = content;
      let fileFixes = 0;
      const fixDetails: string[] = [];

      // Apply each fix pattern
      for (const fix of corruptionFixes) {
        const before = content;
        content = content.replace(fix.pattern, fix.fix as any);
        
        if (content !== before) {
          const matches = [...before.matchAll(new RegExp(fix.pattern.source, fix.pattern.flags))];
          fileFixes += matches.length;
          fixDetails.push(`${fix.description}: ${matches.length} fixes`);
        }
      }

      // Additional specific fixes for common patterns
      
      // Fix actionButton closing tags
      if (content.includes('const actionButton = (')) {
        const actionButtonMatch = content.match(/const actionButton = \(([\s\S]*?)\n\s*\);/);
        if (actionButtonMatch) {
          const actionContent = actionButtonMatch[1];
          const svgCount = (actionContent.match(/<svg/g) || []).length;
          const svgCloseCount = (actionContent.match(/<\/svg>/g) || []).length;
          
          if (svgCount > svgCloseCount) {
            // Add missing closing svg tags
            let fixed = actionContent;
            const lines = fixed.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].includes('</button>') && !lines[i-1]?.includes('</svg>')) {
                lines[i] = '        </svg>\n' + lines[i];
                fileFixes++;
                fixDetails.push('Added missing </svg> tag');
              }
            }
            content = content.replace(actionContent, lines.join('\n'));
          }
        }
      }

      // Write back if changes were made
      if (content !== originalContent && fileFixes > 0) {
        // Add final newline if missing
        if (!content.endsWith('\n')) {
          content += '\n';
        }
        
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
  console.log('CORRUPTION FIX SUMMARY');
  console.log('='.repeat(60) + '\n');

  if (totalFixes > 0) {
    console.log(`✅ Fixed ${totalFixes} corrupted syntax patterns in ${Object.keys(fixedFiles).length} files:\n`);
    
    for (const [file, info] of Object.entries(fixedFiles)) {
      console.log(`📄 ${file}:`);
      for (const detail of info.details) {
        console.log(`   ✓ ${detail}`);
      }
    }
  } else {
    console.log('✨ No corrupted syntax patterns found!');
  }

  return totalFixes;
}

// Run if called directly
if (require.main === module) {
  fixCorruptedFiles()
    .then(fixes => {
      console.log(`\n✅ Corruption fix complete. Fixed ${fixes} issues.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { fixCorruptedFiles };
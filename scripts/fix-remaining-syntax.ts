import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const fixes = [
  // Fix broken href patterns
  { pattern: /href="\s*\/>/g, replacement: 'href="/' },
  // Fix broken xmlns patterns
  { pattern: /xmlns="http:\s*\/>/g, replacement: 'xmlns="http:' },
  // Fix className with />
  { pattern: /className="([^"]*)\s*\/>/g, replacement: 'className="$1/' },
  // Fix unit patterns
  { pattern: /units\s*\/>/g, replacement: 'units/' },
  // Fix double parentheses in optional chaining
  { pattern: /\.\(\(/g, replacement: '.(' },
  // Fix malformed optional chaining
  { pattern: /(\w+)\?\.\((\w+)/g, replacement: '($1?.$2' },
  // Fix empty div with space
  { pattern: /<div\s+>/g, replacement: '<div>' }
];

async function fixSyntax() {
  const files = [
    '/mnt/d/Source/manufacturing-analytics-platform/src/app/login/page.tsx',
    '/mnt/d/Source/manufacturing-analytics-platform/src/app/reset-password/page.tsx',
    '/mnt/d/Source/manufacturing-analytics-platform/src/app/test-chat/page.tsx',
    '/mnt/d/Source/manufacturing-analytics-platform/src/components/common/PageFallback.tsx',
    '/mnt/d/Source/manufacturing-analytics-platform/src/components/layout/Footer.tsx',
    '/mnt/d/Source/manufacturing-analytics-platform/src/components/layout/Navigation.tsx',
    '/mnt/d/Source/manufacturing-analytics-platform/src/app/not-found.tsx'
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`Skipping non-existent file: ${file}`);
      continue;
    }

    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    fixes.forEach(({pattern, replacement}) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${path.basename(file)}`);
    }
  }
}

fixSyntax().catch(console.error);
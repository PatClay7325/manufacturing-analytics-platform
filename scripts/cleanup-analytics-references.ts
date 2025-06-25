#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Script to clean up remaining manufacturingPlatform references in comments and documentation
 */

const EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.turbo',
  'manufacturingPlatform-source', // Already deleted but keeping in exclusion list
];

const EXCLUDED_FILES = [
  'COMPLIANCE-REPORT.md',
  'PHASE2-COMPLIANCE-UPDATE.md',
  'cleanup-manufacturingPlatform-references.ts',
  'package-lock.json',
  'yarn.lock',
];

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json'];

interface Replacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const REPLACEMENTS: Replacement[] = [
  // Comments and documentation
  {
    pattern: /manufacturingPlatform-style/gi,
    replacement: 'Analytics-style',
    description: 'manufacturingPlatform-style -> Analytics-style',
  },
  {
    pattern: /manufacturingPlatform-compatible/gi,
    replacement: 'Analytics-compatible',
    description: 'manufacturingPlatform-compatible -> Analytics-compatible',
  },
  {
    pattern: /powered by manufacturingPlatform/gi,
    replacement: 'powered by Analytics',
    description: 'powered by manufacturingPlatform -> powered by Analytics',
  },
  {
    pattern: /manufacturingPlatform's/gi,
    replacement: "Analytics'",
    description: "manufacturingPlatform's -> Analytics'",
  },
  {
    pattern: /from manufacturingPlatform/gi,
    replacement: 'from Analytics',
    description: 'from manufacturingPlatform -> from Analytics',
  },
  {
    pattern: /like manufacturingPlatform/gi,
    replacement: 'like Analytics platforms',
    description: 'like manufacturingPlatform -> like Analytics platforms',
  },
  {
    pattern: /manufacturingPlatform system/gi,
    replacement: 'Analytics system',
    description: 'manufacturingPlatform system -> Analytics system',
  },
  {
    pattern: /manufacturingPlatform dashboard/gi,
    replacement: 'Analytics dashboard',
    description: 'manufacturingPlatform dashboard -> Analytics dashboard',
  },
  {
    pattern: /manufacturingPlatform UI/gi,
    replacement: 'Analytics UI',
    description: 'manufacturingPlatform UI -> Analytics UI',
  },
  // Variable and property names (case-sensitive)
  {
    pattern: /manufacturingPlatformUrl/g,
    replacement: 'analyticsUrl',
    description: 'manufacturingPlatformUrl -> analyticsUrl',
  },
  {
    pattern: /ManufacturingPlatformUrl/g,
    replacement: 'AnalyticsUrl',
    description: 'ManufacturingPlatformUrl -> AnalyticsUrl',
  },
  {
    pattern: /manufacturingplatform_/g,
    replacement: 'analytics_',
    description: 'manufacturingplatform_ -> analytics_',
  },
  {
    pattern: /_manufacturingplatform/g,
    replacement: '_analytics',
    description: '_manufacturingplatform -> _analytics',
  },
  // Test descriptions
  {
    pattern: /describe\(['"](.*)manufacturingPlatform(.*)['"]/g,
    replacement: 'describe("$1Analytics$2"',
    description: 'Test descriptions with manufacturingPlatform',
  },
  {
    pattern: /it\(['"](.*)manufacturingPlatform(.*)['"]/g,
    replacement: 'it("$1Analytics$2"',
    description: 'Test cases with manufacturingPlatform',
  },
];

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

function shouldExclude(path: string): boolean {
  const parts = path.split(/[/\\]/);
  return EXCLUDED_DIRS.some(dir => parts.includes(dir)) ||
         EXCLUDED_FILES.some(file => path.endsWith(file));
}

function processFile(filePath: string): boolean {
  if (shouldExclude(filePath)) {
    return false;
  }

  const ext = extname(filePath);
  if (!FILE_EXTENSIONS.includes(ext)) {
    return false;
  }

  totalFiles++;
  
  try {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileReplacements = 0;

    for (const { pattern, replacement, description } of REPLACEMENTS) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fileReplacements += matches.length;
        console.log(`  ${description}: ${matches.length} replacements`);
      }
    }

    if (content !== originalContent) {
      writeFileSync(filePath, content);
      modifiedFiles++;
      totalReplacements += fileReplacements;
      console.log(`✓ Modified ${filePath} (${fileReplacements} replacements)`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }

  return false;
}

function processDirectory(dir: string): void {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (shouldExclude(fullPath)) {
        continue;
      }

      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (stat.isFile()) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
}

console.log('Starting manufacturingPlatform reference cleanup...\n');

const srcDir = join(process.cwd(), 'src');
processDirectory(srcDir);

// Also process root-level config files
const rootFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'package.json',
  'next.config.js',
  'tailwind.config.js',
  'tsconfig.json',
];

for (const file of rootFiles) {
  const fullPath = join(process.cwd(), file);
  try {
    if (statSync(fullPath).isFile()) {
      processFile(fullPath);
    }
  } catch (error) {
    // File doesn't exist, skip
  }
}

console.log('\n=== Cleanup Summary ===');
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files modified: ${modifiedFiles}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('\nCleanup complete!');

if (modifiedFiles > 0) {
  console.log('\n⚠️  Please review the changes before committing.');
  console.log('Some replacements may need manual adjustment.');
}
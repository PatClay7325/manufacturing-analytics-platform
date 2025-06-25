#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Define replacement patterns
const replacements = [
  // Common Grafana references
  { pattern: /\bgrafana\b/gi, replacement: 'manufacturingPlatform' },
  { pattern: /\bGrafana\b/g, replacement: 'ManufacturingPlatform' },
  { pattern: /\bGRAFANA\b/g, replacement: 'MANUFACTURING_PLATFORM' },
  
  // Specific patterns
  { pattern: /setGrafana/g, replacement: 'setManufacturingPlatform' },
  { pattern: /isGrafana/g, replacement: 'isManufacturingPlatform' },
  { pattern: /grafanaUrl/g, replacement: 'manufacturingPlatformUrl' },
  { pattern: /GrafanaUrl/g, replacement: 'ManufacturingPlatformUrl' },
  { pattern: /grafanaConfig/g, replacement: 'manufacturingPlatformConfig' },
  { pattern: /GrafanaConfig/g, replacement: 'ManufacturingPlatformConfig' },
  { pattern: /grafana-/g, replacement: 'manufacturing-platform-' },
  { pattern: /Grafana-/g, replacement: 'ManufacturingPlatform-' },
  
  // Comments and strings that should be updated
  { pattern: /Grafana server/g, replacement: 'ManufacturingPlatform server' },
  { pattern: /Grafana dashboard/g, replacement: 'ManufacturingPlatform dashboard' },
  { pattern: /Grafana instance/g, replacement: 'ManufacturingPlatform instance' },
  { pattern: /Grafana API/g, replacement: 'ManufacturingPlatform API' },
  { pattern: /Grafana plugin/g, replacement: 'ManufacturingPlatform plugin' },
  { pattern: /Grafana panel/g, replacement: 'ManufacturingPlatform panel' },
  { pattern: /Grafana Labs/g, replacement: 'ManufacturingPlatform' },
  { pattern: /grafana labs/gi, replacement: 'ManufacturingPlatform' },
  
  // Additional patterns for URLs and specific cases
  { pattern: /grafana\.com/g, replacement: 'manufacturingplatform.com' },
  { pattern: /grafana\.org/g, replacement: 'manufacturingplatform.org' },
  { pattern: /grafana\/grafana/g, replacement: 'manufacturingplatform/manufacturingplatform' },
  { pattern: /\/grafana\//g, replacement: '/manufacturingplatform/' },
  { pattern: /"grafana"/g, replacement: '"manufacturingplatform"' },
  { pattern: /'grafana'/g, replacement: "'manufacturingplatform'" },
  { pattern: /`grafana`/g, replacement: '`manufacturingplatform`' },
  { pattern: /Grafana's/g, replacement: "ManufacturingPlatform's" },
  { pattern: /grafana's/g, replacement: "manufacturingplatform's" },
  
  // Docker and service names
  { pattern: /grafana:/g, replacement: 'manufacturingplatform:' },
  { pattern: /:grafana/g, replacement: ':manufacturingplatform' },
  { pattern: /container_name: grafana/g, replacement: 'container_name: manufacturingplatform' },
  { pattern: /image: grafana/g, replacement: 'image: manufacturingplatform' },
  
  // Environment variables and constants
  { pattern: /GRAFANA_/g, replacement: 'MANUFACTURING_PLATFORM_' },
  { pattern: /_GRAFANA/g, replacement: '_MANUFACTURING_PLATFORM' },
  
  // File references and imports
  { pattern: /from 'grafana/g, replacement: "from 'manufacturingplatform" },
  { pattern: /import grafana/g, replacement: 'import manufacturingplatform' },
  { pattern: /require\('grafana/g, replacement: "require('manufacturingplatform" },
  
  // Variable names and identifiers
  { pattern: /grafanaScreenshot/g, replacement: 'manufacturingPlatformScreenshot' },
  { pattern: /grafanaReference/g, replacement: 'manufacturingPlatformReference' },
  { pattern: /grafanaStyle/g, replacement: 'manufacturingPlatformStyle' },
  { pattern: /grafanaTheme/g, replacement: 'manufacturingPlatformTheme' },
  { pattern: /grafanaFormat/g, replacement: 'manufacturingPlatformFormat' },
  { pattern: /grafanaQuery/g, replacement: 'manufacturingPlatformQuery' },
  { pattern: /grafanaDashboard/g, replacement: 'manufacturingPlatformDashboard' },
  { pattern: /grafanaPanel/g, replacement: 'manufacturingPlatformPanel' },
  { pattern: /grafanaPlugin/g, replacement: 'manufacturingPlatformPlugin' },
  { pattern: /grafanaDataSource/g, replacement: 'manufacturingPlatformDataSource' },
  
  // File name references in strings
  { pattern: /grafana-reference\.png/g, replacement: 'manufacturingPlatform-reference.png' },
  { pattern: /grafana-style/g, replacement: 'manufacturingPlatform-style' },
  { pattern: /grafana-theme/g, replacement: 'manufacturingPlatform-theme' },
];

// Files to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.log',
  '**/*.lock',
  '**/replace-grafana-references.ts', // Don't modify this script itself
];

async function replaceInFile(filePath: string): Promise<number> {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let changeCount = 0;

    // Apply all replacements
    replacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        changeCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    });

    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Updated ${filePath} (${changeCount} replacements)`);
      return changeCount;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return 0;
  }
}

async function main() {
  console.log('🔍 Searching for files containing Grafana references...\n');

  // Find all TypeScript, JavaScript, JSON, and Markdown files
  const files = await glob('**/*.{ts,tsx,js,jsx,json,md,yml,yaml,cmd,sh}', {
    ignore: excludePatterns,
    absolute: true,
  });

  console.log(`Found ${files.length} files to check\n`);

  let totalFiles = 0;
  let totalReplacements = 0;

  // Process each file
  for (const file of files) {
    const replacements = await replaceInFile(file);
    if (replacements > 0) {
      totalFiles++;
      totalReplacements += replacements;
    }
  }

  console.log('\n✨ Replacement complete!');
  console.log(`📊 Updated ${totalFiles} files with ${totalReplacements} total replacements`);

  // Check for any remaining Grafana references
  console.log('\n🔍 Checking for any remaining Grafana references...\n');
  
  const remainingFiles: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (/grafana/i.test(content)) {
      remainingFiles.push(file);
    }
  }

  if (remainingFiles.length > 0) {
    console.log('⚠️  Found remaining Grafana references in:');
    remainingFiles.forEach(file => console.log(`   - ${file}`));
  } else {
    console.log('✅ No remaining Grafana references found!');
  }
}

main().catch(console.error);
#!/usr/bin/env node

/**
 * Clean up legacy environment files
 * Consolidates multiple env files into the standard pattern
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Files to keep
const keepFiles = [
  '.env.example',      // Template for all environments
  '.env.local',        // Local development secrets (gitignored)
  '.env.development',  // Development defaults (no secrets)
  '.env.test',         // Test environment (no secrets)
  '.env.production'    // Production defaults (no secrets)
];

// Files to remove (legacy/redundant)
const removeFiles = [
  '.env',                    // Ambiguous, use .env.local instead
  '.env.template',           // Duplicate of .env.example
  '.env.local.example',      // Confusing, use .env.example
  '.env.local.backup',       // Backup file
  '.env.test.example',       // Unnecessary
  '.env.production.example', // Unnecessary
  '.env.backup',             // Backup file
  '.env.docker',             // Use docker-compose env_file instead
  '.env.ollama-optimized',   // Should be in .env.local
  '.env.grafana',            // Should be in .env.local
  '.env.backup-with-issue',  // Backup file
  '.env.mqtt.example'        // Future feature
];

async function cleanupEnvFiles() {
  console.log(`${colors.blue}🧹 Cleaning up environment files...${colors.reset}\n`);
  
  let removed = 0;
  let kept = 0;
  
  // Check each file to remove
  for (const file of removeFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        // Read content first in case we need to preserve something
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if it contains unique values not in .env.local
        let hasUniqueValues = false;
        if (fs.existsSync('.env.local')) {
          const localContent = fs.readFileSync('.env.local', 'utf8');
          const lines = content.split('\n').filter(line => 
            line.trim() && !line.startsWith('#') && line.includes('=')
          );
          
          for (const line of lines) {
            const [key] = line.split('=');
            if (key && !localContent.includes(key)) {
              hasUniqueValues = true;
              break;
            }
          }
        }
        
        if (hasUniqueValues) {
          console.log(`${colors.yellow}⚠${colors.reset}  ${file} - Contains unique values, skipping`);
          kept++;
        } else {
          fs.unlinkSync(filePath);
          console.log(`${colors.red}✗${colors.reset}  ${file} - Removed`);
          removed++;
        }
      } catch (error) {
        console.log(`${colors.red}✗${colors.reset}  ${file} - Error: ${error.message}`);
      }
    }
  }
  
  // Ensure required files exist
  console.log(`\n${colors.blue}Checking required files:${colors.reset}`);
  for (const file of keepFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`${colors.green}✓${colors.reset}  ${file} - Present`);
    } else if (file === '.env.example') {
      console.log(`${colors.red}✗${colors.reset}  ${file} - Missing (critical!)`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset}  ${file} - Missing (optional)`);
    }
  }
  
  // Create standard .env.development if missing
  if (!fs.existsSync('.env.development')) {
    const devConfig = `# Development environment configuration (no secrets!)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
LOG_LEVEL=debug
ENABLE_DEBUG_TOOLBAR=true
`;
    fs.writeFileSync('.env.development', devConfig);
    console.log(`${colors.green}✓${colors.reset}  Created .env.development with defaults`);
  }
  
  // Create standard .env.test if missing
  if (!fs.existsSync('.env.test')) {
    const testConfig = `# Test environment configuration (no secrets!)
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_test
LOG_LEVEL=error
`;
    fs.writeFileSync('.env.test', testConfig);
    console.log(`${colors.green}✓${colors.reset}  Created .env.test with defaults`);
  }
  
  console.log(`\n${colors.green}Summary:${colors.reset}`);
  console.log(`  Files removed: ${removed}`);
  console.log(`  Files kept: ${kept}`);
  console.log(`\n${colors.blue}Environment file structure:${colors.reset}`);
  console.log('  .env.example       - Template for all environments (committed)');
  console.log('  .env.local         - Your local secrets (gitignored)');
  console.log('  .env.development   - Development defaults (committed)');
  console.log('  .env.test          - Test defaults (committed)');
  console.log('  .env.production    - Production defaults (committed)');
}

if (require.main === module) {
  cleanupEnvFiles();
}
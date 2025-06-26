#!/usr/bin/env node

/**
 * Add schema protection scripts to package.json
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../../package.json');

console.log('🔧 Adding schema protection scripts to package.json...');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add schema management scripts
  const schemaScripts = {
    // Schema protection commands
    "schema:status": "node scripts/schema-management/schema-protector.js status",
    "schema:lock": "node scripts/schema-management/schema-protector.js lock",
    "schema:dev": "node scripts/schema-management/schema-protector.js dev",
    "schema:verify": "node scripts/schema-management/schema-protector.js verify",
    "schema:verify:fix": "node scripts/schema-management/schema-protector.js verify --auto-restore",
    "schema:cleanup": "node scripts/schema-management/schema-protector.js cleanup",
    
    // Protected Prisma commands
    "db:generate": "npm run schema:verify && prisma generate",
    "db:migrate": "npm run schema:verify && prisma migrate dev",
    "db:deploy": "npm run schema:verify && prisma migrate deploy",
    "db:studio": "npm run schema:verify && prisma studio",
    "db:push": "npm run schema:verify && prisma db push",
    
    // Development workflow
    "dev:db": "npm run schema:dev && npm run db:generate && npm run dev",
    "prod:prepare": "npm run schema:lock && npm run db:generate && npm run build",
    
    // Pre-commit hooks
    "pre-commit": "npm run schema:verify && npm run lint && npm run typecheck",
    "pre-push": "npm run schema:verify && npm run test:unit"
  };
  
  // Merge with existing scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    ...schemaScripts
  };
  
  // Add husky hooks if not present
  if (!packageJson.husky) {
    packageJson.husky = {
      "hooks": {
        "pre-commit": "npm run pre-commit",
        "pre-push": "npm run pre-push"
      }
    };
  }
  
  // Write back to package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('✅ Schema protection scripts added successfully!');
  console.log('\n📋 Available commands:');
  console.log('  npm run schema:status    - Check schema protection status');
  console.log('  npm run schema:lock      - Lock production schema');
  console.log('  npm run schema:dev       - Switch to development schema');
  console.log('  npm run schema:verify    - Verify schema integrity');
  console.log('  npm run dev:db           - Start development with dev schema');
  console.log('  npm run prod:prepare     - Prepare for production deployment');
  
} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
  process.exit(1);
}
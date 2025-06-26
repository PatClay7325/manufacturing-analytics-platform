#!/usr/bin/env node

/**
 * Schema Protection System
 * Prevents accidental modification of production schema
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRISMA_DIR = path.join(__dirname, '../../prisma');
const PRODUCTION_SCHEMA = path.join(PRISMA_DIR, 'schema.production.locked.prisma');
const MAIN_SCHEMA = path.join(PRISMA_DIR, 'schema.prisma');
const DEV_SCHEMA = path.join(PRISMA_DIR, 'schema.development.prisma');

// Calculate hash of production schema
function getSchemaHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Protection commands
const commands = {
  // Lock production schema as the main schema
  lock: () => {
    console.log('🔒 Locking production schema...');
    
    if (!fs.existsSync(PRODUCTION_SCHEMA)) {
      console.error('❌ Production schema not found!');
      process.exit(1);
    }
    
    // Copy production schema to main schema
    fs.copyFileSync(PRODUCTION_SCHEMA, MAIN_SCHEMA);
    
    // Store hash for verification
    const hash = getSchemaHash(PRODUCTION_SCHEMA);
    const lockInfo = {
      locked: true,
      timestamp: new Date().toISOString(),
      hash: hash,
      version: '1.0.0-PRODUCTION'
    };
    
    fs.writeFileSync(
      path.join(PRISMA_DIR, '.schema.lock'),
      JSON.stringify(lockInfo, null, 2)
    );
    
    console.log('✅ Production schema locked and activated');
    console.log(`📝 Schema hash: ${hash.substring(0, 16)}...`);
  },

  // Switch to development schema
  dev: () => {
    console.log('🔧 Switching to development schema...');
    
    if (!fs.existsSync(DEV_SCHEMA)) {
      console.error('❌ Development schema not found!');
      process.exit(1);
    }
    
    fs.copyFileSync(DEV_SCHEMA, MAIN_SCHEMA);
    
    const lockInfo = {
      locked: false,
      timestamp: new Date().toISOString(),
      mode: 'development'
    };
    
    fs.writeFileSync(
      path.join(PRISMA_DIR, '.schema.lock'),
      JSON.stringify(lockInfo, null, 2)
    );
    
    console.log('✅ Development schema activated');
    console.log('⚠️  Remember to switch back to production before deployment!');
  },

  // Verify schema integrity
  verify: () => {
    console.log('🔍 Verifying schema integrity...');
    
    const lockFile = path.join(PRISMA_DIR, '.schema.lock');
    if (!fs.existsSync(lockFile)) {
      console.log('⚠️  No lock file found - schema not protected');
      return;
    }
    
    const lockInfo = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    
    if (!lockInfo.locked) {
      console.log('🔧 Schema is in development mode');
      return;
    }
    
    const currentHash = getSchemaHash(MAIN_SCHEMA);
    const expectedHash = lockInfo.hash;
    
    if (currentHash === expectedHash) {
      console.log('✅ Production schema integrity verified');
      console.log(`📅 Locked: ${lockInfo.timestamp}`);
      console.log(`📦 Version: ${lockInfo.version}`);
    } else {
      console.log('❌ SCHEMA INTEGRITY VIOLATION DETECTED!');
      console.log('🚨 Production schema has been modified without authorization');
      console.log(`Expected: ${expectedHash?.substring(0, 16)}...`);
      console.log(`Current:  ${currentHash?.substring(0, 16)}...`);
      
      // Auto-restore if requested
      if (process.argv.includes('--auto-restore')) {
        commands.lock();
        console.log('🔄 Production schema automatically restored');
      } else {
        console.log('💡 Run with --auto-restore to fix automatically');
        process.exit(1);
      }
    }
  },

  // Show current status
  status: () => {
    console.log('📊 Schema Protection Status\n');
    
    const lockFile = path.join(PRISMA_DIR, '.schema.lock');
    if (!fs.existsSync(lockFile)) {
      console.log('Status: UNPROTECTED ⚠️');
      console.log('Schema: Unknown');
      console.log('\n💡 Run "npm run schema:lock" to protect production schema');
      return;
    }
    
    const lockInfo = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    
    if (lockInfo.locked) {
      console.log('Status: PROTECTED 🔒');
      console.log('Schema: PRODUCTION');
      console.log(`Version: ${lockInfo.version}`);
      console.log(`Locked: ${new Date(lockInfo.timestamp).toLocaleString()}`);
      
      // Verify integrity
      const currentHash = getSchemaHash(MAIN_SCHEMA);
      const expectedHash = lockInfo.hash;
      
      if (currentHash === expectedHash) {
        console.log('Integrity: VERIFIED ✅');
      } else {
        console.log('Integrity: COMPROMISED ❌');
      }
    } else {
      console.log('Status: DEVELOPMENT 🔧');
      console.log('Schema: DEVELOPMENT');
      console.log(`Switched: ${new Date(lockInfo.timestamp).toLocaleString()}`);
    }
  },

  // Clean up old schema files
  cleanup: () => {
    console.log('🧹 Cleaning up old schema files...');
    
    const schemaFiles = fs.readdirSync(PRISMA_DIR).filter(file => 
      file.startsWith('schema-') && 
      file.endsWith('.prisma') &&
      !file.includes('production.locked') &&
      !file.includes('development')
    );
    
    let cleanedCount = 0;
    
    schemaFiles.forEach(file => {
      const filePath = path.join(PRISMA_DIR, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed: ${file}`);
        cleanedCount++;
      } catch (error) {
        console.log(`❌ Failed to remove: ${file}`);
      }
    });
    
    console.log(`✅ Cleaned up ${cleanedCount} old schema files`);
  },

  // Show help
  help: () => {
    console.log(`
🛡️  Schema Protection System

Commands:
  lock     Lock production schema as main schema
  dev      Switch to development schema
  verify   Verify schema integrity
  status   Show current protection status
  cleanup  Remove old schema files
  help     Show this help message

Examples:
  node schema-protector.js lock
  node schema-protector.js dev
  node schema-protector.js verify --auto-restore
  node schema-protector.js status
    `);
  }
};

// Execute command
const command = process.argv[2] || 'help';

if (commands[command]) {
  try {
    commands[command]();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
} else {
  console.error(`❌ Unknown command: ${command}`);
  commands.help();
  process.exit(1);
}
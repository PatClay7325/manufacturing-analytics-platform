// Load environment variables first
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env' });

console.log('Environment Diagnostics:');
console.log('=======================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('');

// Now test Prisma
const { PrismaClient } = require('@prisma/client');

console.log('Creating Prisma client with explicit URL...');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  },
  log: ['query', 'error', 'warn']
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✅ Connection successful!');
    console.log('Database info:', result);
    
    // Test a simple query
    const sites = await prisma.manufacturingSite.findMany({ take: 1 });
    console.log(`✅ Found ${sites.length} sites`);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    
    // Check what URL Prisma is actually using
    console.log('\nDebugging info:');
    console.log('Prisma datasource URL from env:', process.env.DATABASE_URL);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
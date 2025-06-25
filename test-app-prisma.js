// Test using the exact same configuration as the app
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

// Use the same configuration as the app
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public";

console.log('Environment DATABASE_URL:', process.env.DATABASE_URL);
console.log('Using DATABASE_URL:', DATABASE_URL);

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testAppPrisma() {
  console.log('Testing Prisma with app configuration...\n');
  
  try {
    // Test connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
    
    // Test query
    console.log('\n2. Testing user query...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    console.log('✅ User query successful:', user ? 'Found' : 'Not found');
    
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPassword: !!user.passwordHash
      });
      
      // Test bcrypt comparison
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare('demo123', user.passwordHash);
      console.log('Password verification:', isValid ? '✅ Valid' : '❌ Invalid');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testAppPrisma();
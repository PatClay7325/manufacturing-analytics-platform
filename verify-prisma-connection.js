// Test Prisma connection with correct credentials
console.log('=== Verifying Prisma Connection ===\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });

console.log('Environment variables loaded:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('');

// Import the shared Prisma instance
const { prisma } = require('./src/lib/prisma');

async function verifyConnection() {
  try {
    console.log('Testing connection...');
    
    // Test raw query
    const dbInfo = await prisma.$queryRaw`
      SELECT current_database() as database, 
             current_user as user, 
             inet_server_addr() as host,
             inet_server_port() as port
    `;
    console.log('✅ Connection successful!');
    console.log('Database info:', dbInfo[0]);
    
    // Test schema access
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `;
    console.log('\n✅ Can access schema. Sample tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    // Test model access
    try {
      const siteCount = await prisma.manufacturingSite.count();
      console.log(`\n✅ Can access Prisma models. Found ${siteCount} manufacturing sites.`);
    } catch (e) {
      console.log('\n⚠️  Could not access manufacturingSite model:', e.message);
    }
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n=== Test Complete ===');
  }
}

verifyConnection();
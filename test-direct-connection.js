const { PrismaClient } = require('@prisma/client');

// Force the correct DATABASE_URL
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public";

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing Direct Database Connection\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    // Test connection
    console.log('\n1. Testing connection...');
    await prisma.$connect();
    console.log('✅ Connected successfully');
    
    // Count users
    console.log('\n2. Counting users...');
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users`);
    
    // Find admin user
    console.log('\n3. Finding admin user...');
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      select: { id: true, email: true, name: true, role: true }
    });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
    } else {
      console.log('❌ Admin user not found');
    }
    
    console.log('\n✅ Database connection is working correctly!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
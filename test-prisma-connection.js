const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/manufacturing'
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

async function testPrismaConnection() {
  console.log('Testing Prisma connection and operations...\n');
  
  try {
    // Test 1: Basic connection
    console.log('1. Testing database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test 2: Find user
    console.log('\n2. Testing user lookup...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    console.log('✅ User found:', user ? { id: user.id, email: user.email, role: user.role } : 'NOT FOUND');
    
    // Test 3: Test audit log write
    console.log('\n3. Testing audit log write...');
    const auditResult = await prisma.auditLog.create({
      data: {
        eventType: 'test',
        eventCategory: 'test', 
        eventAction: 'test.connection',
        eventStatus: 'success',
        eventSeverity: 'info',
        userId: user?.id,
        metadata: { test: true }
      }
    });
    console.log('✅ Audit log created:', auditResult.id);
    
    // Test 4: Test user update
    console.log('\n4. Testing user update...');
    const updateResult = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    console.log('✅ User updated, lastLoginAt:', updateResult.lastLoginAt);
    
    console.log('\n🎉 All Prisma operations successful!');
    
  } catch (error) {
    console.error('❌ Prisma operation failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection();
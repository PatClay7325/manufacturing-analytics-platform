
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5432/manufacturing?schema=public'
    }
  }
});

async function test() {
  try {
    await prisma.$connect();
    console.log('✓ Database connection successful');
    
    // Check if demo user exists
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@manufacturing.local' }
    });
    
    if (demoUser) {
      console.log('✓ Demo user found:', demoUser.email);
      console.log('  - Name:', demoUser.name);
      console.log('  - Role:', demoUser.role);
      console.log('  - Active:', demoUser.isActive);
    } else {
      console.log('✗ Demo user NOT found');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database error:', error.message);
    process.exit(1);
  }
}

test();

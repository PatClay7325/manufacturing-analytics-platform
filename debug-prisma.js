const { PrismaClient } = require('@prisma/client');

async function debugPrisma() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
      }
    }
  });

  try {
    console.log('Available models:', Object.keys(prisma));
    console.log('User model available:', !!prisma.user);
    console.log('WorkUnit model available:', !!prisma.workUnit);
    
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    if (prisma.user) {
      const userCount = await prisma.user.count();
      console.log('✅ User count:', userCount);
    } else {
      console.log('❌ User model not available');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPrisma();
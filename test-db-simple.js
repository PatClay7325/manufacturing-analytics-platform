// Direct test without Next.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
    }
  }
});

async function test() {
  try {
    console.log('Testing database connection...');
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    
    console.log('\nUsers found:');
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
    
    console.log('\n✅ Database is working correctly!');
    console.log('\nThe issue is with Next.js caching the old Prisma client.');
    console.log('\nSolution: You need to completely restart the dev server:');
    console.log('1. Press Ctrl+C to stop the server');
    console.log('2. Delete .next folder: rmdir /s /q .next');
    console.log('3. Start again: npm run dev');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
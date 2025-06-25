
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5432/manufacturing?schema=public'
    }
  }
});

prisma.$connect()
  .then(() => {
    console.log('✓ Prisma client working correctly');
    return prisma.$disconnect();
  })
  .catch(err => {
    console.error('✗ Prisma client error:', err.message);
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const sites = await prisma.site.findMany();
  const equipment = await prisma.workUnit.findMany();
  const metrics = await prisma.performanceMetric.count();
  
  console.log('Sites:', sites.length);
  console.log('Equipment:', equipment.length);
  console.log('Performance Metrics:', metrics);
  
  if (sites.length > 0) {
    console.log('First site:', sites[0]);
  }
  
  await prisma.$disconnect();
}

checkData().catch(console.error);
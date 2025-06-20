const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing database contents...\n');
  
  // Get all model names from Prisma
  const models = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
  console.log('Available models:', models);
  
  // Count records in each model
  for (const model of models) {
    if (prisma[model] && typeof prisma[model].count === 'function') {
      try {
        const count = await prisma[model].count();
        console.log(`${model}: ${count} records`);
      } catch (e) {
        console.log(`${model}: Error - ${e.message}`);
      }
    }
  }
  
  // Check specific models
  console.log('\nChecking hierarchical models:');
  
  try {
    const sites = await prisma.site.count();
    console.log(`Sites: ${sites}`);
    
    const areas = await prisma.area.count();
    console.log(`Areas: ${areas}`);
    
    const workCenters = await prisma.workCenter.count();
    console.log(`Work Centers: ${workCenters}`);
    
    const workUnits = await prisma.workUnit.count();
    console.log(`Work Units: ${workUnits}`);
    
    const metrics = await prisma.metric.count();
    console.log(`Metrics: ${metrics}`);
    
    // Get sample data
    console.log('\nSample metric:');
    const sampleMetric = await prisma.metric.findFirst({
      include: { WorkUnit: true }
    });
    console.log(JSON.stringify(sampleMetric, null, 2));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
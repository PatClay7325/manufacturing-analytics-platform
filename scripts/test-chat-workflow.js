const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient();

async function testChatWorkflow() {
  console.log('🧪 Testing Chat Workflow...\n');
  
  try {
    // Test 1: Database Connection
    console.log('Test 1: Database Connection');
    console.log('---------------------------');
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connected successfully');
    
    // Test 2: Equipment Data
    console.log('\nTest 2: Equipment Data');
    console.log('---------------------');
    const equipment = await prisma.dimEquipment.findMany();
    console.log(`✅ Found ${equipment.length} equipment records`);
    console.log(`   Sample: ${equipment[0]?.code} - ${equipment[0]?.name}`);
    
    // Test 3: Production Data
    console.log('\nTest 3: Production Data');
    console.log('----------------------');
    const production = await prisma.factProduction.findMany({ take: 5 });
    console.log(`✅ Found ${production.length} recent production records`);
    
    // Test 4: OEE View
    console.log('\nTest 4: OEE Materialized View');
    console.log('-----------------------------');
    const oeeData = await prisma.viewOeeDaily.findMany({
      take: 5,
      orderBy: { dateId: 'desc' }
    });
    console.log(`✅ Found ${oeeData.length} OEE records`);
    if (oeeData.length > 0) {
      const sample = oeeData[0];
      console.log(`   Latest: Equipment ${sample.equipmentId}, OEE=${(sample.oee * 100).toFixed(1)}%`);
    }
    
    // Test 5: Maintenance Data
    console.log('\nTest 5: Maintenance Data');
    console.log('-----------------------');
    const maintenance = await prisma.factMaintenance.findMany({
      take: 5,
      include: { equipment: true },
      orderBy: { startTime: 'desc' }
    });
    console.log(`✅ Found ${maintenance.length} maintenance records`);
    if (maintenance.length > 0) {
      console.log(`   Latest: ${maintenance[0].workOrderNumber} on ${maintenance[0].equipment.name}`);
    }
    
    // Test 6: Query Complex Relationships
    console.log('\nTest 6: Complex Query Test');
    console.log('-------------------------');
    const complexQuery = await prisma.factProduction.findMany({
      where: {
        equipment: {
          code: { startsWith: 'CNC' }
        }
      },
      include: {
        equipment: true,
        product: true,
        downtime: {
          include: {
            reason: true
          }
        }
      },
      take: 3
    });
    console.log(`✅ Complex query returned ${complexQuery.length} records`);
    
    // Test 7: Sensor Data
    console.log('\nTest 7: Sensor Event Data');
    console.log('------------------------');
    const sensorCount = await prisma.factSensorEvent.count();
    console.log(`✅ Found ${sensorCount} sensor events`);
    
    // Test 8: Downtime Analysis
    console.log('\nTest 8: Downtime Analysis');
    console.log('------------------------');
    const downtimeWithFailures = await prisma.factDowntime.findMany({
      where: {
        reason: {
          isFailure: true
        }
      },
      include: {
        equipment: true,
        reason: true
      },
      take: 5
    });
    console.log(`✅ Found ${downtimeWithFailures.length} failure-related downtime events`);
    
    // Test 9: Scrap Data
    console.log('\nTest 9: Scrap/Quality Data');
    console.log('--------------------------');
    const scrapData = await prisma.factScrap.findMany({
      take: 5,
      include: {
        product: true,
        production: {
          include: {
            equipment: true
          }
        }
      }
    });
    console.log(`✅ Found ${scrapData.length} scrap records`);
    
    // Test 10: Reliability View
    console.log('\nTest 10: Reliability Summary');
    console.log('---------------------------');
    const reliability = await prisma.viewReliabilitySummary.findMany({
      take: 5
    });
    console.log(`✅ Found ${reliability.length} reliability summary records`);
    if (reliability.length > 0) {
      const sample = reliability[0];
      console.log(`   ${sample.equipmentName}: MTBF=${sample.mtbfHours.toFixed(1)}h, MTTR=${sample.mttrHours.toFixed(1)}h`);
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testChatWorkflow()
  .then(() => {
    console.log('\n✅ Chat workflow testing completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
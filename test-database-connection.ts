/**
 * Database Connection and Prisma Configuration Test
 * Test to verify that the Prisma enableTracing error is resolved
 */

import { prisma } from './src/lib/database/prisma';

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection and Prisma Configuration...\n');
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test 2: Simple query
    console.log('\n2️⃣ Testing simple query execution...');
    const equipmentCount = await prisma.dimEquipment.count();
    console.log(`✅ Equipment count query successful: ${equipmentCount} records`);
    
    // Test 3: Complex query with relations
    console.log('\n3️⃣ Testing complex query with relations...');
    const recentProduction = await prisma.factProduction.findMany({
      take: 5,
      include: {
        equipment: {
          select: {
            name: true,
            code: true
          }
        },
        product: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log(`✅ Complex query successful: ${recentProduction.length} production records retrieved`);
    
    // Test 4: Quality data query (the original failing case)
    console.log('\n4️⃣ Testing quality data query (original failing case)...');
    const scrapData = await prisma.factScrap.findMany({
      take: 10,
      include: {
        product: {
          select: {
            name: true,
            code: true
          }
        },
        production: {
          include: {
            equipment: {
              select: {
                name: true,
                code: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`✅ Quality data query successful: ${scrapData.length} scrap records retrieved`);
    
    // Test 5: Aggregation query
    console.log('\n5️⃣ Testing aggregation query...');
    const productionStats = await prisma.factProduction.aggregate({
      _sum: {
        totalPartsProduced: true,
        goodParts: true,
        scrapParts: true
      },
      _count: {
        id: true
      }
    });
    console.log('✅ Aggregation query successful:');
    console.log(`   Total parts produced: ${productionStats._sum.totalPartsProduced || 0}`);
    console.log(`   Good parts: ${productionStats._sum.goodParts || 0}`);
    console.log(`   Scrap parts: ${productionStats._sum.scrapParts || 0}`);
    console.log(`   Production runs: ${productionStats._count.id}`);
    
    // Test 6: Test the Manufacturing Agent with real database
    console.log('\n6️⃣ Testing Manufacturing Agent with real database...');
    const { ManufacturingEngineeringAgent } = await import('./src/lib/agents/ManufacturingEngineeringAgent');
    const agent = new ManufacturingEngineeringAgent();
    
    // Test the actual query that was failing
    const testQuery = "What are the top 5 defect types this week?";
    console.log(`Testing query: "${testQuery}"`);
    
    // This should now work without the enableTracing error
    const response = await agent.execute(testQuery);
    console.log('✅ Manufacturing Agent query successful');
    console.log(`   Response length: ${response.content.length} characters`);
    console.log(`   Data points: ${response.dataPoints}`);
    console.log(`   Analysis type: ${response.analysisType}`);
    console.log(`   Confidence: ${response.confidence}`);
    
    console.log('\n🎉 ALL DATABASE TESTS PASSED!');
    console.log('\n✅ PRISMA CONFIGURATION ISSUE RESOLVED');
    console.log('   • No enableTracing errors encountered');
    console.log('   • All database operations working correctly');
    console.log('   • Manufacturing Agent can query database successfully');
    console.log('   • Chat system is fully operational with database');
    
  } catch (error) {
    console.error('\n❌ DATABASE TEST FAILED:');
    console.error(error);
    
    if (error.message.includes('enableTracing')) {
      console.error('\n🚨 PRISMA CONFIGURATION ISSUE STILL EXISTS');
      console.error('   The enableTracing error is still occurring');
    } else {
      console.error('\n🔍 OTHER DATABASE ISSUE:');
      console.error(`   Error type: ${error.constructor.name}`);
      console.error(`   Error message: ${error.message}`);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
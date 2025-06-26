import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

async function testAIEnhancements() {
  console.log('🤖 Testing AI Enhancement Implementation...\n');

  try {
    // Test 1: Check DimDateRange
    console.log('1️⃣ Testing DimDateRange:');
    const dateRanges = await prisma.dimDateRange.findMany({
      orderBy: { id: 'asc' },
      take: 5
    });
    console.log(`   ✓ Found ${dateRanges.length} date ranges`);
    if (dateRanges.length > 0) {
      console.log(`   Examples: ${dateRanges.slice(0, 3).map(r => r.name).join(', ')}`);
    }

    // Test 2: Check OntologyTerm
    console.log('\n2️⃣ Testing OntologyTerm:');
    const ontologyTerms = await prisma.ontologyTerm.findMany({
      orderBy: { priority: 'desc' },
      take: 10
    });
    console.log(`   ✓ Found ${ontologyTerms.length} ontology terms`);
    if (ontologyTerms.length > 0) {
      console.log(`   Examples:`);
      ontologyTerms.slice(0, 5).forEach(term => {
        console.log(`     - "${term.term}" → ${term.modelName}.${term.fieldName} (priority: ${term.priority})`);
      });
    }

    // Test 3: Test AI query mapping
    console.log('\n3️⃣ Testing AI Query Mapping:');
    const testQueries = ['oee', 'downtime', 'mtbf', 'equipment', 'scrap'];
    
    for (const query of testQueries) {
      const mappedTerms = await prisma.ontologyTerm.findMany({
        where: {
          term: {
            contains: query,
            mode: 'insensitive'
          }
        },
        orderBy: { priority: 'desc' }
      });
      
      if (mappedTerms.length > 0) {
        console.log(`   ✓ Query "${query}" maps to: ${mappedTerms[0].modelName}.${mappedTerms[0].fieldName}`);
      }
    }

    // Test 4: Check if we can use date ranges for queries
    console.log('\n4️⃣ Testing Date Range Queries:');
    const today = await prisma.dimDateRange.findFirst({
      where: { name: 'Today' }
    });
    
    if (today) {
      console.log(`   ✓ Today's date range: ${today.startDate.toISOString().split('T')[0]} to ${today.endDate.toISOString().split('T')[0]}`);
    }

    const lastWeek = await prisma.dimDateRange.findFirst({
      where: { name: 'Last Week' }
    });
    
    if (lastWeek) {
      console.log(`   ✓ Last week's range: ${lastWeek.startDate.toISOString().split('T')[0]} to ${lastWeek.endDate.toISOString().split('T')[0]}`);
    }

    console.log('\n✅ AI Enhancement Implementation Test Complete!');
    console.log('   The ontology terms and date ranges are ready for intelligent chat queries.');

  } catch (error) {
    console.error('❌ Error testing AI enhancements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAIEnhancements();
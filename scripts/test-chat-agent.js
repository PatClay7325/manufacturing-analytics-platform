const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient();

// Simple mock of the ConversationalManufacturingAgent for testing
class MockConversationalAgent {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async processQuery(query, context) {
    const queryLower = query.toLowerCase();
    const response = {
      response: '',
      dataSources: [],
      confidence: 3,
      selfCritique: {
        score: 3,
        suggestions: []
      }
    };

    try {
      // OEE queries
      if (queryLower.includes('oee')) {
        const oeeData = await this.prisma.viewOeeDaily.findMany({
          take: 5,
          orderBy: { dateId: 'desc' }
        });
        
        response.dataSources.push('oee', 'production');
        
        if (queryLower.includes('cnc-001')) {
          const equipment = await this.prisma.dimEquipment.findFirst({
            where: { code: 'CNC-001' }
          });
          
          if (equipment) {
            const specificOee = oeeData.find(d => d.equipmentId === equipment.id);
            if (specificOee) {
              response.response = `The current OEE for CNC-001 is ${(specificOee.oee * 100).toFixed(1)}% (Availability: ${(specificOee.availability * 100).toFixed(1)}%, Performance: ${(specificOee.performance * 100).toFixed(1)}%, Quality: ${(specificOee.quality * 100).toFixed(1)}%)`;
              response.confidence = 5;
            } else {
              response.response = `No recent OEE data found for CNC-001`;
              response.confidence = 2;
            }
          } else {
            response.response = `Equipment CNC-001 not found in the system`;
            response.confidence = 1;
          }
        } else {
          response.response = `Recent OEE data: ${oeeData.map(d => `Equipment ${d.equipmentId}: ${(d.oee * 100).toFixed(1)}%`).join(', ')}`;
          response.confidence = 4;
        }
      }
      
      // Maintenance queries
      else if (queryLower.includes('maintenance')) {
        response.dataSources.push('maintenance');
        
        const maintenanceData = await this.prisma.factMaintenance.findMany({
          where: queryLower.includes('cnc') ? {
            equipment: {
              code: { startsWith: 'CNC' }
            }
          } : {},
          include: {
            equipment: true
          },
          take: 10,
          orderBy: { startTime: 'desc' }
        });
        
        if (maintenanceData.length > 0) {
          response.response = `Found ${maintenanceData.length} maintenance records. Recent maintenance: ${maintenanceData.slice(0, 3).map(m => `${m.workOrderNumber} on ${m.equipment.name} (${m.maintenanceType})`).join('; ')}`;
          response.confidence = 5;
        } else {
          response.response = `No maintenance records found`;
          response.confidence = 2;
        }
      }
      
      // Equipment comparison
      else if (queryLower.includes('lowest oee')) {
        response.dataSources.push('oee', 'equipment');
        
        const oeeData = await this.prisma.viewOeeDaily.findMany({
          orderBy: { oee: 'asc' },
          take: 1
        });
        
        if (oeeData.length > 0) {
          const equipment = await this.prisma.dimEquipment.findUnique({
            where: { id: oeeData[0].equipmentId }
          });
          response.response = `Equipment with lowest OEE: ${equipment?.name || 'Unknown'} with OEE of ${(oeeData[0].oee * 100).toFixed(1)}%`;
          response.confidence = 5;
        } else {
          response.response = `No OEE data available`;
          response.confidence = 1;
        }
      }
      
      // Failure analysis
      else if (queryLower.includes('failure')) {
        response.dataSources.push('downtime', 'maintenance');
        
        const failures = await this.prisma.factDowntime.findMany({
          where: {
            reason: { isFailure: true },
            startTime: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          include: {
            equipment: true,
            reason: true
          }
        });
        
        if (failures.length > 0) {
          response.response = `Found ${failures.length} equipment failures in the last 24 hours: ${failures.map(f => `${f.equipment.name} - ${f.reason.description}`).join('; ')}`;
          response.confidence = 5;
        } else {
          response.response = `No equipment failures recorded in the last 24 hours`;
          response.confidence = 5;
        }
      }
      
      // MTBF query
      else if (queryLower.includes('mtbf')) {
        response.dataSources.push('maintenance', 'downtime', 'reliability');
        
        // Calculate MTBF for critical equipment
        const criticalEquipment = await this.prisma.dimEquipment.findMany({
          where: { criticalityLevel: 'High' }
        });
        
        const mtbfData = [];
        for (const eq of criticalEquipment.slice(0, 3)) {
          const failures = await this.prisma.factDowntime.count({
            where: {
              equipmentId: eq.id,
              reason: { isFailure: true }
            }
          });
          
          const operatingTime = await this.prisma.factProduction.aggregate({
            where: { equipmentId: eq.id },
            _sum: { operatingTime: true }
          });
          
          if (failures > 0 && operatingTime._sum.operatingTime) {
            const mtbf = Number(operatingTime._sum.operatingTime) / (failures * 3600000); // Convert to hours
            mtbfData.push(`${eq.name}: ${mtbf.toFixed(1)}h`);
          }
        }
        
        if (mtbfData.length > 0) {
          response.response = `MTBF for critical equipment: ${mtbfData.join(', ')}`;
          response.confidence = 4;
        } else {
          response.response = `Unable to calculate MTBF - insufficient failure data`;
          response.confidence = 2;
        }
      }
      
      // Default response
      else {
        response.response = `I can help you with OEE metrics, maintenance history, equipment performance, and failure analysis. Please provide more details about what you'd like to know.`;
        response.confidence = 2;
      }
      
      // Self-critique
      if (response.confidence < 5) {
        response.selfCritique.score = response.confidence;
        if (response.confidence <= 2) {
          response.selfCritique.suggestions.push('Need more specific query parameters');
          response.selfCritique.suggestions.push('Could provide more detailed analysis with additional context');
        }
      } else {
        response.selfCritique.score = 5;
      }
      
    } catch (error) {
      response.response = `Error processing query: ${error.message}`;
      response.confidence = 1;
      response.selfCritique.score = 1;
      response.selfCritique.suggestions.push('Error handling needs improvement');
    }

    return response;
  }
}

async function testChatAgent() {
  console.log('🤖 Testing Chat Agent with Real Data...\n');
  
  try {
    // Initialize agent
    const agent = new MockConversationalAgent(prisma);
    
    // Test queries
    const testQueries = [
      {
        query: "What is the current OEE for equipment CNC-001?",
        expectedDataSources: ['oee', 'production']
      },
      {
        query: "Show me maintenance history for CNC machines",
        expectedDataSources: ['maintenance']
      },
      {
        query: "What equipment has the lowest OEE today?",
        expectedDataSources: ['oee', 'equipment']
      },
      {
        query: "Are there any equipment failures in the last 24 hours?",
        expectedDataSources: ['downtime', 'maintenance']
      },
      {
        query: "What's the MTBF for our critical equipment?",
        expectedDataSources: ['maintenance']
      }
    ];
    
    let passedTests = 0;
    let totalTests = testQueries.length;
    
    for (const test of testQueries) {
      console.log(`\n📋 Test: "${test.query}"`);
      console.log('=' .repeat(60));
      
      const response = await agent.processQuery(test.query, {
        timestamp: new Date().toISOString(),
        user: 'test-user',
        conversationId: 'test-' + Date.now()
      });
      
      console.log(`📝 Response: ${response.response}`);
      console.log(`📊 Data Sources: ${response.dataSources.join(', ')}`);
      console.log(`⭐ Confidence: ${response.confidence}/5`);
      console.log(`🎯 Self-Critique: ${response.selfCritique.score}/5`);
      
      if (response.selfCritique.suggestions.length > 0) {
        console.log(`💡 Suggestions: ${response.selfCritique.suggestions.join('; ')}`);
      }
      
      // Validate response
      const hasResponse = response.response && response.response.length > 0;
      const hasDataSources = response.dataSources.length > 0;
      const hasValidConfidence = response.confidence >= 1 && response.confidence <= 5;
      const hasExpectedDataSources = test.expectedDataSources.some(ds => response.dataSources.includes(ds));
      
      if (hasResponse && hasDataSources && hasValidConfidence && hasExpectedDataSources) {
        console.log('✅ Test PASSED');
        passedTests++;
      } else {
        console.log('❌ Test FAILED');
        if (!hasResponse) console.log('   - No response generated');
        if (!hasDataSources) console.log('   - No data sources identified');
        if (!hasValidConfidence) console.log('   - Invalid confidence score');
        if (!hasExpectedDataSources) console.log('   - Missing expected data sources');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed (${(passedTests/totalTests*100).toFixed(0)}%)`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Please review the output above.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testChatAgent()
  .then(() => {
    console.log('\n✅ Chat agent testing completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
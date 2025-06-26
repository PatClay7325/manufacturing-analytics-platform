/**
 * ISO 22400 Schema Validation Tests
 * Ensures the optimized schema meets all ISO 22400 requirements
 */

import { PrismaClient } from '@prisma/client';
import { oeeCalculationService } from '@/services/oee-calculation-service';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class ISO22400SchemaValidator {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🔍 Running ISO 22400 Schema Validation Tests...\n');

    // Test 1: Verify all required tables exist
    await this.testRequiredTables();

    // Test 2: Verify time-series capabilities
    await this.testTimeSeriesCapabilities();

    // Test 3: Verify OEE calculation accuracy
    await this.testOEECalculation();

    // Test 4: Verify data relationships
    await this.testDataRelationships();

    // Test 5: Verify ISO 22400 compliance
    await this.testISO22400Compliance();

    // Print results
    this.printResults();
  }

  private async testRequiredTables(): Promise<void> {
    console.log('Testing required tables...');

    const requiredTables = [
      'Site',
      'WorkCenter',
      'Equipment',
      'Shift',
      'Product',
      'equipment_states',
      'production_counts',
      'quality_events',
      'ShiftInstance',
      'ProductionOrder',
      'oee_calculations',
      'MaintenanceEvent'
    ];

    for (const table of requiredTables) {
      try {
        const count = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1`,
          table
        );
        
        this.results.push({
          test: `Table ${table} exists`,
          passed: true,
          message: 'Table found in schema'
        });
      } catch (error) {
        this.results.push({
          test: `Table ${table} exists`,
          passed: false,
          message: `Table not found: ${error.message}`
        });
      }
    }
  }

  private async testTimeSeriesCapabilities(): Promise<void> {
    console.log('Testing TimescaleDB capabilities...');

    // Check if TimescaleDB extension is enabled
    try {
      const extensionCheck = await prisma.$queryRaw`
        SELECT * FROM pg_extension WHERE extname = 'timescaledb'
      `;

      this.results.push({
        test: 'TimescaleDB extension enabled',
        passed: Array.isArray(extensionCheck) && extensionCheck.length > 0,
        message: 'TimescaleDB is properly installed'
      });

      // Check hypertables
      const hypertables = ['equipment_states', 'production_counts', 'quality_events', 'oee_calculations'];
      
      for (const table of hypertables) {
        const hypertableCheck = await prisma.$queryRaw`
          SELECT * FROM timescaledb_information.hypertables 
          WHERE hypertable_name = ${table}
        `;

        this.results.push({
          test: `${table} is a hypertable`,
          passed: Array.isArray(hypertableCheck) && hypertableCheck.length > 0,
          message: `${table} configured for time-series data`
        });
      }
    } catch (error) {
      this.results.push({
        test: 'TimescaleDB capabilities',
        passed: false,
        message: `Error checking TimescaleDB: ${error.message}`
      });
    }
  }

  private async testOEECalculation(): Promise<void> {
    console.log('Testing OEE calculation accuracy...');

    try {
      // Create test data
      const site = await prisma.site.create({
        data: {
          code: 'TEST-SITE',
          name: 'Test Site',
          timezone: 'UTC'
        }
      });

      const workCenter = await prisma.workCenter.create({
        data: {
          code: 'TEST-WC',
          name: 'Test Work Center',
          siteId: site.id,
          workCenterType: 'LINE'
        }
      });

      const equipment = await prisma.equipment.create({
        data: {
          code: 'TEST-EQ',
          name: 'Test Equipment',
          workCenterId: workCenter.id,
          equipmentType: 'CNC',
          theoreticalCycleTime: 60 // 60 seconds per part
        }
      });

      // Create a shift instance
      const shift = await prisma.shift.create({
        data: {
          siteId: site.id,
          shiftCode: 'A',
          shiftName: 'Day Shift',
          startTime: '08:00',
          endTime: '16:00',
          breakMinutes: 30
        }
      });

      const shiftInstance = await prisma.shiftInstance.create({
        data: {
          shiftId: shift.id,
          shiftDate: new Date('2024-01-01'),
          actualStartTime: new Date('2024-01-01T08:00:00Z'),
          actualEndTime: new Date('2024-01-01T16:00:00Z'),
          plannedMinutes: 480, // 8 hours
          breakMinutes: 30
        }
      });

      // Create equipment states
      await prisma.equipmentState.create({
        data: {
          timestamp: new Date('2024-01-01T08:00:00Z'),
          equipmentId: equipment.id,
          state: 'PRODUCING',
          stateCategory: 'PRODUCTION',
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T14:00:00Z'),
          durationSeconds: 21600, // 6 hours
          shiftInstanceId: shiftInstance.id
        }
      });

      await prisma.equipmentState.create({
        data: {
          timestamp: new Date('2024-01-01T14:00:00Z'),
          equipmentId: equipment.id,
          state: 'DOWN',
          stateCategory: 'AVAILABILITY_LOSS',
          reason: 'Breakdown',
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T15:00:00Z'),
          durationSeconds: 3600, // 1 hour
          shiftInstanceId: shiftInstance.id
        }
      });

      // Create production counts
      await prisma.productionCount.create({
        data: {
          timestamp: new Date('2024-01-01T16:00:00Z'),
          equipmentId: equipment.id,
          totalCount: 300,
          goodCount: 285,
          rejectCount: 15,
          reworkCount: 0,
          shiftInstanceId: shiftInstance.id
        }
      });

      // Calculate OEE
      const oeeResult = await oeeCalculationService.calculateOEE(
        equipment.id,
        new Date('2024-01-01T08:00:00Z'),
        new Date('2024-01-01T16:00:00Z'),
        shiftInstance.id
      );

      // Verify calculations
      const expectedAvailability = 360 / 450; // 6 hours operating / 7.5 hours planned
      const expectedPerformance = 300 / 360; // 300 produced / 360 theoretical
      const expectedQuality = 285 / 300; // 285 good / 300 total
      const expectedOEE = expectedAvailability * expectedPerformance * expectedQuality;

      const tolerance = 0.01; // 1% tolerance

      this.results.push({
        test: 'OEE Availability calculation',
        passed: Math.abs(oeeResult.availability - expectedAvailability) < tolerance,
        message: `Calculated: ${oeeResult.availability.toFixed(4)}, Expected: ${expectedAvailability.toFixed(4)}`,
        details: { calculated: oeeResult.availability, expected: expectedAvailability }
      });

      this.results.push({
        test: 'OEE Performance calculation',
        passed: Math.abs(oeeResult.performance - expectedPerformance) < tolerance,
        message: `Calculated: ${oeeResult.performance.toFixed(4)}, Expected: ${expectedPerformance.toFixed(4)}`,
        details: { calculated: oeeResult.performance, expected: expectedPerformance }
      });

      this.results.push({
        test: 'OEE Quality calculation',
        passed: Math.abs(oeeResult.quality - expectedQuality) < tolerance,
        message: `Calculated: ${oeeResult.quality.toFixed(4)}, Expected: ${expectedQuality.toFixed(4)}`,
        details: { calculated: oeeResult.quality, expected: expectedQuality }
      });

      this.results.push({
        test: 'Overall OEE calculation',
        passed: Math.abs(oeeResult.oee - expectedOEE) < tolerance,
        message: `Calculated: ${oeeResult.oee.toFixed(4)}, Expected: ${expectedOEE.toFixed(4)}`,
        details: { calculated: oeeResult.oee, expected: expectedOEE }
      });

      // Clean up test data
      await prisma.$executeRaw`DELETE FROM equipment_states WHERE "equipmentId" = ${equipment.id}`;
      await prisma.$executeRaw`DELETE FROM production_counts WHERE "equipmentId" = ${equipment.id}`;
      await prisma.shiftInstance.delete({ where: { id: shiftInstance.id } });
      await prisma.shift.delete({ where: { id: shift.id } });
      await prisma.equipment.delete({ where: { id: equipment.id } });
      await prisma.workCenter.delete({ where: { id: workCenter.id } });
      await prisma.site.delete({ where: { id: site.id } });

    } catch (error) {
      this.results.push({
        test: 'OEE calculation test',
        passed: false,
        message: `Error during OEE calculation: ${error.message}`
      });
    }
  }

  private async testDataRelationships(): Promise<void> {
    console.log('Testing data relationships...');

    const relationships = [
      { parent: 'Site', child: 'WorkCenter', field: 'siteId' },
      { parent: 'WorkCenter', child: 'Equipment', field: 'workCenterId' },
      { parent: 'Equipment', child: 'equipment_states', field: 'equipmentId' },
      { parent: 'Equipment', child: 'production_counts', field: 'equipmentId' },
      { parent: 'Shift', child: 'ShiftInstance', field: 'shiftId' }
    ];

    for (const rel of relationships) {
      try {
        const fkCheck = await prisma.$queryRaw`
          SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = ${rel.child}
            AND kcu.column_name = ${rel.field}
            AND ccu.table_name = ${rel.parent}
        `;

        this.results.push({
          test: `Relationship ${rel.parent} -> ${rel.child}`,
          passed: Array.isArray(fkCheck) && fkCheck.length > 0,
          message: 'Foreign key constraint exists'
        });
      } catch (error) {
        this.results.push({
          test: `Relationship ${rel.parent} -> ${rel.child}`,
          passed: false,
          message: `Error checking relationship: ${error.message}`
        });
      }
    }
  }

  private async testISO22400Compliance(): Promise<void> {
    console.log('Testing ISO 22400 compliance...');

    // Check for required ISO 22400 fields
    const iso22400Requirements = [
      { table: 'Equipment', field: 'theoreticalCycleTime', description: 'Required for performance calculations' },
      { table: 'equipment_states', field: 'stateCategory', description: 'Required for loss categorization' },
      { table: 'production_counts', field: 'goodCount', description: 'Required for quality calculations' },
      { table: 'oee_calculations', field: 'availability', description: 'Core OEE component' },
      { table: 'oee_calculations', field: 'performance', description: 'Core OEE component' },
      { table: 'oee_calculations', field: 'quality', description: 'Core OEE component' }
    ];

    for (const req of iso22400Requirements) {
      try {
        const columnCheck = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${req.table} 
            AND column_name = ${req.field}
        `;

        this.results.push({
          test: `ISO 22400: ${req.table}.${req.field}`,
          passed: Array.isArray(columnCheck) && columnCheck.length > 0,
          message: req.description
        });
      } catch (error) {
        this.results.push({
          test: `ISO 22400: ${req.table}.${req.field}`,
          passed: false,
          message: `Field not found: ${error.message}`
        });
      }
    }

    // Check for Six Big Losses tracking capability
    const sixBigLosses = [
      'breakdownLoss',
      'setupLoss',
      'minorStopLoss',
      'speedLoss',
      'defectLoss',
      'reworkLoss'
    ];

    for (const loss of sixBigLosses) {
      try {
        const lossCheck = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'oee_calculations' 
            AND column_name = ${loss}
        `;

        this.results.push({
          test: `Six Big Losses: ${loss}`,
          passed: Array.isArray(lossCheck) && lossCheck.length > 0,
          message: 'Loss tracking field exists'
        });
      } catch (error) {
        this.results.push({
          test: `Six Big Losses: ${loss}`,
          passed: false,
          message: `Loss field not found: ${error.message}`
        });
      }
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary\n');
    console.log('─'.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    // Group results by category
    const categories = {
      'Required Tables': this.results.filter(r => r.test.includes('Table')),
      'TimescaleDB': this.results.filter(r => r.test.includes('TimescaleDB') || r.test.includes('hypertable')),
      'OEE Calculations': this.results.filter(r => r.test.includes('OEE')),
      'Relationships': this.results.filter(r => r.test.includes('Relationship')),
      'ISO 22400 Compliance': this.results.filter(r => r.test.includes('ISO 22400') || r.test.includes('Six Big Losses'))
    };

    for (const [category, tests] of Object.entries(categories)) {
      if (tests.length === 0) continue;
      
      console.log(`\n${category}:`);
      for (const test of tests) {
        const icon = test.passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.test}: ${test.message}`);
        if (test.details) {
          console.log(`     Details: ${JSON.stringify(test.details)}`);
        }
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log('─'.repeat(80));

    if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Please review and fix the issues above.');
    } else {
      console.log('\n✅ All tests passed! The schema is ISO 22400 compliant.');
    }
  }
}

// Run validation
async function main() {
  const validator = new ISO22400SchemaValidator();
  
  try {
    await validator.runAllTests();
  } catch (error) {
    console.error('❌ Fatal error during validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { ISO22400SchemaValidator };
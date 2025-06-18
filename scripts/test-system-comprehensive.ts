#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

console.log('🔍 Manufacturing Analytics Platform - Comprehensive System Test\n');

async function testDatabase() {
  console.log('📊 Testing Database Connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test basic CRUD operations
    const equipment = await prisma.equipment.create({
      data: {
        name: 'Test Machine',
        type: 'CNC',
        manufacturerCode: 'TEST-001',
        serialNumber: `SN-${Date.now()}`,
        status: 'operational',
        installationDate: new Date(),
      },
    });
    console.log('✅ Created test equipment:', equipment.name);

    // Create related data
    const alert = await prisma.alert.create({
      data: {
        equipmentId: equipment.id,
        alertType: 'maintenance',
        severity: 'low',
        message: 'Test alert',
        status: 'active',
      },
    });
    console.log('✅ Created test alert');

    const metric = await prisma.metric.create({
      data: {
        equipmentId: equipment.id,
        name: 'temperature',
        value: 72.5,
        unit: '°C',
        timestamp: new Date(),
      },
    });
    console.log('✅ Created test metric');

    // Test relationships
    const equipmentWithRelations = await prisma.equipment.findUnique({
      where: { id: equipment.id },
      include: {
        alerts: true,
        metrics: true,
      },
    });
    console.log('✅ Retrieved equipment with relations:', {
      alerts: equipmentWithRelations?.alerts.length,
      metrics: equipmentWithRelations?.metrics.length,
    });

    // Cleanup
    await prisma.metric.deleteMany({ where: { equipmentId: equipment.id } });
    await prisma.alert.deleteMany({ where: { equipmentId: equipment.id } });
    await prisma.equipment.delete({ where: { id: equipment.id } });
    console.log('✅ Cleaned up test data');

    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}

async function testServices() {
  console.log('\n🔧 Testing Services...');
  try {
    // Import services
    const { equipmentService } = await import('../src/services/equipmentService');
    const { alertService } = await import('../src/services/alertService');
    
    console.log('✅ Services imported successfully');
    
    // Test service functions
    const allEquipment = await equipmentService.getAll();
    console.log('✅ Equipment service working, found', allEquipment.length, 'equipment');
    
    const alerts = await alertService.getActive();
    console.log('✅ Alert service working, found', alerts.length, 'active alerts');
    
    return true;
  } catch (error) {
    console.error('❌ Service test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Running Test Suites...');
  const results = {
    unit: { passed: false, output: '' },
    integration: { passed: false, output: '' },
  };

  try {
    // Run unit tests
    console.log('  Running unit tests...');
    try {
      results.unit.output = execSync('npm run test:unit -- --reporter=json', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      results.unit.passed = true;
      console.log('  ✅ Unit tests passed');
    } catch (error: any) {
      console.log('  ❌ Unit tests failed');
      results.unit.output = error.stdout || error.message;
    }

    // Run integration tests
    console.log('  Running integration tests...');
    try {
      results.integration.output = execSync('npm run test:integration -- --reporter=json', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      results.integration.passed = true;
      console.log('  ✅ Integration tests passed');
    } catch (error: any) {
      console.log('  ❌ Integration tests failed');
      results.integration.output = error.stdout || error.message;
    }

    return results;
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return results;
  }
}

async function checkEnvironment() {
  console.log('\n🌍 Checking Environment...');
  
  const checks = {
    nodeVersion: process.version,
    prismaVersion: '',
    postgresConnection: false,
    envVariables: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DIRECT_DATABASE_URL: !!process.env.DIRECT_DATABASE_URL,
    },
  };

  try {
    // Check Prisma version
    const prismaVersion = execSync('npx prisma --version', { encoding: 'utf8' });
    checks.prismaVersion = prismaVersion.split('\n')[0];
    console.log('✅ Prisma version:', checks.prismaVersion);

    // Check PostgreSQL connection
    await prisma.$executeRaw`SELECT 1`;
    checks.postgresConnection = true;
    console.log('✅ PostgreSQL connection verified');

    // Check environment variables
    console.log('✅ Environment variables:', checks.envVariables);

    return checks;
  } catch (error) {
    console.error('❌ Environment check failed:', error);
    return checks;
  }
}

async function generateReport() {
  console.log('\n📋 Generating Comprehensive Test Report...\n');
  
  const environment = await checkEnvironment();
  const databaseTest = await testDatabase();
  const serviceTest = await testServices();
  const testResults = await runTests();

  const report = {
    timestamp: new Date().toISOString(),
    environment,
    tests: {
      database: databaseTest,
      services: serviceTest,
      unit: testResults.unit.passed,
      integration: testResults.integration.passed,
    },
    summary: {
      totalChecks: 4,
      passed: [databaseTest, serviceTest, testResults.unit.passed, testResults.integration.passed].filter(Boolean).length,
    },
  };

  console.log('\n=====================================');
  console.log('📊 FINAL REPORT');
  console.log('=====================================');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Environment: Node ${environment.nodeVersion}`);
  console.log(`Database: ${environment.postgresConnection ? 'Connected' : 'Not Connected'}`);
  console.log('\nTest Results:');
  console.log(`  - Database Operations: ${report.tests.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Service Layer: ${report.tests.services ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Unit Tests: ${report.tests.unit ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Integration Tests: ${report.tests.integration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nOVERALL: ${report.summary.passed}/${report.summary.totalChecks} checks passed`);
  console.log('=====================================\n');

  // Save report to file
  const fs = await import('fs/promises');
  await fs.writeFile(
    'test-report-comprehensive.json',
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log('📄 Full report saved to test-report-comprehensive.json');

  await prisma.$disconnect();
  process.exit(report.summary.passed === report.summary.totalChecks ? 0 : 1);
}

// Run the comprehensive test
generateReport().catch(console.error);
// Database test setup
// Configures test database connection and utilities

const { PrismaClient } = require('@prisma/client');

// Global test database client
let testPrisma;

// Setup database for tests
beforeAll(async () => {
  // Create test database client
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Connect to database
  await testPrisma.$connect();

  // Clear existing test data
  await clearTestData();
  
  console.log('Database test setup completed');
});

// Cleanup after tests
afterAll(async () => {
  if (testPrisma) {
    await clearTestData();
    await testPrisma.$disconnect();
  }
});

// Clear test data in proper order (respecting foreign key constraints)
async function clearTestData() {
  try {
    // Delete fact tables first (they reference other tables)
    await testPrisma.factOeeMetric.deleteMany();
    await testPrisma.factProductionQuantity.deleteMany();
    await testPrisma.factEquipmentState.deleteMany();
    await testPrisma.factQualityMetric.deleteMany();
    await testPrisma.factPerformanceMetric.deleteMany();
    await testPrisma.factEnergyMetric.deleteMany();
    await testPrisma.factMaintenanceEvent.deleteMany();
    
    // Delete production orders
    await testPrisma.productionOrder.deleteMany();
    
    // Delete equipment and hierarchy
    await testPrisma.equipment.deleteMany();
    await testPrisma.workCenter.deleteMany();
    await testPrisma.manufacturingArea.deleteMany();
    await testPrisma.shiftDefinition.deleteMany();
    await testPrisma.manufacturingSite.deleteMany();
    
    // Delete products
    await testPrisma.product.deleteMany();
  } catch (error) {
    console.warn('Error clearing test data:', error.message);
  }
}

// Database test utilities
global.dbUtils = {
  // Get the test database client
  getPrisma: () => testPrisma,

  // Create test manufacturing site
  createTestSite: async (overrides = {}) => {
    return await testPrisma.manufacturingSite.create({
      data: {
        siteCode: 'TEST_SITE',
        siteName: 'Test Manufacturing Site',
        address: '123 Test Street, Test City',
        timezone: 'UTC',
        ...overrides,
      },
    });
  },

  // Create test equipment with full hierarchy
  createTestEquipment: async (overrides = {}) => {
    // Create site if needed
    const site = await testPrisma.manufacturingSite.upsert({
      where: { siteCode: 'TEST_SITE' },
      update: {},
      create: {
        siteCode: 'TEST_SITE',
        siteName: 'Test Manufacturing Site',
        address: '123 Test Street, Test City',
        timezone: 'UTC',
      },
    });

    // Create area
    const area = await testPrisma.manufacturingArea.upsert({
      where: { 
        siteId_areaCode: {
          siteId: site.id,
          areaCode: 'TEST_AREA'
        }
      },
      update: {},
      create: {
        siteId: site.id,
        areaCode: 'TEST_AREA',
        areaName: 'Test Area',
        description: 'Test manufacturing area',
      },
    });

    // Create work center
    const workCenter = await testPrisma.workCenter.upsert({
      where: {
        areaId_workCenterCode: {
          areaId: area.id,
          workCenterCode: 'TEST_WC'
        }
      },
      update: {},
      create: {
        areaId: area.id,
        workCenterCode: 'TEST_WC',
        workCenterName: 'Test Work Center',
        theoreticalCapacity: 100.0,
      },
    });

    // Create equipment
    return await testPrisma.equipment.create({
      data: {
        workCenterId: workCenter.id,
        equipmentCode: 'TEST_EQ_001',
        equipmentName: 'Test Equipment',
        equipmentType: 'TEST',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        criticalityLevel: 'Standard',
        theoreticalCycleTime: 45.0,
        idealRunRate: 80.0,
        isActive: true,
        ...overrides,
      },
    });
  },

  // Create test product
  createTestProduct: async (overrides = {}) => {
    return await testPrisma.product.create({
      data: {
        productCode: 'TEST_PRODUCT',
        productName: 'Test Product',
        productFamily: 'Test Family',
        unitOfMeasure: 'EA',
        standardCost: 25.50,
        targetCycleTime: 40.0,
        ...overrides,
      },
    });
  },

  // Create test OEE metrics
  createTestOeeMetrics: async (equipmentId, count = 1, overrides = {}) => {
    const baseTime = new Date();
    const metrics = [];

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(baseTime.getTime() - (i * 60 * 60 * 1000)); // Each hour back
      
      metrics.push({
        timestamp,
        equipmentId,
        recordId: `test-record-${i}`,
        plannedProductionTime: 60.0,
        actualProductionTime: 50.0 + (Math.random() * 10),
        downtimeMinutes: 10.0 - (Math.random() * 10),
        plannedQuantity: 80.0,
        producedQuantity: 70.0 + (Math.random() * 10),
        goodQuantity: 65.0 + (Math.random() * 10),
        scrapQuantity: Math.random() * 5,
        availability: 0.80 + (Math.random() * 0.15),
        performance: 0.85 + (Math.random() * 0.10),
        quality: 0.90 + (Math.random() * 0.08),
        oee: 0.60 + (Math.random() * 0.20),
        ...overrides,
      });
    }

    return await testPrisma.factOeeMetric.createMany({
      data: metrics,
    });
  },

  // Wait for database operations
  waitForDatabase: async (operation, timeout = 5000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await operation();
        return;
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  },

  // Execute raw SQL
  executeRawSql: async (sql, params = []) => {
    return await testPrisma.$queryRawUnsafe(sql, ...params);
  },

  // Check if TimescaleDB extensions are available
  checkTimescaleDB: async () => {
    try {
      const result = await testPrisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM pg_extension 
        WHERE extname = 'timescaledb'
      `;
      return result[0]?.count > 0;
    } catch (error) {
      return false;
    }
  },

  // Clear all test data
  clearAllData: clearTestData,
};

module.exports = {
  clearTestData,
};
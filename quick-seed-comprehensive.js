const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

async function seedComprehensiveData() {
  console.log('🌱 Seeding comprehensive manufacturing data...');
  
  try {
    // Clean existing data first
    await prisma.metric.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.workCenter.deleteMany();
    await prisma.area.deleteMany();
    await prisma.site.deleteMany();
    await prisma.enterprise.deleteMany();
    
    // Create enterprise
    const enterprise = await prisma.enterprise.create({
      data: {
        id: 'ent-manufacturing-001',
        name: 'Advanced Manufacturing Corp',
        code: 'AMC-001',
        updatedAt: new Date(),
      }
    });
    
    // Create site
    const site = await prisma.site.create({
      data: {
        id: 'site-main-001',
        name: 'Main Manufacturing Facility',
        code: 'MAIN-001',
        location: '123 Industrial Pkwy, Detroit, MI',
        enterpriseId: enterprise.id,
        updatedAt: new Date(),
      }
    });
    
    // Create areas
    const productionArea = await prisma.area.create({
      data: {
        id: 'area-production-001',
        name: 'Production Floor',
        code: 'PROD-001',
        siteId: site.id,
        updatedAt: new Date(),
      }
    });
    
    const assemblyArea = await prisma.area.create({
      data: {
        id: 'area-assembly-001',
        name: 'Final Assembly',
        code: 'ASSY-001',
        siteId: site.id,
        updatedAt: new Date(),
      }
    });
    
    // Create work centers
    const workCenters = await Promise.all([
      prisma.workCenter.create({
        data: {
          id: 'wc-cnc-001',
          name: 'CNC Machining Center',
          code: 'CNC-001',
          areaId: productionArea.id,
          updatedAt: new Date(),
        }
      }),
      prisma.workCenter.create({
        data: {
          id: 'wc-weld-001',
          name: 'Welding Station A',
          code: 'WELD-001',
          areaId: productionArea.id,
          updatedAt: new Date(),
        }
      }),
      prisma.workCenter.create({
        data: {
          id: 'wc-assy-001',
          name: 'Assembly Line 1',
          code: 'ASSY-001',
          areaId: assemblyArea.id,
          updatedAt: new Date(),
        }
      })
    ]);
    
    console.log(`✅ Created ${workCenters.length} work centers`);
    
    // Create sample metrics
    const baseTime = new Date();
    const metrics = [];
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(baseTime.getTime() - (i * 60000)); // Every minute going back
      
      workCenters.forEach((wc, wcIndex) => {
        // Temperature metrics
        metrics.push({
          id: `temp-${wc.id}-${i}`,
          name: 'TEMPERATURE',
          value: 65 + Math.random() * 15, // 65-80°C
          unit: '°C',
          timestamp: timestamp,
          workCenterId: wc.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        
        // OEE metrics
        metrics.push({
          id: `oee-${wc.id}-${i}`,
          name: 'OEE',
          value: 75 + Math.random() * 20, // 75-95%
          unit: '%',
          timestamp: timestamp,
          workCenterId: wc.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        
        // Production count
        metrics.push({
          id: `prod-${wc.id}-${i}`,
          name: 'PRODUCTION_COUNT',
          value: Math.floor(50 + Math.random() * 30), // 50-80 units
          unit: 'units',
          timestamp: timestamp,
          workCenterId: wc.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      });
    }
    
    // Insert metrics in batches
    for (let i = 0; i < metrics.length; i += 50) {
      const batch = metrics.slice(i, i + 50);
      await prisma.metric.createMany({
        data: batch
      });
    }
    
    console.log(`✅ Created ${metrics.length} metrics`);
    
    // Create sample alerts
    const alerts = [
      {
        id: 'alert-temp-001',
        alertType: 'THRESHOLD',
        severity: 'high',
        title: 'High Temperature Alert',
        message: 'CNC machine temperature exceeds normal operating range',
        metricName: 'TEMPERATURE',
        currentValue: 82.5,
        thresholdValue: 80.0,
        unit: '°C',
        status: 'active',
        timestamp: new Date(),
        workCenterId: workCenters[0].id,
        updatedAt: new Date(),
      },
      {
        id: 'alert-prod-001',
        alertType: 'PERFORMANCE',
        severity: 'medium',
        title: 'Low Production Rate',
        message: 'Production rate below target for Assembly Line 1',
        metricName: 'PRODUCTION_COUNT',
        currentValue: 45,
        thresholdValue: 50,
        unit: 'units/hour',
        status: 'active',
        timestamp: new Date(),
        workCenterId: workCenters[2].id,
        updatedAt: new Date(),
      },
      {
        id: 'alert-maint-001',
        alertType: 'MAINTENANCE',
        severity: 'low',
        title: 'Scheduled Maintenance Due',
        message: 'Welding Station A requires weekly maintenance check',
        status: 'acknowledged',
        timestamp: new Date(),
        acknowledgedBy: 'maintenance-tech-001',
        acknowledgedAt: new Date(),
        workCenterId: workCenters[1].id,
        updatedAt: new Date(),
      }
    ];
    
    for (const alert of alerts) {
      await prisma.alert.create({ data: alert });
    }
    
    console.log(`✅ Created ${alerts.length} alerts`);
    
    console.log('✅ Comprehensive manufacturing data seeded successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - 1 Enterprise: ${enterprise.name}`);
    console.log(`   - 1 Site: ${site.name}`);
    console.log(`   - 2 Areas: Production Floor, Final Assembly`);
    console.log(`   - 3 Work Centers: CNC, Welding, Assembly`);
    console.log(`   - ${metrics.length} Metrics: Temperature, OEE, Production Count`);
    console.log(`   - ${alerts.length} Alerts: Active alerts for testing`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedComprehensiveData();
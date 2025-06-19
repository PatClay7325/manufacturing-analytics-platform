import { PrismaClient } from '@prisma/client';
import { addDays, subDays, startOfDay, endOfDay, addHours } from 'date-fns';

const prisma = new PrismaClient();

async function seedISOMetrics() {
  console.log('🏭 Starting ISO metrics seeding (simplified)...');
  
  const endDate = new Date();
  const startDate = subDays(endDate, 90);
  
  try {
    // Get all work units
    const workUnits = await prisma.workUnit.findMany();
    
    console.log(`Found ${workUnits.length} work units`);
    
    // Process each work unit
    for (const workUnit of workUnits) {
      console.log(`\n📊 Processing ${workUnit.name} (${workUnit.code})`);
      
      // Generate metrics for the last 90 days
      let currentDate = startOfDay(startDate);
      const metricsToCreate = [];
      const performanceMetricsToCreate = [];
      
      // Equipment baseline values
      const baseOEE = 85 + Math.random() * 10;
      
      while (currentDate <= endDate) {
        // Generate daily averages (simpler approach)
        const dailyAvailability = 85 + Math.random() * 15;
        const dailyPerformance = 80 + Math.random() * 20;
        const dailyQuality = 95 + Math.random() * 5;
        const dailyOEE = (dailyAvailability * dailyPerformance * dailyQuality) / 10000;
        
        // Create daily summary metrics
        metricsToCreate.push(
          {
            workUnitId: workUnit.id,
            timestamp: new Date(currentDate),
            name: 'DailyOEE',
            value: Number(dailyOEE.toFixed(1)),
            unit: '%',
            source: 'ISO22400',
            quality: 1.0
          },
          {
            workUnitId: workUnit.id,
            timestamp: new Date(currentDate),
            name: 'DailyAvailability',
            value: Number(dailyAvailability.toFixed(1)),
            unit: '%',
            source: 'ISO22400',
            quality: 1.0
          },
          {
            workUnitId: workUnit.id,
            timestamp: new Date(currentDate),
            name: 'DailyPerformance',
            value: Number(dailyPerformance.toFixed(1)),
            unit: '%',
            source: 'ISO22400',
            quality: 1.0
          },
          {
            workUnitId: workUnit.id,
            timestamp: new Date(currentDate),
            name: 'DailyQuality',
            value: Number(dailyQuality.toFixed(1)),
            unit: '%',
            source: 'ISO22400',
            quality: 1.0
          }
        );
        
        // Create performance metric
        const totalParts = Math.floor(400 + Math.random() * 200);
        const goodParts = Math.floor(totalParts * dailyQuality / 100);
        
        performanceMetricsToCreate.push({
          workUnitId: workUnit.id,
          timestamp: new Date(currentDate),
          availability: Number(dailyAvailability.toFixed(1)),
          performance: Number(dailyPerformance.toFixed(1)),
          quality: Number(dailyQuality.toFixed(1)),
          oeeScore: Number(dailyOEE.toFixed(1)),
          runTime: 480 * dailyAvailability / 100,
          plannedDowntime: 60,
          unplannedDowntime: 480 * (100 - dailyAvailability) / 100,
          totalParts,
          goodParts,
          shift: 'Day'
        });
        
        // Move to next day
        currentDate = addDays(currentDate, 1);
      }
      
      // Batch create metrics
      if (metricsToCreate.length > 0) {
        console.log(`  Creating ${metricsToCreate.length} metrics...`);
        // Create in smaller batches to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < metricsToCreate.length; i += batchSize) {
          const batch = metricsToCreate.slice(i, i + batchSize);
          await prisma.metric.createMany({ data: batch });
        }
      }
      
      if (performanceMetricsToCreate.length > 0) {
        console.log(`  Creating ${performanceMetricsToCreate.length} performance metrics...`);
        // Create in smaller batches
        const batchSize = 50;
        for (let i = 0; i < performanceMetricsToCreate.length; i += batchSize) {
          const batch = performanceMetricsToCreate.slice(i, i + batchSize);
          await prisma.performanceMetric.createMany({ data: batch });
        }
      }
      
      // Add some quality metrics
      const qualityMetrics = [];
      for (let i = 0; i < 10; i++) {
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        qualityMetrics.push({
          workUnitId: workUnit.id,
          timestamp: randomDate,
          parameter: 'Dimension',
          value: 10.0 + Math.random() * 0.1,
          uom: 'mm',
          nominal: 10.0,
          lowerLimit: 9.9,
          upperLimit: 10.1,
          isWithinSpec: Math.random() > 0.1,
          deviation: Math.random() * 0.1 - 0.05
        });
      }
      
      if (qualityMetrics.length > 0) {
        await prisma.qualityMetric.createMany({ data: qualityMetrics });
      }
      
      // Add reliability metrics
      const mtbf = 500 + Math.random() * 500; // 500-1000 hours
      const mttr = 1 + Math.random() * 3; // 1-4 hours
      
      await prisma.metric.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            timestamp: endDate,
            name: 'MTBF',
            value: Number(mtbf.toFixed(0)),
            unit: 'hours',
            source: 'Reliability',
            quality: 1.0
          },
          {
            workUnitId: workUnit.id,
            timestamp: endDate,
            name: 'MTTR',
            value: Number(mttr.toFixed(1)),
            unit: 'hours',
            source: 'Reliability',
            quality: 1.0
          }
        ]
      });
    }
    
    // Update KPI summaries
    console.log('\n📈 Updating KPI summaries...');
    await updateKPISummaries();
    
    console.log('\n✅ ISO metrics seeding completed!');
    
  } catch (error) {
    console.error('Error seeding metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updateKPISummaries() {
  // Get all work units with recent performance metrics
  const workUnits = await prisma.workUnit.findMany({
    include: {
      performanceMetrics: {
        where: {
          timestamp: {
            gte: subDays(new Date(), 30) // Last 30 days
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      }
    }
  });
  
  // Update work unit KPIs
  for (const workUnit of workUnits) {
    if (workUnit.performanceMetrics.length > 0) {
      const metrics = workUnit.performanceMetrics;
      const avgOEE = metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length;
      const avgAvailability = metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length;
      const avgPerformance = metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length;
      const avgQuality = metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length;
      const totalParts = metrics.reduce((sum, m) => sum + (m.totalParts || 0), 0);
      const totalDefects = metrics.reduce((sum, m) => sum + ((m.totalParts || 0) - (m.goodParts || 0)), 0);
      
      await prisma.kPISummary.upsert({
        where: { workUnitId: workUnit.id },
        create: {
          workUnitId: workUnit.id,
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction: BigInt(totalParts),
          totalDefects,
          mtbf: 720,
          mttr: 2
        },
        update: {
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction: BigInt(totalParts),
          totalDefects,
          updatedAt: new Date()
        }
      });
    }
  }
  
  // Update hierarchy KPIs
  await updateHierarchyKPIs();
}

async function updateHierarchyKPIs() {
  // Update work center KPIs
  const workCenters = await prisma.workCenter.findMany({
    include: {
      workUnits: {
        include: {
          kpiSummary: true
        }
      }
    }
  });
  
  for (const wc of workCenters) {
    const units = wc.workUnits.filter(u => u.kpiSummary);
    if (units.length > 0) {
      const totalProduction = units.reduce((s, u) => s + Number(u.kpiSummary?.totalProduction || 0), 0);
      await prisma.kPISummary.upsert({
        where: { workCenterId: wc.id },
        create: {
          workCenterId: wc.id,
          oee: Number((units.reduce((s, u) => s + (u.kpiSummary?.oee || 0), 0) / units.length).toFixed(1)),
          availability: Number((units.reduce((s, u) => s + (u.kpiSummary?.availability || 0), 0) / units.length).toFixed(1)),
          performance: Number((units.reduce((s, u) => s + (u.kpiSummary?.performance || 0), 0) / units.length).toFixed(1)),
          quality: Number((units.reduce((s, u) => s + (u.kpiSummary?.quality || 0), 0) / units.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: units.reduce((s, u) => s + (u.kpiSummary?.totalDefects || 0), 0)
        },
        update: {
          oee: Number((units.reduce((s, u) => s + (u.kpiSummary?.oee || 0), 0) / units.length).toFixed(1)),
          availability: Number((units.reduce((s, u) => s + (u.kpiSummary?.availability || 0), 0) / units.length).toFixed(1)),
          performance: Number((units.reduce((s, u) => s + (u.kpiSummary?.performance || 0), 0) / units.length).toFixed(1)),
          quality: Number((units.reduce((s, u) => s + (u.kpiSummary?.quality || 0), 0) / units.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: units.reduce((s, u) => s + (u.kpiSummary?.totalDefects || 0), 0),
          updatedAt: new Date()
        }
      });
    }
  }
  
  // Update area KPIs
  const areas = await prisma.area.findMany({
    include: {
      workCenters: {
        include: {
          kpiSummary: true
        }
      }
    }
  });
  
  for (const area of areas) {
    const centers = area.workCenters.filter(c => c.kpiSummary);
    if (centers.length > 0) {
      const totalProduction = centers.reduce((s, c) => s + Number(c.kpiSummary?.totalProduction || 0), 0);
      await prisma.kPISummary.upsert({
        where: { areaId: area.id },
        create: {
          areaId: area.id,
          oee: Number((centers.reduce((s, c) => s + (c.kpiSummary?.oee || 0), 0) / centers.length).toFixed(1)),
          availability: Number((centers.reduce((s, c) => s + (c.kpiSummary?.availability || 0), 0) / centers.length).toFixed(1)),
          performance: Number((centers.reduce((s, c) => s + (c.kpiSummary?.performance || 0), 0) / centers.length).toFixed(1)),
          quality: Number((centers.reduce((s, c) => s + (c.kpiSummary?.quality || 0), 0) / centers.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: centers.reduce((s, c) => s + (c.kpiSummary?.totalDefects || 0), 0)
        },
        update: {
          oee: Number((centers.reduce((s, c) => s + (c.kpiSummary?.oee || 0), 0) / centers.length).toFixed(1)),
          availability: Number((centers.reduce((s, c) => s + (c.kpiSummary?.availability || 0), 0) / centers.length).toFixed(1)),
          performance: Number((centers.reduce((s, c) => s + (c.kpiSummary?.performance || 0), 0) / centers.length).toFixed(1)),
          quality: Number((centers.reduce((s, c) => s + (c.kpiSummary?.quality || 0), 0) / centers.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: centers.reduce((s, c) => s + (c.kpiSummary?.totalDefects || 0), 0),
          updatedAt: new Date()
        }
      });
    }
  }
  
  // Update site KPIs
  const sites = await prisma.site.findMany({
    include: {
      areas: {
        include: {
          kpiSummary: true
        }
      }
    }
  });
  
  for (const site of sites) {
    const areas = site.areas.filter(a => a.kpiSummary);
    if (areas.length > 0) {
      const totalProduction = areas.reduce((s, a) => s + Number(a.kpiSummary?.totalProduction || 0), 0);
      await prisma.kPISummary.upsert({
        where: { siteId: site.id },
        create: {
          siteId: site.id,
          oee: Number((areas.reduce((s, a) => s + (a.kpiSummary?.oee || 0), 0) / areas.length).toFixed(1)),
          availability: Number((areas.reduce((s, a) => s + (a.kpiSummary?.availability || 0), 0) / areas.length).toFixed(1)),
          performance: Number((areas.reduce((s, a) => s + (a.kpiSummary?.performance || 0), 0) / areas.length).toFixed(1)),
          quality: Number((areas.reduce((s, a) => s + (a.kpiSummary?.quality || 0), 0) / areas.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: areas.reduce((s, a) => s + (a.kpiSummary?.totalDefects || 0), 0)
        },
        update: {
          oee: Number((areas.reduce((s, a) => s + (a.kpiSummary?.oee || 0), 0) / areas.length).toFixed(1)),
          availability: Number((areas.reduce((s, a) => s + (a.kpiSummary?.availability || 0), 0) / areas.length).toFixed(1)),
          performance: Number((areas.reduce((s, a) => s + (a.kpiSummary?.performance || 0), 0) / areas.length).toFixed(1)),
          quality: Number((areas.reduce((s, a) => s + (a.kpiSummary?.quality || 0), 0) / areas.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: areas.reduce((s, a) => s + (a.kpiSummary?.totalDefects || 0), 0),
          updatedAt: new Date()
        }
      });
    }
  }
  
  // Update enterprise KPIs
  const enterprise = await prisma.enterprise.findFirst({
    include: {
      sites: {
        include: {
          kpiSummary: true
        }
      }
    }
  });
  
  if (enterprise) {
    const sites = enterprise.sites.filter(s => s.kpiSummary);
    if (sites.length > 0) {
      const totalProduction = sites.reduce((s, site) => s + Number(site.kpiSummary?.totalProduction || 0), 0);
      await prisma.kPISummary.upsert({
        where: { enterpriseId: enterprise.id },
        create: {
          enterpriseId: enterprise.id,
          oee: Number((sites.reduce((s, site) => s + (site.kpiSummary?.oee || 0), 0) / sites.length).toFixed(1)),
          availability: Number((sites.reduce((s, site) => s + (site.kpiSummary?.availability || 0), 0) / sites.length).toFixed(1)),
          performance: Number((sites.reduce((s, site) => s + (site.kpiSummary?.performance || 0), 0) / sites.length).toFixed(1)),
          quality: Number((sites.reduce((s, site) => s + (site.kpiSummary?.quality || 0), 0) / sites.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: sites.reduce((s, site) => s + (site.kpiSummary?.totalDefects || 0), 0)
        },
        update: {
          oee: Number((sites.reduce((s, site) => s + (site.kpiSummary?.oee || 0), 0) / sites.length).toFixed(1)),
          availability: Number((sites.reduce((s, site) => s + (site.kpiSummary?.availability || 0), 0) / sites.length).toFixed(1)),
          performance: Number((sites.reduce((s, site) => s + (site.kpiSummary?.performance || 0), 0) / sites.length).toFixed(1)),
          quality: Number((sites.reduce((s, site) => s + (site.kpiSummary?.quality || 0), 0) / sites.length).toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: sites.reduce((s, site) => s + (site.kpiSummary?.totalDefects || 0), 0),
          updatedAt: new Date()
        }
      });
    }
  }
  
  console.log('✅ KPI summaries updated at all levels');
}

// Execute the seeding
seedISOMetrics()
  .catch(console.error)
  .finally(() => process.exit());
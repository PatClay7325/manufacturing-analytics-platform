import { PrismaClient } from '@prisma/client';
import { addDays, subDays, startOfDay, endOfDay, addHours } from 'date-fns';

const prisma = new PrismaClient();

async function seedComprehensiveMetrics() {
  console.log('🏭 Starting comprehensive ISO metrics seeding...');
  
  const endDate = new Date();
  const startDate = subDays(endDate, 90);
  
  try {
    // Get all work units with hierarchy
    const workUnits = await prisma.workUnit.findMany({
      include: {
        workCenter: {
          include: {
            area: {
              include: {
                site: {
                  include: {
                    enterprise: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`Found ${workUnits.length} work units to generate metrics for`);
    
    // Process each work unit
    for (const workUnit of workUnits) {
      console.log(`\n📊 Generating metrics for ${workUnit.name} (${workUnit.code})`);
      
      // Process in daily batches to avoid memory issues
      let currentDate = startOfDay(startDate);
      let totalFailures = 0;
      let totalDowntime = 0;
      let lastFailureDate = startDate;
      
      // Equipment-specific parameters
      const baseOEE = getBaseOEE(workUnit.equipmentType);
      const failureRate = getFailureRate(workUnit.equipmentType);
      
      while (currentDate <= endDate) {
        const dayEnd = endOfDay(currentDate);
        const metricsToCreate = [];
        const performanceMetricsToCreate = [];
        const qualityMetricsToCreate = [];
        const maintenanceRecordsToCreate = [];
        
        // Generate hourly metrics for this day
        let hourDate = new Date(currentDate);
        while (hourDate <= dayEnd && hourDate <= endDate) {
          const dayOfWeek = hourDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const hour = hourDate.getHours();
          
          // Shift patterns (3 shifts: 6-14, 14-22, 22-6)
          const shift = hour >= 6 && hour < 14 ? 1 : hour >= 14 && hour < 22 ? 2 : 3;
          const isProductionHour = !isWeekend || shift === 1; // Weekend only shift 1
          
          if (isProductionHour) {
            // Generate hourly production metrics
            const hourlyMetrics = generateHourlyMetrics(
              workUnit,
              hourDate,
              baseOEE,
              shift,
              isWeekend
            );
            
            // ISO 22400 KPIs using the correct Metric schema
            metricsToCreate.push({
              workUnitId: workUnit.id,
              timestamp: new Date(hourDate),
              name: 'OEE',
              value: hourlyMetrics.oee,
              unit: '%',
              quality: 1.0,
              source: 'ISO22400',
              tags: {
                shift,
                isWeekend,
                components: {
                  availability: hourlyMetrics.availability,
                  performance: hourlyMetrics.performance,
                  quality: hourlyMetrics.quality
                }
              }
            });
            
            // Core metrics
            metricsToCreate.push(
              {
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                name: 'Availability',
                value: hourlyMetrics.availability,
                unit: '%',
                quality: 1.0,
                source: 'ISO22400'
              },
              {
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                name: 'Performance',
                value: hourlyMetrics.performance,
                unit: '%',
                quality: 1.0,
                source: 'ISO22400'
              },
              {
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                name: 'Quality',
                value: hourlyMetrics.quality,
                unit: '%',
                quality: 1.0,
                source: 'ISO22400'
              },
              {
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                name: 'ProductionCount',
                value: hourlyMetrics.actualOutput,
                unit: 'units',
                quality: 1.0,
                source: 'MES'
              }
            );
            
            // Performance metrics
            performanceMetricsToCreate.push({
              workUnitId: workUnit.id,
              timestamp: new Date(hourDate),
              production: hourlyMetrics.actualOutput,
              availability: hourlyMetrics.availability,
              performance: hourlyMetrics.performance,
              quality: hourlyMetrics.quality,
              oee: hourlyMetrics.oee
            });
            
            // Random quality events (ISO 9001)
            if (Math.random() < 0.05) { // 5% chance
              const defectCount = Math.floor(Math.random() * 3) + 1;
              qualityMetricsToCreate.push({
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                parameter: 'NonConformities',
                value: defectCount,
                uom: 'count',
                nominal: 0,
                lowerLimit: 0,
                upperLimit: 0,
                isWithinSpec: false,
                deviation: defectCount
              });
              
              // Add defect metric
              metricsToCreate.push({
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                name: 'DefectCount',
                value: defectCount,
                unit: 'count',
                quality: 1.0,
                source: 'QualityControl'
              });
            }
            
            // Check for failures (reliability metrics)
            const timeSinceLastFailure = (hourDate.getTime() - lastFailureDate.getTime()) / (1000 * 60 * 60);
            if (Math.random() < failureRate && timeSinceLastFailure > 24) {
              totalFailures++;
              const downtime = Math.floor(Math.random() * 4 + 1); // 1-4 hours
              totalDowntime += downtime;
              lastFailureDate = hourDate;
              
              maintenanceRecordsToCreate.push({
                workUnitId: workUnit.id,
                maintenanceType: 'corrective',
                startTime: new Date(hourDate),
                endTime: addHours(hourDate, downtime),
                technician: `TECH-${Math.floor(Math.random() * 10) + 1}`,
                description: `Corrective maintenance - ${getFailureDescription(workUnit.equipmentType)}`,
                status: 'completed',
                parts: [`Part-${Math.floor(Math.random() * 100)}`],
                notes: `Downtime: ${downtime} hours`
              });
              
              // MTTR metric
              metricsToCreate.push({
                workUnitId: workUnit.id,
                timestamp: new Date(hourDate),
                name: 'MTTR',
                value: downtime,
                unit: 'hours',
                quality: 1.0,
                source: 'Maintenance'
              });
            }
          }
          
          hourDate = addHours(hourDate, 1);
        }
        
        // Batch create metrics for this day
        if (metricsToCreate.length > 0) {
          await prisma.metric.createMany({ data: metricsToCreate });
          console.log(`  ✓ Created ${metricsToCreate.length} metrics for ${currentDate.toDateString()}`);
        }
        
        if (performanceMetricsToCreate.length > 0) {
          await prisma.performanceMetric.createMany({ data: performanceMetricsToCreate });
        }
        
        if (qualityMetricsToCreate.length > 0) {
          await prisma.qualityMetric.createMany({ data: qualityMetricsToCreate });
        }
        
        if (maintenanceRecordsToCreate.length > 0) {
          await prisma.maintenanceRecord.createMany({ data: maintenanceRecordsToCreate });
        }
        
        // Move to next day
        currentDate = addDays(currentDate, 1);
      }
      
      // Add final reliability metrics for this work unit
      const totalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const mtbf = totalFailures > 0 ? (totalHours - totalDowntime) / totalFailures : totalHours;
      const availability = ((totalHours - totalDowntime) / totalHours) * 100;
      
      await prisma.metric.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            timestamp: endDate,
            name: 'MTBF',
            value: mtbf,
            unit: 'hours',
            quality: 1.0,
            source: 'Reliability',
            tags: {
              calculationPeriod: '90days',
              totalFailures,
              totalDowntime
            }
          },
          {
            workUnitId: workUnit.id,
            timestamp: endDate,
            name: 'EquipmentAvailability',
            value: availability,
            unit: '%',
            quality: 1.0,
            source: 'Reliability'
          }
        ]
      });
      
      console.log(`  ✓ Completed metrics for ${workUnit.name}`);
    }
    
    // Update KPI summaries
    console.log('\n📈 Updating KPI summaries...');
    await updateKPISummaries();
    
    console.log('\n✅ Comprehensive ISO metrics seeding completed!');
    
  } catch (error) {
    console.error('Error seeding metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getBaseOEE(equipmentType: string): number {
  const baseValues: Record<string, number> = {
    'CNC': 85,
    'Robot': 88,
    'Conveyor': 92,
    'Assembly': 80,
    'Welding': 83,
    'Packaging': 90,
    'Inspection': 95
  };
  return baseValues[equipmentType] || 85;
}

function getFailureRate(equipmentType: string): number {
  const rates: Record<string, number> = {
    'CNC': 0.002,
    'Robot': 0.0015,
    'Conveyor': 0.001,
    'Assembly': 0.0025,
    'Welding': 0.002,
    'Packaging': 0.001,
    'Inspection': 0.0005
  };
  return rates[equipmentType] || 0.002;
}

function generateHourlyMetrics(
  workUnit: any,
  timestamp: Date,
  baseOEE: number,
  shift: number,
  isWeekend: boolean
) {
  // Shift performance variations
  const shiftMultiplier = shift === 1 ? 1.0 : shift === 2 ? 0.98 : 0.95;
  const weekendMultiplier = isWeekend ? 0.9 : 1.0;
  
  // Add some realistic variations
  const hourOfDay = timestamp.getHours();
  const startOfShiftDip = [6, 14, 22].includes(hourOfDay) ? 0.95 : 1.0;
  const endOfShiftDip = [13, 21, 5].includes(hourOfDay) ? 0.97 : 1.0;
  
  // Random variations
  const randomVariation = 0.9 + Math.random() * 0.2;
  
  // Calculate components
  const availability = Math.min(100, 
    (92 + Math.random() * 8) * shiftMultiplier * weekendMultiplier * startOfShiftDip
  );
  
  const performance = Math.min(100,
    (88 + Math.random() * 12) * shiftMultiplier * endOfShiftDip * randomVariation
  );
  
  const quality = Math.min(100,
    (96 + Math.random() * 4) * randomVariation
  );
  
  const oee = (availability * performance * quality) / 10000;
  
  // Production calculations
  const theoreticalOutput = getTheoreticalOutput(workUnit.equipmentType);
  const actualRunTime = (60 * availability) / 100;
  const actualOutput = Math.floor((theoreticalOutput * actualRunTime * performance) / 6000);
  const goodProducts = Math.floor((actualOutput * quality) / 100);
  const defects = actualOutput - goodProducts;
  
  return {
    oee: Number(oee.toFixed(1)),
    availability: Number(availability.toFixed(1)),
    performance: Number(performance.toFixed(1)),
    quality: Number(quality.toFixed(1)),
    theoreticalOutput,
    actualOutput,
    goodProducts,
    defects,
    actualRunTime
  };
}

function getTheoreticalOutput(equipmentType: string): number {
  const outputs: Record<string, number> = {
    'CNC': 60,
    'Robot': 120,
    'Conveyor': 200,
    'Assembly': 80,
    'Welding': 40,
    'Packaging': 150,
    'Inspection': 100
  };
  return outputs[equipmentType] || 100;
}

function getFailureDescription(equipmentType: string): string {
  const descriptions: Record<string, string[]> = {
    'CNC': ['Tool wear', 'Spindle malfunction', 'Coolant system failure', 'Controller error'],
    'Robot': ['Servo motor failure', 'Sensor malfunction', 'Programming error', 'Gripper failure'],
    'Conveyor': ['Belt tear', 'Motor overload', 'Sensor failure', 'Roller bearing failure']
  };
  const options = descriptions[equipmentType] || ['General equipment failure'];
  return options[Math.floor(Math.random() * options.length)];
}

async function updateKPISummaries() {
  // Get all work units with recent metrics
  const workUnits = await prisma.workUnit.findMany({
    include: {
      performanceMetrics: {
        where: {
          timestamp: {
            gte: subDays(new Date(), 7) // Last 7 days for summary
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      },
      metrics: {
        where: {
          name: { in: ['MTBF', 'MTTR'] }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 2
      }
    }
  });
  
  // Update work unit KPIs
  for (const workUnit of workUnits) {
    if (workUnit.performanceMetrics.length > 0) {
      const avgOEE = workUnit.performanceMetrics.reduce((sum, m) => sum + m.oee, 0) / workUnit.performanceMetrics.length;
      const avgAvailability = workUnit.performanceMetrics.reduce((sum, m) => sum + m.availability, 0) / workUnit.performanceMetrics.length;
      const avgPerformance = workUnit.performanceMetrics.reduce((sum, m) => sum + m.performance, 0) / workUnit.performanceMetrics.length;
      const avgQuality = workUnit.performanceMetrics.reduce((sum, m) => sum + m.quality, 0) / workUnit.performanceMetrics.length;
      const totalProduction = workUnit.performanceMetrics.reduce((sum, m) => sum + m.production, 0);
      
      const mtbfMetric = workUnit.metrics.find(m => m.name === 'MTBF');
      const mttrMetric = workUnit.metrics.find(m => m.name === 'MTTR');
      
      await prisma.kPISummary.upsert({
        where: { workUnitId: workUnit.id },
        create: {
          workUnitId: workUnit.id,
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: Math.floor(totalProduction * (100 - avgQuality) / 100),
          mtbf: mtbfMetric?.value || 720,
          mttr: mttrMetric?.value || 2,
          productionData: {
            lastHour: workUnit.performanceMetrics[0]?.production || 0,
            lastShift: workUnit.performanceMetrics.slice(0, 8).reduce((sum, m) => sum + m.production, 0),
            lastDay: workUnit.performanceMetrics.slice(0, 24).reduce((sum, m) => sum + m.production, 0)
          }
        },
        update: {
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction: BigInt(totalProduction),
          totalDefects: Math.floor(totalProduction * (100 - avgQuality) / 100),
          mtbf: mtbfMetric?.value || 720,
          mttr: mttrMetric?.value || 2,
          productionData: {
            lastHour: workUnit.performanceMetrics[0]?.production || 0,
            lastShift: workUnit.performanceMetrics.slice(0, 8).reduce((sum, m) => sum + m.production, 0),
            lastDay: workUnit.performanceMetrics.slice(0, 24).reduce((sum, m) => sum + m.production, 0)
          }
        }
      });
    }
  }
  
  // Update hierarchy KPIs (work center -> area -> site -> enterprise)
  await updateHierarchyKPIs();
  
  console.log('✅ KPI summaries updated successfully!');
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
          totalDefects: units.reduce((s, u) => s + (u.kpiSummary?.totalDefects || 0), 0)
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
          totalDefects: centers.reduce((s, c) => s + (c.kpiSummary?.totalDefects || 0), 0)
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
          totalDefects: areas.reduce((s, a) => s + (a.kpiSummary?.totalDefects || 0), 0)
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
          totalDefects: sites.reduce((s, site) => s + (site.kpiSummary?.totalDefects || 0), 0)
        }
      });
    }
  }
}

// Execute the seeding
seedComprehensiveMetrics()
  .catch(console.error)
  .finally(() => process.exit());
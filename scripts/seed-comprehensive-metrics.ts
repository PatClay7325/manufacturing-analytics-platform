import { PrismaClient } from '@prisma/client';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

// ISO 22400 KPI Definitions
const ISO_22400_KPIS = {
  // Effectiveness KPIs
  OEE: 'Overall Equipment Effectiveness',
  OOE: 'Overall Operations Effectiveness', 
  NEE: 'Net Equipment Effectiveness',
  
  // Availability KPIs
  A: 'Availability',
  AE: 'Allocation Efficiency',
  SE: 'Setup Efficiency',
  TE: 'Technical Efficiency',
  
  // Performance KPIs
  PR: 'Performance Rate',
  NPR: 'Net Performance Rate',
  PE: 'Performance Efficiency',
  PEI: 'Performance Efficiency Index',
  
  // Quality KPIs
  QR: 'Quality Rate',
  FTT: 'First Time Through',
  FPY: 'First Pass Yield',
  SY: 'Scrap Ratio',
  RW: 'Rework Ratio',
  FR: 'Fall Off Ratio',
  
  // Productivity KPIs
  PRI: 'Production Process Ratio',
  WPR: 'Worker Productivity',
  AE_PROD: 'Allocation Efficiency (Production)',
  UE: 'Utilization Efficiency',
  OPI: 'Overall Productivity Index',
  
  // Capacity & Utilization
  CI: 'Capacity Utilization',
  CP: 'Comprehensive Process Index'
};

// ISO 9001 Quality Metrics
const ISO_9001_METRICS = {
  // Process Performance
  processConformance: 'Process Conformance Rate',
  nonConformities: 'Non-Conformities per Unit',
  correctiveActions: 'Corrective Actions Effectiveness',
  preventiveActions: 'Preventive Actions Implemented',
  
  // Customer Satisfaction
  customerComplaints: 'Customer Complaints',
  customerSatisfaction: 'Customer Satisfaction Score',
  onTimeDelivery: 'On-Time Delivery Rate',
  
  // Continual Improvement
  improvementProjects: 'Improvement Projects Completed',
  costOfQuality: 'Cost of Quality',
  auditFindings: 'Internal Audit Findings'
};

// Reliability Metrics
const RELIABILITY_METRICS = {
  MTBF: 'Mean Time Between Failures',
  MTTR: 'Mean Time To Repair',
  MTTF: 'Mean Time To Failure',
  MDT: 'Mean Down Time',
  availability: 'Equipment Availability',
  reliability: 'Equipment Reliability',
  maintainability: 'Maintainability Index'
};

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
    
    // Generate daily metrics for each work unit
    for (const workUnit of workUnits) {
      console.log(`\n📊 Generating metrics for ${workUnit.name} (${workUnit.code})`);
      
      let currentDate = startDate;
      const metricsToCreate = [];
      const performanceMetricsToCreate = [];
      const qualityMetricsToCreate = [];
      const maintenanceRecordsToCreate = [];
      
      // Equipment-specific parameters
      const baseOEE = getBaseOEE(workUnit.equipmentType);
      const failureRate = getFailureRate(workUnit.equipmentType);
      
      let lastFailureDate = startDate;
      let totalFailures = 0;
      let totalDowntime = 0;
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const hour = currentDate.getHours();
        
        // Shift patterns (3 shifts: 6-14, 14-22, 22-6)
        const shift = hour >= 6 && hour < 14 ? 1 : hour >= 14 && hour < 22 ? 2 : 3;
        const isProductionHour = !isWeekend || shift === 1; // Weekend only shift 1
        
        if (isProductionHour) {
          // Generate hourly production metrics
          const hourlyMetrics = generateHourlyMetrics(
            workUnit,
            currentDate,
            baseOEE,
            shift,
            isWeekend
          );
          
          // ISO 22400 KPIs
          metricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            category: 'ISO22400',
            parameter: 'OEE',
            value: hourlyMetrics.oee,
            unit: '%',
            quality: 'good',
            metadata: {
              shift,
              isWeekend,
              components: {
                availability: hourlyMetrics.availability,
                performance: hourlyMetrics.performance,
                quality: hourlyMetrics.quality
              }
            }
          });
          
          // Availability metrics
          metricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            category: 'ISO22400',
            parameter: 'Availability',
            value: hourlyMetrics.availability,
            unit: '%',
            quality: 'good',
            metadata: { shift, plannedTime: 60, actualTime: hourlyMetrics.actualRunTime }
          });
          
          // Performance metrics
          metricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            category: 'ISO22400',
            parameter: 'PerformanceRate',
            value: hourlyMetrics.performance,
            unit: '%',
            quality: 'good',
            metadata: { 
              shift,
              theoreticalOutput: hourlyMetrics.theoreticalOutput,
              actualOutput: hourlyMetrics.actualOutput
            }
          });
          
          // Quality metrics
          metricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            category: 'ISO22400',
            parameter: 'QualityRate',
            value: hourlyMetrics.quality,
            unit: '%',
            quality: 'good',
            metadata: {
              shift,
              totalProduced: hourlyMetrics.actualOutput,
              goodProducts: hourlyMetrics.goodProducts,
              defects: hourlyMetrics.defects
            }
          });
          
          // Additional ISO 22400 KPIs
          const setupEfficiency = 95 + Math.random() * 5;
          metricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            category: 'ISO22400',
            parameter: 'SetupEfficiency',
            value: setupEfficiency,
            unit: '%',
            quality: 'good'
          });
          
          const utilizationEfficiency = hourlyMetrics.availability * 0.95;
          metricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            category: 'ISO22400',
            parameter: 'UtilizationEfficiency',
            value: utilizationEfficiency,
            unit: '%',
            quality: 'good'
          });
          
          // ISO 9001 Quality Metrics
          if (Math.random() < 0.1) { // 10% chance of quality event
            const nonConformities = Math.floor(Math.random() * 5) + 1;
            qualityMetricsToCreate.push({
              workUnitId: workUnit.id,
              productId: `PROD-${workUnit.code}-${currentDate.getTime()}`,
              parameter: 'NonConformities',
              value: nonConformities,
              targetValue: 0,
              unit: 'count',
              isWithinSpec: false,
              timestamp: currentDate,
              metadata: {
                iso9001Category: 'ProcessControl',
                severity: nonConformities > 3 ? 'high' : 'medium'
              }
            });
          }
          
          // Performance metrics
          performanceMetricsToCreate.push({
            workUnitId: workUnit.id,
            timestamp: currentDate,
            production: hourlyMetrics.actualOutput,
            availability: hourlyMetrics.availability,
            performance: hourlyMetrics.performance,
            quality: hourlyMetrics.quality,
            oee: hourlyMetrics.oee,
            metadata: {
              shift,
              iso22400Compliant: true,
              productionOrder: `PO-${currentDate.getTime()}`
            }
          });
          
          // Reliability metrics - check for failures
          const timeSinceLastFailure = (currentDate.getTime() - lastFailureDate.getTime()) / (1000 * 60 * 60);
          if (Math.random() < failureRate && timeSinceLastFailure > 24) {
            totalFailures++;
            const downtime = Math.floor(Math.random() * 4 + 1); // 1-4 hours
            totalDowntime += downtime;
            lastFailureDate = currentDate;
            
            maintenanceRecordsToCreate.push({
              workUnitId: workUnit.id,
              maintenanceType: 'corrective',
              startTime: currentDate,
              endTime: addDays(currentDate, downtime / 24),
              technician: `TECH-${Math.floor(Math.random() * 10) + 1}`,
              description: `Corrective maintenance - ${getFailureDescription(workUnit.equipmentType)}`,
              status: 'completed',
              spareParts: getRandomSpareParts(workUnit.equipmentType),
              laborHours: downtime,
              metadata: {
                failureMode: getFailureMode(workUnit.equipmentType),
                rootCause: getRootCause(),
                iso9001Compliant: true
              }
            });
            
            // MTTR metric
            metricsToCreate.push({
              workUnitId: workUnit.id,
              timestamp: currentDate,
              category: 'Reliability',
              parameter: 'MTTR',
              value: downtime,
              unit: 'hours',
              quality: 'good'
            });
          }
        }
        
        // Move to next hour
        currentDate = addDays(currentDate, 1/24);
      }
      
      // Calculate and store reliability metrics
      const totalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const mtbf = totalFailures > 0 ? (totalHours - totalDowntime) / totalFailures : totalHours;
      const availability = ((totalHours - totalDowntime) / totalHours) * 100;
      
      metricsToCreate.push({
        workUnitId: workUnit.id,
        timestamp: endDate,
        category: 'Reliability',
        parameter: 'MTBF',
        value: mtbf,
        unit: 'hours',
        quality: 'good',
        metadata: {
          calculationPeriod: '90days',
          totalFailures,
          totalDowntime
        }
      });
      
      metricsToCreate.push({
        workUnitId: workUnit.id,
        timestamp: endDate,
        category: 'Reliability',
        parameter: 'Availability',
        value: availability,
        unit: '%',
        quality: 'good'
      });
      
      // Batch create all metrics
      console.log(`Creating ${metricsToCreate.length} metrics...`);
      await prisma.metric.createMany({ data: metricsToCreate });
      
      console.log(`Creating ${performanceMetricsToCreate.length} performance metrics...`);
      await prisma.performanceMetric.createMany({ data: performanceMetricsToCreate });
      
      if (qualityMetricsToCreate.length > 0) {
        console.log(`Creating ${qualityMetricsToCreate.length} quality metrics...`);
        await prisma.qualityMetric.createMany({ data: qualityMetricsToCreate });
      }
      
      if (maintenanceRecordsToCreate.length > 0) {
        console.log(`Creating ${maintenanceRecordsToCreate.length} maintenance records...`);
        await prisma.maintenanceRecord.createMany({ data: maintenanceRecordsToCreate });
      }
    }
    
    // Update KPI summaries at all levels
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
  const baseValues = {
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
  const rates = {
    'CNC': 0.02,
    'Robot': 0.015,
    'Conveyor': 0.01,
    'Assembly': 0.025,
    'Welding': 0.02,
    'Packaging': 0.01,
    'Inspection': 0.005
  };
  return rates[equipmentType] || 0.02;
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
    oee,
    availability,
    performance,
    quality,
    theoreticalOutput,
    actualOutput,
    goodProducts,
    defects,
    actualRunTime
  };
}

function getTheoreticalOutput(equipmentType: string): number {
  const outputs = {
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
  const descriptions = {
    'CNC': ['Tool wear', 'Spindle malfunction', 'Coolant system failure', 'Controller error'],
    'Robot': ['Servo motor failure', 'Sensor malfunction', 'Programming error', 'Gripper failure'],
    'Conveyor': ['Belt tear', 'Motor overload', 'Sensor failure', 'Roller bearing failure'],
    'Assembly': ['Pneumatic system failure', 'Fixture misalignment', 'Sensor error', 'Component jam'],
    'Welding': ['Torch failure', 'Wire feed issue', 'Gas supply problem', 'Power supply fault'],
    'Packaging': ['Sealing bar failure', 'Film tension issue', 'Sensor malfunction', 'Conveyor jam'],
    'Inspection': ['Camera failure', 'Lighting issue', 'Software error', 'Calibration drift']
  };
  const options = descriptions[equipmentType] || ['General equipment failure'];
  return options[Math.floor(Math.random() * options.length)];
}

function getFailureMode(equipmentType: string): string {
  const modes = ['Mechanical', 'Electrical', 'Software', 'Pneumatic', 'Hydraulic', 'Sensor'];
  return modes[Math.floor(Math.random() * modes.length)];
}

function getRootCause(): string {
  const causes = [
    'Normal wear and tear',
    'Inadequate maintenance',
    'Operating outside specifications',
    'Component fatigue',
    'Environmental factors',
    'Human error'
  ];
  return causes[Math.floor(Math.random() * causes.length)];
}

function getRandomSpareParts(equipmentType: string): any {
  const parts = {
    'CNC': ['Cutting tool', 'Spindle bearing', 'Coolant pump', 'Drive belt'],
    'Robot': ['Servo motor', 'Controller board', 'Sensor', 'Cable harness'],
    'Conveyor': ['Belt section', 'Motor', 'Roller', 'Bearing'],
    'Assembly': ['Pneumatic valve', 'Cylinder', 'Sensor', 'Fitting'],
    'Welding': ['Contact tip', 'Gas nozzle', 'Wire liner', 'Torch cable'],
    'Packaging': ['Heating element', 'Sealing wire', 'Sensor', 'Drive belt'],
    'Inspection': ['LED light', 'Camera lens', 'Cable', 'Mounting bracket']
  };
  
  const availableParts = parts[equipmentType] || ['Generic spare part'];
  const numParts = Math.floor(Math.random() * 3) + 1;
  const selectedParts = [];
  
  for (let i = 0; i < numParts; i++) {
    selectedParts.push({
      name: availableParts[Math.floor(Math.random() * availableParts.length)],
      quantity: Math.floor(Math.random() * 3) + 1,
      cost: Math.floor(Math.random() * 500) + 50
    });
  }
  
  return selectedParts;
}

async function updateKPISummaries() {
  console.log('\n📈 Updating KPI summaries at all hierarchy levels...');
  
  // Get all work units with their metrics
  const workUnits = await prisma.workUnit.findMany({
    include: {
      performanceMetrics: {
        where: {
          timestamp: {
            gte: subDays(new Date(), 30)
          }
        }
      },
      qualityMetrics: {
        where: {
          timestamp: {
            gte: subDays(new Date(), 30)
          }
        }
      },
      metrics: {
        where: {
          category: 'Reliability',
          timestamp: {
            gte: subDays(new Date(), 30)
          }
        }
      }
    }
  });
  
  // Update work unit KPIs
  for (const workUnit of workUnits) {
    const avgOEE = workUnit.performanceMetrics.reduce((sum, m) => sum + m.oee, 0) / workUnit.performanceMetrics.length || 0;
    const avgAvailability = workUnit.performanceMetrics.reduce((sum, m) => sum + m.availability, 0) / workUnit.performanceMetrics.length || 0;
    const avgPerformance = workUnit.performanceMetrics.reduce((sum, m) => sum + m.performance, 0) / workUnit.performanceMetrics.length || 0;
    const avgQuality = workUnit.performanceMetrics.reduce((sum, m) => sum + m.quality, 0) / workUnit.performanceMetrics.length || 0;
    const totalProduction = workUnit.performanceMetrics.reduce((sum, m) => sum + m.production, 0);
    const totalDefects = workUnit.qualityMetrics.filter(m => !m.isWithinSpec).length;
    
    const mtbfMetric = workUnit.metrics.find(m => m.parameter === 'MTBF');
    const mttrMetric = workUnit.metrics.find(m => m.parameter === 'MTTR');
    
    await prisma.kPISummary.upsert({
      where: { workUnitId: workUnit.id },
      create: {
        workUnitId: workUnit.id,
        oee: Number(avgOEE.toFixed(1)),
        availability: Number(avgAvailability.toFixed(1)),
        performance: Number(avgPerformance.toFixed(1)),
        quality: Number(avgQuality.toFixed(1)),
        totalProduction,
        totalDefects,
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
        totalProduction,
        totalDefects,
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
  
  for (const workCenter of workCenters) {
    const units = workCenter.workUnits.filter(u => u.kpiSummary);
    if (units.length > 0) {
      const avgOEE = units.reduce((sum, u) => sum + (u.kpiSummary?.oee || 0), 0) / units.length;
      const avgAvailability = units.reduce((sum, u) => sum + (u.kpiSummary?.availability || 0), 0) / units.length;
      const avgPerformance = units.reduce((sum, u) => sum + (u.kpiSummary?.performance || 0), 0) / units.length;
      const avgQuality = units.reduce((sum, u) => sum + (u.kpiSummary?.quality || 0), 0) / units.length;
      const totalProduction = units.reduce((sum, u) => sum + (u.kpiSummary?.totalProduction || 0), 0);
      const totalDefects = units.reduce((sum, u) => sum + (u.kpiSummary?.totalDefects || 0), 0);
      
      await prisma.kPISummary.upsert({
        where: { workCenterId: workCenter.id },
        create: {
          workCenterId: workCenter.id,
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
        },
        update: {
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
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
      const avgOEE = centers.reduce((sum, c) => sum + (c.kpiSummary?.oee || 0), 0) / centers.length;
      const avgAvailability = centers.reduce((sum, c) => sum + (c.kpiSummary?.availability || 0), 0) / centers.length;
      const avgPerformance = centers.reduce((sum, c) => sum + (c.kpiSummary?.performance || 0), 0) / centers.length;
      const avgQuality = centers.reduce((sum, c) => sum + (c.kpiSummary?.quality || 0), 0) / centers.length;
      const totalProduction = centers.reduce((sum, c) => sum + (c.kpiSummary?.totalProduction || 0), 0);
      const totalDefects = centers.reduce((sum, c) => sum + (c.kpiSummary?.totalDefects || 0), 0);
      
      await prisma.kPISummary.upsert({
        where: { areaId: area.id },
        create: {
          areaId: area.id,
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
        },
        update: {
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
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
      const avgOEE = areas.reduce((sum, a) => sum + (a.kpiSummary?.oee || 0), 0) / areas.length;
      const avgAvailability = areas.reduce((sum, a) => sum + (a.kpiSummary?.availability || 0), 0) / areas.length;
      const avgPerformance = areas.reduce((sum, a) => sum + (a.kpiSummary?.performance || 0), 0) / areas.length;
      const avgQuality = areas.reduce((sum, a) => sum + (a.kpiSummary?.quality || 0), 0) / areas.length;
      const totalProduction = areas.reduce((sum, a) => sum + (a.kpiSummary?.totalProduction || 0), 0);
      const totalDefects = areas.reduce((sum, a) => sum + (a.kpiSummary?.totalDefects || 0), 0);
      
      await prisma.kPISummary.upsert({
        where: { siteId: site.id },
        create: {
          siteId: site.id,
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
        },
        update: {
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
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
      const avgOEE = sites.reduce((sum, s) => sum + (s.kpiSummary?.oee || 0), 0) / sites.length;
      const avgAvailability = sites.reduce((sum, s) => sum + (s.kpiSummary?.availability || 0), 0) / sites.length;
      const avgPerformance = sites.reduce((sum, s) => sum + (s.kpiSummary?.performance || 0), 0) / sites.length;
      const avgQuality = sites.reduce((sum, s) => sum + (s.kpiSummary?.quality || 0), 0) / sites.length;
      const totalProduction = sites.reduce((sum, s) => sum + (s.kpiSummary?.totalProduction || 0), 0);
      const totalDefects = sites.reduce((sum, s) => sum + (s.kpiSummary?.totalDefects || 0), 0);
      
      await prisma.kPISummary.upsert({
        where: { enterpriseId: enterprise.id },
        create: {
          enterpriseId: enterprise.id,
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
        },
        update: {
          oee: Number(avgOEE.toFixed(1)),
          availability: Number(avgAvailability.toFixed(1)),
          performance: Number(avgPerformance.toFixed(1)),
          quality: Number(avgQuality.toFixed(1)),
          totalProduction,
          totalDefects
        }
      });
    }
  }
  
  console.log('✅ KPI summaries updated successfully!');
}

// Execute the seeding
seedComprehensiveMetrics()
  .catch(console.error)
  .finally(() => process.exit());
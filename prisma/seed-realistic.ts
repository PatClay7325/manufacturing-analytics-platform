import { PrismaClient } from '@prisma/client';
import { addDays, addHours, addMinutes, subDays } from 'date-fns';

const prisma = new PrismaClient();

// Realistic manufacturing parameters
const REALISTIC_PARAMS = {
  // OEE typically ranges from 40-85% in real manufacturing
  oee: { min: 0.40, max: 0.85, worldClass: 0.85 },
  
  // Availability: 70-95% (downtime is common)
  availability: { min: 0.70, max: 0.95 },
  
  // Performance: 50-95% (speed losses are common)  
  performance: { min: 0.50, max: 0.95 },
  
  // Quality: 85-99.5% (defects happen)
  quality: { min: 0.85, max: 0.995 },
  
  // Equipment failure rates (MTBF in hours)
  mtbf: {
    cnc: { min: 100, max: 500 },
    welder: { min: 80, max: 400 },
    assembly: { min: 150, max: 600 }
  },
  
  // Repair times (MTTR in minutes)
  mttr: {
    minor: { min: 5, max: 30 },
    major: { min: 60, max: 240 },
    critical: { min: 240, max: 720 }
  }
};

// Realistic shift patterns
const SHIFTS = [
  { name: 'Morning', start: 6, duration: 8 },
  { name: 'Afternoon', start: 14, duration: 8 },
  { name: 'Night', start: 22, duration: 8 }
];

// Common failure modes
const FAILURE_MODES = [
  { type: 'mechanical_failure', severity: 'major', probability: 0.02 },
  { type: 'electrical_fault', severity: 'critical', probability: 0.01 },
  { type: 'operator_error', severity: 'minor', probability: 0.05 },
  { type: 'material_shortage', severity: 'minor', probability: 0.08 },
  { type: 'quality_reject', severity: 'minor', probability: 0.10 },
  { type: 'planned_maintenance', severity: 'planned', probability: 0.04 },
  { type: 'changeover', severity: 'planned', probability: 0.15 }
];

// Realistic metric noise
function addNoise(value: number, noiseLevel: number = 0.05): number {
  const noise = (Math.random() - 0.5) * 2 * noiseLevel;
  return Math.max(0, Math.min(1, value + noise));
}

// Simulate equipment degradation over time
function getEquipmentHealth(daysSinceLastMaintenance: number): number {
  // Health degrades logarithmically
  const degradationRate = 0.002;
  const health = Math.exp(-degradationRate * daysSinceLastMaintenance);
  return Math.max(0.5, health); // Never below 50% health
}

// Generate realistic OEE with patterns
function generateRealisticOEE(
  hour: number,
  dayOfWeek: number,
  equipmentHealth: number,
  isFailure: boolean
): { availability: number; performance: number; quality: number; oee: number } {
  let availability = 0.85;
  let performance = 0.80;
  let quality = 0.95;
  
  // Shift changes cause temporary drops
  if (hour === 6 || hour === 14 || hour === 22) {
    availability *= 0.7; // 30% drop during shift change
    performance *= 0.8;
  }
  
  // Start of shift ramp-up
  if (hour === 7 || hour === 15 || hour === 23) {
    performance *= 0.9;
  }
  
  // End of shift slowdown
  if (hour === 13 || hour === 21 || hour === 5) {
    performance *= 0.85;
  }
  
  // Weekend effect (if applicable)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    availability *= 0.9; // Less maintenance coverage
    quality *= 0.97; // Less experienced operators
  }
  
  // Monday morning syndrome
  if (dayOfWeek === 1 && hour < 10) {
    quality *= 0.95;
    performance *= 0.9;
  }
  
  // Equipment health impact
  availability *= equipmentHealth;
  performance *= equipmentHealth;
  quality *= Math.pow(equipmentHealth, 0.5); // Quality degrades slower
  
  // Failure scenarios
  if (isFailure) {
    availability *= 0.3; // Major availability hit
    performance *= 0.5;
    quality *= 0.7;
  }
  
  // Add realistic noise
  availability = addNoise(availability, 0.05);
  performance = addNoise(performance, 0.08);
  quality = addNoise(quality, 0.02);
  
  // Ensure bounds
  availability = Math.max(0.3, Math.min(0.98, availability));
  performance = Math.max(0.4, Math.min(0.95, performance));
  quality = Math.max(0.8, Math.min(0.998, quality));
  
  const oee = availability * performance * quality;
  
  return {
    availability: Math.round(availability * 10000) / 100,
    performance: Math.round(performance * 10000) / 100,
    quality: Math.round(quality * 10000) / 100,
    oee: Math.round(oee * 10000) / 100
  };
}

// Generate realistic sensor data with patterns
function generateSensorData(
  type: string,
  hour: number,
  equipmentHealth: number,
  isRunning: boolean
): { value: number; unit: string } {
  const configs: Record<string, any> = {
    temperature: {
      base: 65,
      running: 85,
      variance: 5,
      unit: '°C',
      healthImpact: 1.2
    },
    pressure: {
      base: 0,
      running: 150,
      variance: 10,
      unit: 'PSI',
      healthImpact: 1.1
    },
    vibration: {
      base: 0.5,
      running: 2.5,
      variance: 0.5,
      unit: 'mm/s',
      healthImpact: 1.5
    },
    speed: {
      base: 0,
      running: 1200,
      variance: 50,
      unit: 'RPM',
      healthImpact: 0.9
    },
    power: {
      base: 5,
      running: 45,
      variance: 5,
      unit: 'kW',
      healthImpact: 1.1
    }
  };
  
  const config = configs[type] || configs.temperature;
  let value = isRunning ? config.running : config.base;
  
  // Equipment health affects readings
  if (isRunning) {
    const healthFactor = 2 - equipmentHealth; // 1.0 to 2.0
    value += (healthFactor - 1) * config.variance * config.healthImpact;
  }
  
  // Time of day patterns
  if (type === 'temperature' && isRunning) {
    // Temperature builds up during the day
    value += Math.sin((hour - 6) * Math.PI / 12) * 5;
  }
  
  // Add noise
  value += (Math.random() - 0.5) * config.variance;
  
  return {
    value: Math.round(value * 100) / 100,
    unit: config.unit
  };
}

async function seed() {
  console.log('🌱 Starting realistic data seed...');
  
  try {
    // Clean existing data
    await prisma.$transaction([
      prisma.metric.deleteMany(),
      prisma.oEEData.deleteMany(),
      prisma.alert.deleteMany(),
      prisma.equipment.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
      prisma.site.deleteMany()
    ]);
    
    console.log('✅ Cleaned existing data');
    
    // Create sites
    const sites = await Promise.all([
      prisma.site.create({
        data: {
          code: 'DETROIT',
          name: 'Detroit Manufacturing Plant',
          timezone: 'America/Detroit'
        }
      }),
      prisma.site.create({
        data: {
          code: 'CHICAGO',
          name: 'Chicago Assembly Facility',
          timezone: 'America/Chicago'
        }
      })
    ]);
    
    console.log('✅ Created sites');
    
    // Create equipment with realistic specs
    const equipment = await Promise.all([
      prisma.equipment.create({
        data: {
          code: 'CNC-001',
          name: 'Haas VF-2 CNC Mill',
          type: 'CNC',
          siteId: sites[0].id
        }
      }),
      prisma.equipment.create({
        data: {
          code: 'WELD-001',
          name: 'ABB IRB 6700 Welding Robot',
          type: 'WELDER',
          siteId: sites[0].id
        }
      }),
      prisma.equipment.create({
        data: {
          code: 'ASSY-001',
          name: 'Assembly Line 1',
          type: 'ASSEMBLY',
          siteId: sites[1].id
        }
      })
    ]);
    
    console.log('✅ Created equipment');
    
    // Create users
    await prisma.user.create({
      data: {
        email: 'admin@manufacturing.com',
        name: 'Admin User',
        role: 'admin',
        siteId: sites[0].id
      }
    });
    
    // Generate historical data (30 days)
    const now = new Date();
    const startDate = subDays(now, 30);
    
    console.log('⏳ Generating 30 days of realistic data...');
    
    for (const eq of equipment) {
      let lastMaintenanceDate = startDate;
      let consecutiveFailures = 0;
      
      // Generate data for each day
      for (let day = 0; day < 30; day++) {
        const currentDate = addDays(startDate, day);
        const dayOfWeek = currentDate.getDay();
        const daysSinceLastMaintenance = day - Math.floor((lastMaintenanceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const equipmentHealth = getEquipmentHealth(daysSinceLastMaintenance);
        
        // Generate hourly data
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = addHours(currentDate, hour);
          
          // Determine if equipment is running (consider shifts)
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isRunning = !isWeekend || Math.random() > 0.7; // 30% chance of weekend work
          
          // Determine if failure occurs
          let isFailure = false;
          if (isRunning && Math.random() < 0.02 * (2 - equipmentHealth)) {
            isFailure = true;
            consecutiveFailures++;
          }
          
          // Generate OEE data
          const oeeData = generateRealisticOEE(hour, dayOfWeek, equipmentHealth, isFailure);
          
          // Calculate realistic production values
          const shiftHours = 8;
          const plannedCycleTime = eq.type === 'CNC' ? 180 : eq.type === 'WELDER' ? 120 : 60; // seconds
          const plannedQuantity = Math.floor((shiftHours * 3600) / plannedCycleTime);
          const actualQuantity = Math.floor(plannedQuantity * oeeData.performance / 100);
          const goodQuantity = Math.floor(actualQuantity * oeeData.quality / 100);
          
          await prisma.oEEData.create({
            data: {
              timestamp,
              equipmentId: eq.id,
              shiftStartTime: timestamp,
              shiftEndTime: addHours(timestamp, 1),
              availability: oeeData.availability,
              performance: oeeData.performance,
              quality: oeeData.quality,
              oee: oeeData.oee,
              plannedTime: 60, // minutes
              runTime: Math.floor(60 * oeeData.availability / 100),
              idealCycleTime: plannedCycleTime,
              totalCount: actualQuantity,
              goodCount: goodQuantity
            }
          });
          
          // Generate sensor metrics (every 5 minutes when running)
          if (isRunning) {
            for (let minute = 0; minute < 60; minute += 5) {
              const metricTime = addMinutes(timestamp, minute);
              
              // Generate multiple sensor readings
              const sensorTypes = ['temperature', 'pressure', 'vibration', 'speed', 'power'];
              
              for (const sensorType of sensorTypes) {
                const sensorData = generateSensorData(
                  sensorType,
                  hour,
                  equipmentHealth,
                  isRunning && !isFailure
                );
                
                await prisma.metric.create({
                  data: {
                    timestamp: metricTime,
                    equipmentId: eq.id,
                    metricType: sensorType,
                    value: sensorData.value,
                    unit: sensorData.unit,
                    quality: isFailure ? 0 : 192 // Bad quality during failures
                  }
                });
              }
            }
          }
          
          // Generate alerts
          if (isFailure) {
            await prisma.alert.create({
              data: {
                timestamp,
                equipmentId: eq.id,
                severity: consecutiveFailures > 2 ? 'critical' : 'high',
                type: 'equipment_failure',
                message: `Equipment failure detected: ${eq.name}. OEE dropped to ${oeeData.oee}%`
              }
            });
          }
          
          // Generate OEE alerts
          if (oeeData.oee < 60 && !isFailure) {
            await prisma.alert.create({
              data: {
                timestamp,
                equipmentId: eq.id,
                severity: oeeData.oee < 50 ? 'high' : 'medium',
                type: 'oee_low',
                message: `Low OEE detected: ${oeeData.oee}% on ${eq.name}`
              }
            });
          }
          
          // Maintenance events
          if (daysSinceLastMaintenance > 7 && hour === 6 && Math.random() > 0.8) {
            await prisma.alert.create({
              data: {
                timestamp,
                equipmentId: eq.id,
                severity: 'medium',
                type: 'maintenance_due',
                message: `Scheduled maintenance due for ${eq.name}`,
                acknowledged: true,
                acknowledgedAt: timestamp,
                acknowledgedBy: 'system'
              }
            });
            
            lastMaintenanceDate = currentDate;
            consecutiveFailures = 0;
          }
        }
        
        // Daily summary
        if (day % 5 === 0) {
          console.log(`  📊 Generated day ${day + 1}/30 for ${eq.name}`);
        }
      }
    }
    
    console.log('✅ Seeding completed successfully!');
    
    // Print summary
    const metrics = await prisma.metric.count();
    const oeeRecords = await prisma.oEEData.count();
    const alerts = await prisma.alert.count();
    
    console.log('\n📈 Data Summary:');
    console.log(`  - Sites: ${sites.length}`);
    console.log(`  - Equipment: ${equipment.length}`);
    console.log(`  - Metrics: ${metrics.toLocaleString()}`);
    console.log(`  - OEE Records: ${oeeRecords.toLocaleString()}`);
    console.log(`  - Alerts: ${alerts}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
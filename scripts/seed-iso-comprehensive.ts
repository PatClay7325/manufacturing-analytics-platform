import { PrismaClient } from '@prisma/client';
import { addDays, subDays, startOfDay, endOfDay, addHours, subHours } from 'date-fns';

const prisma = new PrismaClient();

// ISO 22400-2:2014 Manufacturing Operations Management KPIs
const ISO_22400_KPIS = {
  // Availability KPIs
  AVAILABILITY: 'A', // Availability
  ALLOCATION_EFFICIENCY: 'AE', // Allocation Efficiency
  SETUP_EFFICIENCY: 'SE', // Setup Efficiency
  TECHNICAL_EFFICIENCY: 'TE', // Technical Efficiency
  
  // Performance KPIs
  PERFORMANCE_RATE: 'PR', // Performance Rate
  NET_PERFORMANCE_RATE: 'NPR', // Net Performance Rate
  PERFORMANCE_EFFICIENCY: 'PE', // Performance Efficiency
  
  // Quality KPIs
  QUALITY_RATE: 'QR', // Quality Rate
  FIRST_TIME_THROUGH: 'FTT', // First Time Through
  FIRST_PASS_YIELD: 'FPY', // First Pass Yield
  SCRAP_RATIO: 'SY', // Scrap Ratio
  REWORK_RATIO: 'RW', // Rework Ratio
  
  // Effectiveness KPIs
  OEE: 'OEE', // Overall Equipment Effectiveness
  OOE: 'OOE', // Overall Operations Effectiveness
  NEE: 'NEE', // Net Equipment Effectiveness
  TEEP: 'TEEP', // Total Effective Equipment Performance
  
  // Productivity KPIs
  PRODUCTION_PROCESS_RATIO: 'PRI', // Production Process Ratio
  WORKER_PRODUCTIVITY: 'WPR', // Worker Productivity
  UTILIZATION_EFFICIENCY: 'UE', // Utilization Efficiency
  
  // Capacity KPIs
  CAPACITY_UTILIZATION: 'CI', // Capacity Utilization
  COMPREHENSIVE_PROCESS_INDEX: 'CP' // Comprehensive Process Index
};

// ISO 9001:2015 Quality Management System Requirements
const ISO_9001_QUALITY_METRICS = {
  CUSTOMER_SATISFACTION: 'Customer Satisfaction Score',
  NON_CONFORMITY_RATE: 'Non-Conformity Rate per 1000 units',
  CORRECTIVE_ACTION_EFFECTIVENESS: 'Corrective Action Effectiveness %',
  PREVENTIVE_ACTION_TIMELINESS: 'Preventive Action Timeliness',
  PROCESS_CAPABILITY: 'Process Capability Index (Cpk)',
  DOCUMENT_CONTROL_COMPLIANCE: 'Document Control Compliance %',
  TRAINING_EFFECTIVENESS: 'Training Effectiveness Score',
  SUPPLIER_QUALITY_RATING: 'Supplier Quality Rating',
  MANAGEMENT_REVIEW_ACTIONS: 'Management Review Action Closure Rate',
  INTERNAL_AUDIT_FINDINGS: 'Internal Audit Non-Conformities',
  CALIBRATION_COMPLIANCE: 'Calibration Compliance %',
  CUSTOMER_COMPLAINT_RESOLUTION: 'Customer Complaint Resolution Time'
};

// ISO 14224:2016 Reliability Data Collection and Exchange Format
const ISO_14224_RELIABILITY_DATA = {
  MTBF: 'Mean Time Between Failures (hours)',
  MTTR: 'Mean Time To Repair (hours)',
  MTTF: 'Mean Time To Failure (hours)',
  AVAILABILITY_INHERENT: 'Inherent Availability',
  AVAILABILITY_ACHIEVED: 'Achieved Availability', 
  AVAILABILITY_OPERATIONAL: 'Operational Availability',
  FAILURE_RATE: 'Failure Rate (failures/hour)',
  REPAIR_RATE: 'Repair Rate (repairs/hour)',
  DOWNTIME_RATIO: 'Downtime Ratio',
  RELIABILITY_FUNCTION: 'Reliability Function R(t)',
  HAZARD_RATE: 'Hazard Rate λ(t)',
  MAINTAINABILITY: 'Maintainability M(t)'
};

// Equipment taxonomy based on ISO 14224
const EQUIPMENT_TAXONOMY = {
  STATIC: {
    PRESSURE_VESSELS: ['Reactors', 'Separators', 'Heat Exchangers', 'Storage Tanks'],
    PIPING: ['Process Piping', 'Utility Piping', 'Safety Systems'],
    STRUCTURES: ['Platforms', 'Buildings', 'Foundations']
  },
  ROTATING: {
    PUMPS: ['Centrifugal Pumps', 'Positive Displacement Pumps', 'Vacuum Pumps'],
    COMPRESSORS: ['Centrifugal Compressors', 'Reciprocating Compressors', 'Screw Compressors'],
    TURBINES: ['Gas Turbines', 'Steam Turbines', 'Hydraulic Turbines'],
    GENERATORS: ['AC Generators', 'DC Generators', 'Emergency Generators']
  },
  ELECTRICAL: {
    POWER_SYSTEMS: ['Transformers', 'Switchgear', 'Motor Control Centers'],
    MOTORS: ['AC Motors', 'DC Motors', 'Servo Motors'],
    INSTRUMENTATION: ['Sensors', 'Transmitters', 'Controllers']
  },
  INSTRUMENTATION: {
    CONTROL_SYSTEMS: ['DCS', 'PLC', 'SCADA'],
    SAFETY_SYSTEMS: ['SIS', 'Fire & Gas', 'Emergency Shutdown'],
    ANALYTICAL: ['Analyzers', 'Chromatographs', 'Spectrometers']
  }
};

// Failure modes based on ISO 14224
const FAILURE_MODES = {
  DEGRADED_PERFORMANCE: 'Performance degradation below acceptable level',
  SPURIOUS_OPERATION: 'Unwanted activation or operation',
  FAIL_TO_START: 'Failure to start on demand',
  FAIL_TO_STOP: 'Failure to stop on demand', 
  FAIL_TO_CONTINUE: 'Failure during continuous operation',
  EXTERNAL_LEAKAGE: 'External leakage beyond acceptable limits',
  INTERNAL_LEAKAGE: 'Internal leakage beyond acceptable limits',
  STRUCTURAL_DEFECT: 'Structural integrity compromised',
  VIBRATION_NOISE: 'Excessive vibration or noise',
  OVERHEATING: 'Operating temperature exceeded',
  CONTAMINATION: 'Contamination affecting operation',
  WEAR_CORROSION: 'Wear or corrosion damage'
};

async function seedComprehensiveISO() {
  console.log('🏭 Starting comprehensive ISO standards manufacturing seed...');
  
  try {
    // Clean database in proper order
    console.log('🧹 Cleaning existing data...');
    await prisma.qualityMetric.deleteMany();
    await prisma.performanceMetric.deleteMany();
    await prisma.metric.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.qualityCheck.deleteMany();
    await prisma.productionOrder.deleteMany();
    await prisma.workUnitKPISummary.deleteMany();
    await prisma.workUnit.deleteMany();
    await prisma.workCenterKPISummary.deleteMany();
    await prisma.workCenter.deleteMany();
    await prisma.areaKPISummary.deleteMany();
    await prisma.area.deleteMany();
    await prisma.siteKPISummary.deleteMany();
    await prisma.site.deleteMany();
    await prisma.enterpriseKPISummary.deleteMany();
    await prisma.enterprise.deleteMany();
    
    console.log('✅ Database cleaned');

    // Create Enterprise
    console.log('🏢 Creating enterprise structure...');
    const enterprise = await prisma.enterprise.create({
      data: {
        id: 'ENT-ISO-001',
        name: 'ISO Manufacturing Excellence Corp',
        code: 'IMEC',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // Create Sites
    const sites = await Promise.all([
      prisma.site.create({
        data: {
          id: 'SITE-NA-001',
          enterpriseId: enterprise.id,
          name: 'North American Manufacturing Hub',
          code: 'NA-HUB',
          location: 'Detroit, Michigan, USA',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }),
      prisma.site.create({
        data: {
          id: 'SITE-EU-001', 
          enterpriseId: enterprise.id,
          name: 'European Production Center',
          code: 'EU-CENTER',
          location: 'Stuttgart, Germany',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }),
      prisma.site.create({
        data: {
          id: 'SITE-ASIA-001',
          enterpriseId: enterprise.id,
          name: 'Asia Pacific Facility',
          code: 'APAC-FAC',
          location: 'Yokohama, Japan', 
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })
    ]);

    // Create Areas
    const areas = [];
    for (const site of sites) {
      const siteAreas = await Promise.all([
        prisma.area.create({
          data: {
            id: `AREA-${site.code}-PROD`,
            siteId: site.id,
            name: 'Production Area',
            code: `${site.code}-PROD`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }),
        prisma.area.create({
          data: {
            id: `AREA-${site.code}-QC`,
            siteId: site.id,
            name: 'Quality Control Area',
            code: `${site.code}-QC`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }),
        prisma.area.create({
          data: {
            id: `AREA-${site.code}-MAINT`,
            siteId: site.id,
            name: 'Maintenance Area',
            code: `${site.code}-MAINT`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })
      ]);
      areas.push(...siteAreas);
    }

    // Create Work Centers
    const workCenters = [];
    for (const area of areas) {
      if (area.name === 'Production Area') {
        const centerTypes = ['Machining', 'Assembly', 'Welding', 'Painting'];
        for (let i = 0; i < centerTypes.length; i++) {
          const workCenter = await prisma.workCenter.create({
            data: {
              id: `WC-${area.code}-${centerTypes[i].toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
              areaId: area.id,
              name: `${centerTypes[i]} Center ${i + 1}`,
              code: `${area.code}-${centerTypes[i].substr(0, 3).toUpperCase()}${String(i + 1).padStart(2, '0')}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
          workCenters.push(workCenter);
        }
      }
    }

    console.log(`✅ Created ${enterprise ? 1 : 0} enterprise, ${sites.length} sites, ${areas.length} areas, ${workCenters.length} work centers`);

    // Create Work Units (Equipment) based on ISO 14224 taxonomy
    console.log('⚙️ Creating ISO 14224 compliant equipment...');
    const workUnits = [];
    
    for (const workCenter of workCenters) {
      let equipmentSpecs = [];
      
      if (workCenter.name.includes('Machining')) {
        equipmentSpecs = [
          { type: 'CNC Milling Machine', model: 'DMG MORI NTX 2000', manufacturer: 'DMG MORI' },
          { type: 'CNC Turning Center', model: 'OKUMA LB3000', manufacturer: 'OKUMA' },
          { type: 'Grinding Machine', model: 'STUDER S33', manufacturer: 'STUDER' }
        ];
      } else if (workCenter.name.includes('Assembly')) {
        equipmentSpecs = [
          { type: 'Robotic Assembly Cell', model: 'KUKA KR 10 R1100', manufacturer: 'KUKA' },
          { type: 'Automated Screwing Station', model: 'WEBER SST-5000', manufacturer: 'WEBER' },
          { type: 'Vision Inspection System', model: 'COGNEX In-Sight 7000', manufacturer: 'COGNEX' }
        ];
      } else if (workCenter.name.includes('Welding')) {
        equipmentSpecs = [
          { type: 'Robotic Welding Cell', model: 'ABB IRB 1600', manufacturer: 'ABB' },
          { type: 'MIG Welding Station', model: 'FRONIUS TPS 4000', manufacturer: 'FRONIUS' },
          { type: 'Laser Welding System', model: 'TRUMPF TruLaser 3030', manufacturer: 'TRUMPF' }
        ];
      } else if (workCenter.name.includes('Painting')) {
        equipmentSpecs = [
          { type: 'Paint Spray Booth', model: 'DÜRR EcoRP Spray Booth', manufacturer: 'DÜRR' },
          { type: 'Powder Coating Line', model: 'GEMA OptiCenter', manufacturer: 'GEMA' },
          { type: 'Curing Oven', model: 'EISENMANN Oven System', manufacturer: 'EISENMANN' }
        ];
      }

      for (let i = 0; i < equipmentSpecs.length; i++) {
        const spec = equipmentSpecs[i];
        const serialNumber = `${spec.manufacturer.substr(0, 3)}${new Date().getFullYear()}${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
        
        const workUnit = await prisma.workUnit.create({
          data: {
            id: `WU-${workCenter.code}-${String(i + 1).padStart(3, '0')}`,
            workCenterId: workCenter.id,
            name: `${spec.type} ${String.fromCharCode(65 + i)}`, // A, B, C...
            code: `${workCenter.code}-${String.fromCharCode(65 + i)}${String(i + 1).padStart(2, '0')}`,
            equipmentType: spec.type,
            model: spec.model,
            serialNumber: serialNumber,
            manufacturerCode: spec.manufacturer,
            installationDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            status: Math.random() > 0.1 ? 'operational' : (Math.random() > 0.5 ? 'maintenance' : 'offline'),
            location: `${workCenter.name}, Station ${i + 1}`,
            description: `High-precision ${spec.type.toLowerCase()} for manufacturing operations`,
            lastMaintenanceAt: subDays(new Date(), Math.floor(Math.random() * 30)),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
        workUnits.push(workUnit);
      }
    }

    console.log(`✅ Created ${workUnits.length} work units`);

    // Generate ISO 22400 Performance Metrics
    console.log('📊 Generating ISO 22400 performance metrics...');
    
    for (const workUnit of workUnits) {
      // Generate 30 days of performance data
      for (let day = 0; day < 30; day++) {
        const timestamp = subDays(new Date(), day);
        
        // Generate realistic ISO 22400 metrics based on equipment status
        const isOperational = workUnit.status === 'operational';
        const isInMaintenance = workUnit.status === 'maintenance';
        
        // Availability calculations (ISO 22400)
        const plannedProductionTime = 480; // 8 hours in minutes
        const plannedDowntime = 30 + Math.random() * 30; // 30-60 minutes
        const unplannedDowntime = isOperational ? Math.random() * 30 : (isInMaintenance ? 120 + Math.random() * 240 : 300 + Math.random() * 180);
        const operatingTime = plannedProductionTime - unplannedDowntime;
        const availability = operatingTime / (plannedProductionTime - plannedDowntime);
        
        // Performance calculations (ISO 22400)
        const idealCycleTime = 2.5; // minutes per piece
        const actualCycleTime = idealCycleTime * (1 + (Math.random() * 0.3)); // 0-30% slower
        const totalCount = Math.floor(operatingTime / actualCycleTime);
        const performance = (idealCycleTime * totalCount) / operatingTime;
        
        // Quality calculations (ISO 22400)
        const defectRate = isOperational ? Math.random() * 0.05 : Math.random() * 0.15; // 0-5% or 0-15%
        const goodCount = Math.floor(totalCount * (1 - defectRate));
        const quality = totalCount > 0 ? goodCount / totalCount : 0;
        
        // OEE calculation (ISO 22400)
        const oeeScore = availability * performance * quality;
        
        await prisma.performanceMetric.create({
          data: {
            workUnitId: workUnit.id,
            timestamp: timestamp,
            availability: Math.min(1.0, Math.max(0, Number(availability.toFixed(3)))),
            performance: Math.min(1.0, Math.max(0, Number(performance.toFixed(3)))),
            quality: Math.min(1.0, Math.max(0, Number(quality.toFixed(3)))),
            oeeScore: Math.min(1.0, Math.max(0, Number(oeeScore.toFixed(3)))),
            runTime: Number(operatingTime.toFixed(1)),
            plannedDowntime: Number(plannedDowntime.toFixed(1)),
            unplannedDowntime: Number(unplannedDowntime.toFixed(1)),
            idealCycleTime: Number(idealCycleTime.toFixed(2)),
            actualCycleTime: Number(actualCycleTime.toFixed(2)),
            totalParts: totalCount,
            goodParts: goodCount,
            shift: timestamp.getHours() < 16 ? 'Day' : 'Night',
            operator: `OP${Math.floor(Math.random() * 20) + 1}`,
            notes: day === 0 ? 'Latest performance data' : null,
            createdAt: timestamp,
          }
        });
      }
    }

    // Generate real-time sensor metrics
    console.log('🔧 Generating real-time sensor metrics...');
    
    const sensorTypes = [
      { name: 'TEMPERATURE', unit: '°C', min: 60, max: 90 },
      { name: 'PRESSURE', unit: 'PSI', min: 100, max: 250 },
      { name: 'VIBRATION', unit: 'mm/s', min: 1, max: 8 },
      { name: 'SPEED', unit: 'RPM', min: 1000, max: 3000 },
      { name: 'POWER_CONSUMPTION', unit: 'kW', min: 10, max: 50 },
      { name: 'FLOW_RATE', unit: 'L/min', min: 50, max: 200 },
      { name: 'TORQUE', unit: 'Nm', min: 100, max: 500 },
      { name: 'ACOUSTIC_EMISSION', unit: 'dB', min: 40, max: 80 }
    ];

    for (const workUnit of workUnits) {
      for (const sensorType of sensorTypes) {
        // Generate 48 hours of data (every 30 minutes)
        for (let hour = 0; hour < 48; hour++) {
          const timestamp = subHours(new Date(), hour);
          
          // Base value with some trend and noise
          const trend = Math.sin(hour * 0.1) * 0.1; // Small trend
          const noise = (Math.random() - 0.5) * 0.2; // Random noise
          const baseValue = (sensorType.min + sensorType.max) / 2;
          const value = baseValue + (baseValue * trend) + (baseValue * noise);
          
          // Clamp to sensor range
          const clampedValue = Math.min(sensorType.max, Math.max(sensorType.min, value));
          
          await prisma.metric.create({
            data: {
              id: `METRIC-${workUnit.id}-${sensorType.name}-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 6)}`,
              workUnitId: workUnit.id,
              timestamp: timestamp,
              name: sensorType.name,
              value: Number(clampedValue.toFixed(2)),
              unit: sensorType.unit,
              source: 'sensor',
              quality: 0.95 + (Math.random() * 0.05), // 95-100% data quality
              tags: JSON.stringify({
                sensorId: `${sensorType.name}_${workUnit.code}`,
                calibrationDate: subDays(new Date(), Math.floor(Math.random() * 365)),
                range: `${sensorType.min}-${sensorType.max} ${sensorType.unit}`
              }),
              createdAt: timestamp,
            }
          });
        }
      }
    }

    // Generate ISO 9001 Quality Metrics
    console.log('🎯 Generating ISO 9001 quality metrics...');
    
    for (const workUnit of workUnits) {
      // Generate quality metrics for the last 7 days
      for (let day = 0; day < 7; day++) {
        const timestamp = subDays(new Date(), day);
        
        // Various quality parameters based on equipment type
        const qualityParams = [];
        
        if (workUnit.equipmentType.includes('CNC') || workUnit.equipmentType.includes('Machining')) {
          qualityParams.push(
            { param: 'Dimensional Accuracy', nominal: 0.0, tolerance: 0.05, unit: 'mm' },
            { param: 'Surface Roughness', nominal: 1.6, tolerance: 0.4, unit: 'μm' },
            { param: 'Roundness', nominal: 0.0, tolerance: 0.01, unit: 'mm' }
          );
        } else if (workUnit.equipmentType.includes('Welding')) {
          qualityParams.push(
            { param: 'Weld Penetration', nominal: 5.0, tolerance: 0.5, unit: 'mm' },
            { param: 'Weld Width', nominal: 8.0, tolerance: 1.0, unit: 'mm' },
            { param: 'Porosity Level', nominal: 0.0, tolerance: 2.0, unit: '%' }
          );
        } else if (workUnit.equipmentType.includes('Assembly')) {
          qualityParams.push(
            { param: 'Torque Specification', nominal: 25.0, tolerance: 2.0, unit: 'Nm' },
            { param: 'Gap Measurement', nominal: 2.0, tolerance: 0.5, unit: 'mm' },
            { param: 'Alignment Error', nominal: 0.0, tolerance: 0.1, unit: 'degrees' }
          );
        } else {
          qualityParams.push(
            { param: 'Process Parameter 1', nominal: 100.0, tolerance: 5.0, unit: 'units' },
            { param: 'Process Parameter 2', nominal: 50.0, tolerance: 3.0, unit: 'units' }
          );
        }

        for (const qParam of qualityParams) {
          // Generate measurement with some process variation
          const processVariation = (Math.random() - 0.5) * qParam.tolerance * 0.6; // Within 60% of tolerance
          const measurement = qParam.nominal + processVariation;
          
          const lowerLimit = qParam.nominal - qParam.tolerance;
          const upperLimit = qParam.nominal + qParam.tolerance;
          const isWithinSpec = measurement >= lowerLimit && measurement <= upperLimit;
          const deviation = Math.abs(measurement - qParam.nominal);
          
          await prisma.qualityMetric.create({
            data: {
              workUnitId: workUnit.id,
              timestamp: timestamp,
              parameter: qParam.param,
              value: Number(measurement.toFixed(3)),
              uom: qParam.unit,
              lowerLimit: Number(lowerLimit.toFixed(3)),
              upperLimit: Number(upperLimit.toFixed(3)),
              nominal: Number(qParam.nominal.toFixed(3)),
              isWithinSpec: isWithinSpec,
              deviation: Number(deviation.toFixed(3)),
              createdAt: timestamp,
              updatedAt: timestamp,
            }
          });
        }
      }
    }

    // Generate ISO 14224 Reliability-based Alerts
    console.log('🚨 Generating ISO 14224 reliability alerts...');
    
    const alertTemplates = [
      { type: 'DEGRADED_PERFORMANCE', severity: 'medium', category: 'Performance' },
      { type: 'TEMPERATURE_ANOMALY', severity: 'high', category: 'Process' },
      { type: 'VIBRATION_THRESHOLD', severity: 'high', category: 'Mechanical' },
      { type: 'MAINTENANCE_DUE', severity: 'low', category: 'Preventive' },
      { type: 'QUALITY_DEVIATION', severity: 'medium', category: 'Quality' },
      { type: 'CALIBRATION_REQUIRED', severity: 'low', category: 'Metrology' },
      { type: 'LUBRICATION_LOW', severity: 'medium', category: 'Maintenance' },
      { type: 'FILTER_REPLACEMENT', severity: 'low', category: 'Maintenance' },
      { type: 'BEARING_WEAR', severity: 'high', category: 'Mechanical' },
      { type: 'TOOL_WEAR', severity: 'medium', category: 'Tooling' }
    ];

    for (const workUnit of workUnits) {
      // Generate 0-3 alerts per work unit
      const alertCount = Math.floor(Math.random() * 4);
      
      for (let i = 0; i < alertCount; i++) {
        const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
        const alertTime = subHours(new Date(), Math.floor(Math.random() * 72)); // Within last 3 days
        
        let message = '';
        switch (template.type) {
          case 'DEGRADED_PERFORMANCE':
            message = `Equipment performance below 85% efficiency threshold`;
            break;
          case 'TEMPERATURE_ANOMALY':
            message = `Operating temperature exceeded normal range (>85°C)`;
            break;
          case 'VIBRATION_THRESHOLD':
            message = `Vibration levels above 6.0 mm/s - investigate bearing condition`;
            break;
          case 'MAINTENANCE_DUE':
            message = `Scheduled maintenance window approaching within 7 days`;
            break;
          case 'QUALITY_DEVIATION':
            message = `Quality parameter outside specification limits`;
            break;
          case 'CALIBRATION_REQUIRED':
            message = `Instrument calibration due within 30 days`;
            break;
          case 'LUBRICATION_LOW':
            message = `Lubrication level below minimum threshold`;
            break;
          case 'FILTER_REPLACEMENT':
            message = `Air/oil filter replacement recommended`;
            break;
          case 'BEARING_WEAR':
            message = `Bearing wear detected through vibration analysis`;
            break;
          case 'TOOL_WEAR':
            message = `Cutting tool wear exceeding acceptable limits`;
            break;
          default:
            message = `${template.category} alert requires attention`;
        }

        await prisma.alert.create({
          data: {
            alertType: template.type,
            severity: template.severity,
            message: `${workUnit.name}: ${message}`,
            status: Math.random() > 0.3 ? 'active' : 'acknowledged', // 70% active, 30% acknowledged
            timestamp: alertTime,
            acknowledgedBy: Math.random() > 0.7 ? `OP${Math.floor(Math.random() * 20) + 1}` : null,
            acknowledgedAt: Math.random() > 0.7 ? addHours(alertTime, Math.floor(Math.random() * 24)) : null,
            workUnitId: workUnit.id,
            createdAt: alertTime,
            updatedAt: new Date(),
          }
        });
      }
    }

    // Generate KPI Summaries
    console.log('📈 Calculating KPI summaries...');
    
    // Calculate work unit KPI summaries
    for (const workUnit of workUnits) {
      const recentMetrics = await prisma.performanceMetric.findMany({
        where: {
          workUnitId: workUnit.id,
          timestamp: {
            gte: subDays(new Date(), 7) // Last 7 days
          }
        }
      });

      if (recentMetrics.length > 0) {
        const avgOEE = recentMetrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / recentMetrics.length;
        const avgAvailability = recentMetrics.reduce((sum, m) => sum + (m.availability || 0), 0) / recentMetrics.length;
        const avgPerformance = recentMetrics.reduce((sum, m) => sum + (m.performance || 0), 0) / recentMetrics.length;
        const avgQuality = recentMetrics.reduce((sum, m) => sum + (m.quality || 0), 0) / recentMetrics.length;
        
        // Calculate MTBF and MTTR based on alerts and maintenance
        const alerts = await prisma.alert.findMany({
          where: { workUnitId: workUnit.id }
        });
        
        const mtbf = alerts.length > 0 ? (24 * 7) / alerts.length : 720; // Hours between failures
        const mttr = 2 + Math.random() * 4; // 2-6 hours mean time to repair
        
        const productionCount = recentMetrics.reduce((sum, m) => sum + (m.goodParts || 0), 0);
        const totalParts = recentMetrics.reduce((sum, m) => sum + (m.totalParts || 0), 0);
        const scrapRate = totalParts > 0 ? (totalParts - productionCount) / totalParts : 0;
        
        await prisma.workUnitKPISummary.create({
          data: {
            id: `WUKPI-${workUnit.id}`,
            workUnitId: workUnit.id,
            oee: Number(avgOEE.toFixed(3)),
            availability: Number(avgAvailability.toFixed(3)),
            performance: Number(avgPerformance.toFixed(3)),
            quality: Number(avgQuality.toFixed(3)),
            mtbf: Number(mtbf.toFixed(1)),
            mttr: Number(mttr.toFixed(1)),
            productionCount: BigInt(productionCount),
            scrapRate: Number(scrapRate.toFixed(4)),
            energyConsumption: BigInt(Math.floor(1000 + Math.random() * 5000)), // kWh
            periodStart: subDays(new Date(), 7),
            periodEnd: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }
    }

    console.log('✅ ISO comprehensive seed completed successfully!');
    console.log(`📊 Generated data conforming to:`);
    console.log(`   - ISO 22400-2:2014 Manufacturing Operations Management KPIs`);
    console.log(`   - ISO 9001:2015 Quality Management System`);
    console.log(`   - ISO 14224:2016 Reliability Data Collection`);
    console.log(`🏭 Summary:`);
    console.log(`   - 1 Enterprise with 3 Sites`);
    console.log(`   - ${areas.length} Areas with ${workCenters.length} Work Centers`);
    console.log(`   - ${workUnits.length} Work Units with full taxonomy`);
    console.log(`   - 30 days of performance metrics per unit`);
    console.log(`   - 48 hours of real-time sensor data`);
    console.log(`   - 7 days of quality measurements`);
    console.log(`   - Reliability-based maintenance alerts`);
    console.log(`   - Complete KPI calculations`);

  } catch (error) {
    console.error('❌ Error in comprehensive ISO seed:', error);
    throw error;
  }
}

seedComprehensiveISO()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
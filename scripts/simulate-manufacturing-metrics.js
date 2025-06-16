/**
 * Manufacturing Metrics Simulator for Grafana Dashboards
 * 
 * This script simulates realistic manufacturing metrics for OEE, quality, production,
 * and equipment metrics following ISO 14224 standards for demonstration purposes.
 */

const http = require('http');
const querystring = require('querystring');

// Configuration
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090/api/v1/write';
const SIMULATION_INTERVAL_MS = parseInt(process.env.SIMULATION_INTERVAL_MS || '5000', 10);

// Equipment definitions
const EQUIPMENT = [
  { id: 'assembly_line_1', name: 'Assembly Line 1', type: 'assembly_line' },
  { id: 'assembly_line_2', name: 'Assembly Line 2', type: 'assembly_line' },
  { id: 'cnc_machine_1', name: 'CNC Machine 1', type: 'cnc_machine' },
  { id: 'cnc_machine_2', name: 'CNC Machine 2', type: 'cnc_machine' },
  { id: 'injection_molder_1', name: 'Injection Molder 1', type: 'injection_molder' },
  { id: 'robot_arm_1', name: 'Robot Arm 1', type: 'robot' }
];

// Production lines
const PRODUCTION_LINES = [
  { id: 'line_a', name: 'Production Line A' },
  { id: 'line_b', name: 'Production Line B' },
  { id: 'line_c', name: 'Production Line C' }
];

// ISO 14224 compliant failure modes
const FAILURE_MODES = [
  { id: 'mechanical', name: 'Mechanical Failure', category: 'equipment' },
  { id: 'electrical', name: 'Electrical Failure', category: 'equipment' },
  { id: 'instrumentation', name: 'Instrumentation Failure', category: 'control' },
  { id: 'process_related', name: 'Process Related', category: 'operations' },
  { id: 'external', name: 'External Influence', category: 'external' },
  { id: 'material', name: 'Material/Product Related', category: 'material' }
];

// Defect types
const DEFECT_TYPES = [
  { id: 'dimensional', name: 'Dimensional Error' },
  { id: 'surface', name: 'Surface Defect' },
  { id: 'assembly', name: 'Assembly Error' },
  { id: 'material', name: 'Material Defect' },
  { id: 'functional', name: 'Functional Failure' }
];

// Products
const PRODUCTS = [
  { id: 'product_a', name: 'Product A' },
  { id: 'product_b', name: 'Product B' },
  { id: 'product_c', name: 'Product C' }
];

// Utilities
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Choose a random item from an array
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate metrics with slight random variations around baseline
function generateMetrics() {
  const timestamp = Math.floor(Date.now() / 1000);
  const metrics = [];

  // Generate OEE metrics for each equipment
  EQUIPMENT.forEach(equipment => {
    // Base OEE with some equipment-specific baselines
    let baseOee = 0;
    switch (equipment.type) {
      case 'assembly_line':
        baseOee = 0.82;
        break;
      case 'cnc_machine':
        baseOee = 0.88;
        break;
      case 'injection_molder':
        baseOee = 0.75;
        break;
      case 'robot':
        baseOee = 0.90;
        break;
      default:
        baseOee = 0.80;
    }
    
    // Add random variation
    const oee = Math.max(0, Math.min(1, baseOee + randomBetween(-0.1, 0.1)));
    const availability = Math.max(0, Math.min(1, baseOee + randomBetween(-0.15, 0.05)));
    const performance = Math.max(0, Math.min(1, baseOee + randomBetween(-0.05, 0.15)));
    const quality = Math.max(0, Math.min(1, baseOee + randomBetween(-0.08, 0.08)));
    
    // Select a random production line for this equipment
    const line = randomChoice(PRODUCTION_LINES);
    
    // Add OEE metrics
    metrics.push(`manufacturing_oee{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${oee} ${timestamp}`);
    metrics.push(`manufacturing_availability{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${availability} ${timestamp}`);
    metrics.push(`manufacturing_performance{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${performance} ${timestamp}`);
    metrics.push(`manufacturing_quality{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${quality} ${timestamp}`);
    
    // Equipment availability
    metrics.push(`manufacturing_equipment_availability{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${availability} ${timestamp}`);
    
    // Health score (0-100)
    const healthScore = Math.max(0, Math.min(100, 85 + randomBetween(-20, 15)));
    metrics.push(`manufacturing_equipment_health_score{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${healthScore} ${timestamp}`);
    
    // Mean Time Between Failures (MTBF) in hours
    const mtbf = randomBetween(80, 240); // 80 to 240 hours
    metrics.push(`manufacturing_mtbf_hours{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}"} ${mtbf} ${timestamp}`);
    
    // Mean Time To Repair (MTTR) in hours
    const mttr = randomBetween(1, 8); // 1 to 8 hours
    metrics.push(`manufacturing_mttr_hours{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}"} ${mttr} ${timestamp}`);
    
    // Defect rate
    const defectRate = Math.max(0, Math.min(0.1, 0.03 + randomBetween(-0.02, 0.04)));
    metrics.push(`manufacturing_defect_rate{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}",line="${line.id}"} ${defectRate} ${timestamp}`);
    
    // Random defect counts
    DEFECT_TYPES.forEach(defect => {
      if (Math.random() < 0.7) { // Not all equipment will have all defect types
        const defectCount = randomInt(0, 10);
        metrics.push(`manufacturing_defect_count{equipment="${equipment.id}",equipment_name="${equipment.name}",defect_type="${defect.id}",defect_name="${defect.name}",line="${line.id}"} ${defectCount} ${timestamp}`);
      }
    });
    
    // Production count
    const product = randomChoice(PRODUCTS);
    const productionCount = randomInt(50, 500);
    metrics.push(`manufacturing_production_count{equipment="${equipment.id}",equipment_name="${equipment.name}",product="${product.id}",product_name="${product.name}",production_line="${line.id}"} ${productionCount} ${timestamp}`);
    
    // ISO 14224 Failure data
    if (Math.random() < 0.3) { // 30% chance of a failure record
      const failureMode = randomChoice(FAILURE_MODES);
      const downtimeHours = randomBetween(0.5, 4.0);
      metrics.push(`manufacturing_equipment_failure{equipment="${equipment.id}",equipment_name="${equipment.name}",failure_mode="${failureMode.id}",failure_category="${failureMode.category}",iso14224_compliant="true"} ${downtimeHours} ${timestamp}`);
    }
  });
  
  // Generate aggregated production line metrics
  PRODUCTION_LINES.forEach(line => {
    // Daily production by line
    const dailyProduction = randomInt(1000, 5000);
    metrics.push(`daily_production_by_line{production_line="${line.id}",line_name="${line.name}"} ${dailyProduction} ${timestamp}`);
    
    // OEE by line (aggregated)
    const lineOee = randomBetween(0.7, 0.95);
    metrics.push(`line_oee{production_line="${line.id}",line_name="${line.name}"} ${lineOee} ${timestamp}`);
  });
  
  // Generate aggregated defect metrics
  DEFECT_TYPES.forEach(defect => {
    const dailyDefects = randomInt(5, 50);
    metrics.push(`daily_defects_by_type{defect_type="${defect.id}",defect_name="${defect.name}"} ${dailyDefects} ${timestamp}`);
  });
  
  // Downtime reasons
  const downtimeReasons = [
    'Scheduled Maintenance',
    'Unplanned Breakdown',
    'Material Shortage',
    'Changeover',
    'Quality Issues',
    'Operator Absence'
  ];
  
  downtimeReasons.forEach(reason => {
    const downtimeHours = randomBetween(0.5, 8.0);
    metrics.push(`downtime_by_reason{reason="${reason}"} ${downtimeHours} ${timestamp}`);
  });
  
  // Monthly OEE by equipment for table view
  EQUIPMENT.forEach(equipment => {
    const monthlyOee = randomBetween(0.65, 0.95);
    metrics.push(`monthly_oee_by_equipment{equipment="${equipment.id}",equipment_name="${equipment.name}",equipment_type="${equipment.type}"} ${monthlyOee} ${timestamp}`);
  });
  
  return metrics;
}

// Send metrics to Prometheus
function sendMetrics(metrics) {
  const metricsData = metrics.join('\n');
  
  // Parse the Prometheus URL
  const url = new URL(PROMETHEUS_URL);
  
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(metricsData)
    }
  };
  
  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[${new Date().toISOString()}] Metrics sent successfully`);
      } else {
        console.error(`[${new Date().toISOString()}] Error sending metrics: ${res.statusCode} ${responseData}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Error sending metrics: ${error.message}`);
  });
  
  req.write(metricsData);
  req.end();
}

// Main simulation loop
function runSimulation() {
  console.log(`[${new Date().toISOString()}] Starting manufacturing metrics simulation`);
  console.log(`Sending metrics to: ${PROMETHEUS_URL}`);
  console.log(`Simulation interval: ${SIMULATION_INTERVAL_MS}ms`);
  
  // Initial metrics generation
  const initialMetrics = generateMetrics();
  sendMetrics(initialMetrics);
  
  // Set up interval for continuous simulation
  setInterval(() => {
    const metrics = generateMetrics();
    sendMetrics(metrics);
  }, SIMULATION_INTERVAL_MS);
}

// Start the simulation
runSimulation();
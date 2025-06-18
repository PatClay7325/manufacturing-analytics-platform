/**
 * Manufacturing Metrics Simulator for PostgreSQL/Prisma
 * 
 * This script simulates realistic manufacturing metrics for OEE, quality, production,
 * and equipment metrics following ISO 14224 standards for demonstration purposes.
 */

const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/metrics/ingest';
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
    
    // Add metrics in Prisma format
    metrics.push({
      name: 'oee',
      value: oee,
      unit: 'percentage',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type,
        line: line.id
      }
    });
    
    metrics.push({
      name: 'availability',
      value: availability,
      unit: 'percentage',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type,
        line: line.id
      }
    });
    
    metrics.push({
      name: 'performance',
      value: performance,
      unit: 'percentage',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type,
        line: line.id
      }
    });
    
    metrics.push({
      name: 'quality',
      value: quality,
      unit: 'percentage',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type,
        line: line.id
      }
    });
    
    // Equipment temperature (varies based on equipment type)
    let baseTemp = 25;
    switch (equipment.type) {
      case 'injection_molder':
        baseTemp = 180; // Hot equipment
        break;
      case 'cnc_machine':
        baseTemp = 45;
        break;
      default:
        baseTemp = 35;
    }
    
    metrics.push({
      name: 'temperature',
      value: baseTemp + randomBetween(-5, 5),
      unit: 'celsius',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type
      }
    });
    
    // Equipment pressure (for applicable equipment)
    if (equipment.type === 'injection_molder' || equipment.type === 'cnc_machine') {
      metrics.push({
        name: 'pressure',
        value: 4.5 + randomBetween(-0.5, 0.5),
        unit: 'bar',
        tags: {
          equipment_name: equipment.name,
          equipment_type: equipment.type
        }
      });
    }
    
    // Equipment vibration
    metrics.push({
      name: 'vibration',
      value: 0.5 + randomBetween(0, 0.3),
      unit: 'mm/s',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type
      }
    });
    
    // Production count
    const productionCount = randomInt(50, 200);
    metrics.push({
      name: 'production_count',
      value: productionCount,
      unit: 'units',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type,
        line: line.id
      }
    });
    
    // Defect count
    const defectCount = randomInt(0, Math.floor(productionCount * 0.05)); // Max 5% defects
    metrics.push({
      name: 'defect_count',
      value: defectCount,
      unit: 'units',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type,
        line: line.id
      }
    });
    
    // Energy consumption
    let baseEnergy = 10;
    switch (equipment.type) {
      case 'injection_molder':
        baseEnergy = 50;
        break;
      case 'cnc_machine':
        baseEnergy = 30;
        break;
      case 'robot':
        baseEnergy = 15;
        break;
      default:
        baseEnergy = 20;
    }
    
    metrics.push({
      name: 'energy_consumption',
      value: baseEnergy + randomBetween(-5, 5),
      unit: 'kWh',
      tags: {
        equipment_name: equipment.name,
        equipment_type: equipment.type
      }
    });
  });
  
  return metrics;
}

// Send metrics to API
function sendMetrics(equipmentId, metrics) {
  const data = JSON.stringify({
    equipmentId: equipmentId,
    metrics: metrics
  });
  
  // Parse the API URL
  const url = new URL(API_URL);
  const protocol = url.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  const req = protocol.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log(`[${new Date().toISOString()}] Metrics sent successfully for ${equipmentId}`);
      } else {
        console.error(`[${new Date().toISOString()}] Error sending metrics: ${res.statusCode} ${responseData}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Error sending metrics: ${error.message}`);
  });
  
  req.write(data);
  req.end();
}

// Main simulation loop
function runSimulation() {
  console.log(`[${new Date().toISOString()}] Starting manufacturing metrics simulation`);
  console.log(`Sending metrics to: ${API_URL}`);
  console.log(`Simulation interval: ${SIMULATION_INTERVAL_MS}ms`);
  
  // Send metrics for each equipment
  function sendAllMetrics() {
    EQUIPMENT.forEach(equipment => {
      const metrics = generateMetrics();
      // Filter metrics relevant to this equipment
      const equipmentMetrics = metrics.filter(m => 
        !m.tags.equipment_name || m.tags.equipment_name === equipment.name
      );
      sendMetrics(equipment.id, equipmentMetrics);
    });
  }
  
  // Initial metrics generation
  sendAllMetrics();
  
  // Set up interval for continuous simulation
  setInterval(sendAllMetrics, SIMULATION_INTERVAL_MS);
}

// Start the simulation
runSimulation();
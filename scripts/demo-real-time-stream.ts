#!/usr/bin/env tsx

/**
 * Demo script to generate real-time manufacturing events
 * This simulates production data for testing the streaming capabilities
 */

import { prisma } from '../src/lib/database';
import { logger } from '../src/lib/logger';

interface SimulatedEquipment {
  id: string;
  name: string;
  baseOEE: number;
  volatility: number;
}

const EQUIPMENT: SimulatedEquipment[] = [
  { id: 'eq_001', name: 'CNC Machine 1', baseOEE: 0.85, volatility: 0.1 },
  { id: 'eq_002', name: 'Assembly Line A', baseOEE: 0.75, volatility: 0.15 },
  { id: 'eq_003', name: 'Welding Robot 1', baseOEE: 0.90, volatility: 0.05 },
  { id: 'eq_004', name: 'Quality Station 2', baseOEE: 0.80, volatility: 0.12 },
  { id: 'eq_005', name: 'Packaging Line B', baseOEE: 0.70, volatility: 0.20 }
];

class ManufacturingSimulator {
  private running = false;
  private intervals: NodeJS.Timeout[] = [];

  async start() {
    logger.info('Starting manufacturing data simulator...');
    
    // Ensure equipment exists
    await this.ensureEquipment();
    
    this.running = true;
    
    // Start different data generators
    this.intervals.push(
      setInterval(() => this.generatePerformanceMetrics(), 5000), // Every 5 seconds
      setInterval(() => this.generateAlerts(), 8000), // Every 8 seconds
      setInterval(() => this.generateQualityMetrics(), 10000), // Every 10 seconds
      setInterval(() => this.updateEquipmentStatus(), 15000) // Every 15 seconds
    );
    
    logger.info('Simulator started. Press Ctrl+C to stop.');
  }

  async stop() {
    logger.info('Stopping simulator...');
    this.running = false;
    this.intervals.forEach(interval => clearInterval(interval));
    await prisma.$disconnect();
  }

  private async ensureEquipment() {
    for (const eq of EQUIPMENT) {
      const workUnit = await prisma.workUnit.findFirst({
        where: { name: eq.name }
      });
      
      if (!workUnit) {
        logger.info(`Creating equipment: ${eq.name}`);
        
        // Create hierarchy if needed
        let site = await prisma.site.findFirst({
          where: { name: 'Main Factory' }
        });
        
        if (!site) {
          site = await prisma.site.create({
            data: {
              name: 'Main Factory',
              code: 'MF01',
              location: 'Industrial Park',
              timezone: 'America/Chicago'
            }
          });
        }
        
        let area = await prisma.area.findFirst({
          where: { name: 'Production Floor', siteId: site.id }
        });
        
        if (!area) {
          area = await prisma.area.create({
            data: {
              name: 'Production Floor',
              code: 'PF01',
              siteId: site.id
            }
          });
        }
        
        let workCenter = await prisma.workCenter.findFirst({
          where: { name: 'Main Line', areaId: area.id }
        });
        
        if (!workCenter) {
          workCenter = await prisma.workCenter.create({
            data: {
              name: 'Main Line',
              code: 'ML01',
              areaId: area.id
            }
          });
        }
        
        await prisma.workUnit.create({
          data: {
            name: eq.name,
            code: eq.id,
            equipmentType: this.getEquipmentType(eq.name),
            status: 'operational',
            workCenterId: workCenter.id
          }
        });
      }
    }
  }

  private getEquipmentType(name: string): string {
    if (name.includes('CNC')) return 'machining';
    if (name.includes('Assembly')) return 'assembly';
    if (name.includes('Welding')) return 'welding';
    if (name.includes('Quality')) return 'inspection';
    if (name.includes('Packaging')) return 'packaging';
    return 'general';
  }

  private async generatePerformanceMetrics() {
    if (!this.running) return;
    
    for (const eq of EQUIPMENT) {
      const workUnit = await prisma.workUnit.findFirst({
        where: { name: eq.name }
      });
      
      if (!workUnit) continue;
      
      // Generate realistic OEE components with some randomness
      const availability = this.generateValue(eq.baseOEE + 0.05, eq.volatility * 0.5);
      const performance = this.generateValue(eq.baseOEE, eq.volatility);
      const quality = this.generateValue(eq.baseOEE + 0.10, eq.volatility * 0.3);
      const oeeScore = availability * performance * quality;
      
      const totalCount = Math.floor(100 + Math.random() * 50);
      const goodCount = Math.floor(totalCount * quality);
      
      await prisma.performanceMetric.create({
        data: {
          workUnitId: workUnit.id,
          timestamp: new Date(),
          oeeScore,
          availability,
          performance,
          quality,
          plannedProductionTime: 480, // 8 hours in minutes
          actualProductionTime: Math.floor(480 * availability),
          idealCycleTime: 60, // seconds
          totalCount,
          goodCount
        }
      });
      
      logger.debug(`Generated performance metric for ${eq.name}: OEE=${(oeeScore * 100).toFixed(1)}%`);
    }
  }

  private async generateAlerts() {
    if (!this.running) return;
    
    // Randomly generate alerts for equipment
    const equipment = EQUIPMENT[Math.floor(Math.random() * EQUIPMENT.length)];
    const workUnit = await prisma.workUnit.findFirst({
      where: { name: equipment.name }
    });
    
    if (!workUnit) return;
    
    const alertTypes = [
      { type: 'performance', severity: 'warning', message: 'Performance below threshold' },
      { type: 'maintenance', severity: 'info', message: 'Maintenance schedule reminder' },
      { type: 'quality', severity: 'error', message: 'Quality deviation detected' },
      { type: 'temperature', severity: 'warning', message: 'Temperature above normal range' },
      { type: 'downtime', severity: 'critical', message: 'Unexpected equipment stop' }
    ];
    
    const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    // Only create alerts occasionally (30% chance)
    if (Math.random() < 0.3) {
      await prisma.alert.create({
        data: {
          workUnitId: workUnit.id,
          type: alert.type,
          severity: alert.severity as any,
          message: `${alert.message} on ${equipment.name}`,
          status: 'active',
          timestamp: new Date(),
          metadata: {
            source: 'simulator',
            value: Math.random() * 100
          }
        }
      });
      
      logger.info(`Generated ${alert.severity} alert for ${equipment.name}: ${alert.message}`);
    }
  }

  private async generateQualityMetrics() {
    if (!this.running) return;
    
    for (const eq of EQUIPMENT) {
      if (!eq.name.includes('Quality')) continue;
      
      const workUnit = await prisma.workUnit.findFirst({
        where: { name: eq.name }
      });
      
      if (!workUnit) continue;
      
      const metricTypes = ['dimension', 'weight', 'color', 'surface', 'hardness'];
      const metricType = metricTypes[Math.floor(Math.random() * metricTypes.length)];
      
      const targetValue = 100;
      const tolerance = 5;
      const value = this.generateValue(targetValue, tolerance);
      const isWithinSpec = Math.abs(value - targetValue) <= tolerance;
      
      await prisma.qualityMetric.create({
        data: {
          workUnitId: workUnit.id,
          timestamp: new Date(),
          metricType,
          value,
          targetValue,
          upperLimit: targetValue + tolerance,
          lowerLimit: targetValue - tolerance,
          isWithinSpec
        }
      });
      
      logger.debug(`Generated quality metric for ${eq.name}: ${metricType}=${value.toFixed(2)} (${isWithinSpec ? 'OK' : 'NG'})`);
    }
  }

  private async updateEquipmentStatus() {
    if (!this.running) return;
    
    // Randomly change equipment status
    const equipment = EQUIPMENT[Math.floor(Math.random() * EQUIPMENT.length)];
    const workUnit = await prisma.workUnit.findFirst({
      where: { name: equipment.name }
    });
    
    if (!workUnit) return;
    
    const statuses = ['operational', 'maintenance', 'idle'];
    const weights = [0.8, 0.1, 0.1]; // 80% operational, 10% maintenance, 10% idle
    
    const status = this.weightedRandom(statuses, weights);
    
    if (workUnit.status !== status) {
      await prisma.workUnit.update({
        where: { id: workUnit.id },
        data: { status }
      });
      
      logger.info(`Updated ${equipment.name} status: ${workUnit.status} → ${status}`);
    }
  }

  private generateValue(base: number, volatility: number): number {
    const random = (Math.random() - 0.5) * 2; // -1 to 1
    const value = base + (random * volatility);
    return Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
  }

  private weightedRandom<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}

// Main execution
async function main() {
  const simulator = new ManufacturingSimulator();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await simulator.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await simulator.stop();
    process.exit(0);
  });
  
  // Start the simulator
  await simulator.start();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Simulator error:', error);
    process.exit(1);
  });
}
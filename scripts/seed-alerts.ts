import { PrismaClient } from '@prisma/client';
import { subDays, subHours, subMinutes } from 'date-fns';

const prisma = new PrismaClient();

const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;
const statuses = ['active', 'acknowledged', 'resolved'] as const;
const alertTypes = ['equipment', 'quality', 'maintenance', 'production', 'safety'] as const;

const alertMessages = {
  equipment: [
    'CNC Machine #3 - Spindle temperature exceeding threshold',
    'Conveyor Belt A - Unexpected stop detected',
    'Robot Arm Station 2 - Servo motor malfunction',
    'Packaging Machine - Low air pressure warning',
    'Assembly Line 1 - Emergency stop activated'
  ],
  quality: [
    'Product defect rate exceeding 2% threshold',
    'Dimensional tolerance out of specification',
    'Surface finish quality below standard',
    'Material contamination detected in batch #A234',
    'Color variation detected in production run'
  ],
  maintenance: [
    'Preventive maintenance due for CNC Router',
    'Oil change required for Hydraulic Press',
    'Filter replacement needed - Paint Booth',
    'Scheduled calibration for CMM machine',
    'Bearing replacement recommended - Motor #12'
  ],
  production: [
    'Production rate below target by 15%',
    'Material shortage warning - Steel plates',
    'Batch completion delayed by 2 hours',
    'Line efficiency dropped below 80%',
    'Changeover time exceeding standard'
  ],
  safety: [
    'Safety door sensor malfunction - Zone 3',
    'Emergency shower inspection overdue',
    'PPE compliance below 95% in Area B',
    'Forklift speed limit exceeded',
    'Chemical spill detected in storage area'
  ]
};

async function seedAlerts() {
  console.log('Seeding alerts...');

  // Get work units
  const workUnits = await prisma.workUnit.findMany({
    take: 5
  });

  if (workUnits.length === 0) {
    console.error('No work units found. Please seed work units first.');
    return;
  }

  const alerts = [];

  // Generate alerts for the past 30 days
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const baseDate = subDays(new Date(), daysAgo);
    
    // Generate 0-10 alerts per day, with more recent days having more alerts
    const alertCount = Math.floor(Math.random() * (10 - daysAgo / 5)) + 1;
    
    for (let i = 0; i < alertCount; i++) {
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const messages = alertMessages[alertType];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // More recent alerts are more likely to be active
      let status: typeof statuses[number];
      if (daysAgo < 2) {
        status = Math.random() < 0.7 ? 'active' : (Math.random() < 0.5 ? 'acknowledged' : 'resolved');
      } else if (daysAgo < 7) {
        status = Math.random() < 0.3 ? 'active' : (Math.random() < 0.5 ? 'acknowledged' : 'resolved');
      } else {
        status = Math.random() < 0.1 ? 'acknowledged' : 'resolved';
      }
      
      // Critical alerts are less common
      let severity: typeof severities[number];
      const severityRand = Math.random();
      if (severityRand < 0.05) severity = 'critical';
      else if (severityRand < 0.15) severity = 'high';
      else if (severityRand < 0.40) severity = 'medium';
      else if (severityRand < 0.70) severity = 'low';
      else severity = 'info';
      
      // Make critical alerts more likely to be active
      if (severity === 'critical' && daysAgo < 3) {
        status = Math.random() < 0.8 ? 'active' : 'acknowledged';
      }
      
      const timestamp = new Date(
        baseDate.getTime() + 
        Math.floor(Math.random() * 24 * 60) * 60 * 1000 // Random time during the day
      );
      
      const alert = {
        workUnitId: workUnits[Math.floor(Math.random() * workUnits.length)].id,
        alertType,
        severity,
        message,
        status,
        timestamp,
        acknowledgedBy: status !== 'active' ? `operator${Math.floor(Math.random() * 10) + 1}` : null,
        acknowledgedAt: status !== 'active' ? subMinutes(timestamp, Math.floor(Math.random() * 30) + 5) : null,
        resolvedBy: status === 'resolved' ? `technician${Math.floor(Math.random() * 5) + 1}` : null,
        resolvedAt: status === 'resolved' ? subMinutes(timestamp, Math.floor(Math.random() * 120) + 30) : null,
        notes: status === 'resolved' ? 'Issue has been resolved and verified.' : null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      alerts.push(alert);
    }
  }

  // Clear existing alerts
  await prisma.alert.deleteMany();

  // Insert new alerts
  const result = await prisma.alert.createMany({
    data: alerts
  });

  console.log(`Seeded ${result.count} alerts`);
}

async function main() {
  try {
    await seedAlerts();
  } catch (error) {
    console.error('Error seeding alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
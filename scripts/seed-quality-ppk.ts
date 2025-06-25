/**
 * Seed Quality Metrics with PPK values
 * Adds sample quality data including ppk (Process Performance Index)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedQualityWithPpk() {
  console.log('🔧 Seeding quality metrics with PPK values...');

  try {
    const now = new Date();
    const qualityData = [];

    // Generate quality metrics for different parameters
    const parameters = ['Temperature', 'Pressure', 'Dimension', 'Weight', 'Thickness'];
    const shifts = ['Morning', 'Afternoon', 'Night'];
    
    for (let i = 0; i < 100; i++) {
      const parameter = parameters[Math.floor(Math.random() * parameters.length)];
      const shift = shifts[Math.floor(Math.random() * shifts.length)];
      const nominal = 100;
      const tolerance = 5;
      
      // Generate realistic measurement value with some variation
      const value = nominal + (Math.random() - 0.5) * tolerance * 2;
      const isWithinSpec = value >= (nominal - tolerance) && value <= (nominal + tolerance);
      
      // Calculate realistic Cpk and Ppk values
      // Ppk is typically slightly lower than Cpk as it considers long-term variation
      const cpk = 1.33 + (Math.random() - 0.5) * 0.5; // Range: 1.08 to 1.58
      const ppk = cpk - 0.1 - Math.random() * 0.1; // Ppk is 0.1-0.2 lower than Cpk
      
      qualityData.push({
        timestamp: new Date(now.getTime() - i * 15 * 60 * 1000), // 15 min intervals
        parameter,
        value,
        uom: parameter === 'Temperature' ? '°C' : parameter === 'Pressure' ? 'PSI' : 'mm',
        nominal,
        lowerLimit: nominal - tolerance,
        upperLimit: nominal + tolerance,
        isWithinSpec,
        isInControl: true,
        deviation: Math.abs(value - nominal),
        cpk: Math.max(0, cpk),
        ppk: Math.max(0, ppk), // New PPK field
        qualityGrade: isWithinSpec ? 'A' : 'B',
        shift,
        batchNumber: `BATCH-${Math.floor(i / 10) + 1}`,
        inspectionType: 'in-process',
        equipmentId: `LINE-${Math.floor(Math.random() * 3) + 1}`,
      });
    }

    // Insert quality metrics
    const result = await prisma.qualityMetric.createMany({
      data: qualityData,
      skipDuplicates: true,
    });

    console.log(`✅ Successfully seeded ${result.count} quality metrics with PPK values`);

    // Verify the data
    const sampleMetrics = await prisma.qualityMetric.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        parameter: true,
        value: true,
        cpk: true,
        ppk: true,
        isWithinSpec: true,
      }
    });

    console.log('\n📊 Sample quality metrics:');
    sampleMetrics.forEach(metric => {
      console.log(`- ${metric.parameter}: Value=${metric.value?.toFixed(2)}, Cpk=${metric.cpk?.toFixed(2)}, Ppk=${metric.ppk?.toFixed(2)}, Within Spec=${metric.isWithinSpec}`);
    });

  } catch (error) {
    console.error('❌ Error seeding quality metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedQualityWithPpk()
  .catch(console.error)
  .finally(() => process.exit());
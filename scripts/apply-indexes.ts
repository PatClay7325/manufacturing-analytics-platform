/**
 * Apply Performance Indexes to Manufacturing Database
 * Run this after initial data load for optimal performance
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function applyIndexes() {
  console.log('🚀 Applying performance indexes to database...');
  
  try {
    // Read the indexes SQL file
    const indexesPath = path.join(__dirname, '..', 'prisma', 'schema-indexes.sql');
    const indexesSql = await fs.readFile(indexesPath, 'utf-8');
    
    // Split into individual statements
    const statements = indexesSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} index statements to apply`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (const statement of statements) {
      try {
        console.log(`\n⚙️  Executing: ${statement.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log('✅ Success');
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('⏭️  Skipped - Index already exists');
          skipCount++;
        } else {
          console.error('❌ Error:', error.message);
          errorCount++;
        }
      }
    }
    
    console.log('\n📈 Index Application Summary:');
    console.log(`✅ Successfully created: ${successCount} indexes`);
    console.log(`⏭️  Already existed: ${skipCount} indexes`);
    console.log(`❌ Failed: ${errorCount} indexes`);
    
    // Verify indexes
    console.log('\n🔍 Verifying indexes...');
    const verifyResults = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (
          'PerformanceMetric', 'EquipmentHealth', 'Alert', 
          'QualityMetric', 'MaintenanceRecord', 'EnergyMetric',
          'ProductionLineMetric', 'ShiftReport', 'WorkUnit'
        )
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;
    
    console.log(`\n✅ Found ${(verifyResults as any[]).length} custom indexes in database`);
    
    // Performance test
    console.log('\n⚡ Testing query performance...');
    
    console.time('OEE Query');
    await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    console.timeEnd('OEE Query');
    
    console.time('Equipment Health Query');
    await prisma.equipmentHealth.findMany({
      where: {
        riskLevel: 'high',
        nextMaintenanceDue: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    console.timeEnd('Equipment Health Query');
    
    console.time('Active Alerts Query');
    await prisma.alert.findMany({
      where: {
        status: { in: ['active', 'acknowledged'] },
        severity: { in: ['critical', 'high'] }
      },
      orderBy: { timestamp: 'desc' }
    });
    console.timeEnd('Active Alerts Query');
    
    console.log('\n🎉 Index optimization complete!');
    
  } catch (error) {
    console.error('❌ Fatal error during index application:', error);
    throw error;
  }
}

async function main() {
  try {
    await applyIndexes();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export default applyIndexes;
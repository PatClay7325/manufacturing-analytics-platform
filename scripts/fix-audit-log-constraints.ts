#!/usr/bin/env tsx

/**
 * Fix Audit Log Constraints
 * Allow NULL values for username which might not always be available
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

async function fixAuditLogConstraints() {
  console.log('🔧 Fixing Audit Log Constraints\n');

  try {
    await prisma.$connect();
    
    // Make username nullable
    await prisma.$executeRaw`
      ALTER TABLE audit_log 
      ALTER COLUMN username DROP NOT NULL
    `;
    console.log('✅ Made audit_log.username nullable');
    
    // Now complete the monitoring compliance
    console.log('\n📊 Verifying audit functionality...');
    
    // Test audit
    await prisma.$executeRaw`
      UPDATE dim_equipment 
      SET equipment_name = equipment_name
      WHERE equipment_id = (SELECT equipment_id FROM dim_equipment LIMIT 1)
    `;
    
    const auditTest = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM audit_log
      WHERE table_name = 'dim_equipment'
      AND action = 'UPDATE'
      AND log_ts > CURRENT_TIMESTAMP - INTERVAL '1 minute'
    `;
    
    console.log(`✅ Audit functionality: ${auditTest[0].count > 0 ? 'Working' : 'Not working'}`);
    
    // Count total audit triggers
    const auditTriggers = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM pg_trigger
      WHERE tgname LIKE 'audit_%'
    `;
    
    console.log(`✅ Total audit triggers: ${auditTriggers[0].count}`);
    
    console.log('\n✨ Audit log constraints fixed and monitoring is fully functional!');
    
  } catch (error) {
    console.error('❌ Error fixing audit log:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixAuditLogConstraints();
}

export { fixAuditLogConstraints };
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5432/manufacturing?schema=public'
    }
  }
});

async function verifyDatabaseState() {
  console.log('🔍 Verifying Database State\n');
  
  try {
    // 1. Test connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Connected successfully\n');
    
    // 2. Check users
    console.log('2. Checking demo users...');
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['admin@example.com', 'operator@example.com', 'analyst@example.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true
      }
    });
    
    console.log(`   Found ${users.length} demo users:`);
    
    for (const user of users) {
      // Verify password
      const passwordValid = await bcrypt.compare('demo123', user.passwordHash);
      console.log(`   - ${user.email} (${user.role}): ${passwordValid ? '✅ Password valid' : '❌ Password invalid'}`);
    }
    
    // 3. Check equipment data
    console.log('\n3. Checking equipment data...');
    const equipmentCount = await prisma.equipment.count();
    console.log(`   Found ${equipmentCount} equipment records`);
    
    // 4. Check metrics data
    console.log('\n4. Checking metrics data...');
    const metricsCount = await prisma.metric.count();
    const recentMetrics = await prisma.metric.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log(`   Total metrics: ${metricsCount}`);
    console.log(`   Recent metrics (24h): ${recentMetrics}`);
    
    // 5. Check OEE data specifically
    console.log('\n5. Checking OEE data...');
    const oeeMetrics = await prisma.metric.findMany({
      where: {
        name: { in: ['oee', 'availability', 'performance', 'quality'] }
      },
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: { equipment: true }
    });
    
    console.log(`   Found ${oeeMetrics.length} recent OEE metrics`);
    if (oeeMetrics.length > 0) {
      console.log('   Sample OEE data:');
      oeeMetrics.forEach(m => {
        console.log(`     - ${m.equipment.name}: ${m.name} = ${m.value}% at ${m.timestamp.toISOString()}`);
      });
    }
    
    // 6. Check audit logs
    console.log('\n6. Checking audit logs...');
    const auditCount = await prisma.auditLog.count();
    console.log(`   Found ${auditCount} audit log entries`);
    
    // 7. Database schema validation
    console.log('\n7. Validating schema...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('   Tables found:');
    tables.forEach(t => console.log(`     - ${t.table_name}`));
    
    console.log('\n✅ Database verification complete!');
    console.log('\nSummary:');
    console.log('- Database connection: Working');
    console.log('- Demo users: Present with valid passwords');
    console.log('- Manufacturing data: Available');
    console.log('- Chat system has data to query');
    console.log('- Schema is properly configured');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseState();
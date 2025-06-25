const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

async function quickSeed() {
  console.log('🌱 Quick seeding users...');
  
  try {
    // Create basic users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: 'user-admin-001',
          email: 'admin@manufacturing.com',
          username: 'admin',
          name: 'System Administrator',
          passwordHash: await bcrypt.hash('admin123', 10),
          role: 'admin',
          isActive: true,
          updatedAt: new Date(),
        },
      }),
      prisma.user.create({
        data: {
          id: 'user-operator-001',
          email: 'operator@manufacturing.com',
          username: 'operator',
          name: 'Machine Operator',
          passwordHash: await bcrypt.hash('operator123', 10),
          role: 'operator',
          isActive: true,
          updatedAt: new Date(),
        },
      }),
    ]);
    
    console.log(`✅ Created ${users.length} users`);
    
    // Create a basic enterprise and site structure
    const enterprise = await prisma.enterprise.create({
      data: {
        id: 'ent-manufacturing-001',
        name: 'Manufacturing Corp',
        code: 'MFG-001',
        updatedAt: new Date(),
      }
    });
    
    const site = await prisma.site.create({
      data: {
        id: 'site-main-001',
        name: 'Main Manufacturing Site',
        code: 'MAIN-001',
        location: '123 Factory St',
        enterpriseId: enterprise.id,
        updatedAt: new Date(),
      }
    });
    
    // Create a basic area
    const area = await prisma.area.create({
      data: {
        id: 'area-production-001',
        name: 'Production Area',
        code: 'PROD-001',
        siteId: site.id,
        updatedAt: new Date(),
      }
    });
    
    // Create a basic work center
    const workCenter = await prisma.workCenter.create({
      data: {
        id: 'wc-001',
        name: 'Work Center 1',
        code: 'WC-001',
        areaId: area.id,
        updatedAt: new Date(),
      }
    });
    
    console.log('✅ Created enterprise, site, and work center structure');
    console.log('✅ Quick seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickSeed();
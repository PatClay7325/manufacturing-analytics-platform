const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@manufacturing.local' },
      update: {},
      create: {
        email: 'admin@manufacturing.local',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✓ Admin user created:', adminUser.email);
    
    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@manufacturing.local' },
      update: {},
      create: {
        email: 'demo@manufacturing.local',
        name: 'Demo User',
        password: demoPassword,
        role: 'USER',
        isActive: true,
      },
    });
    console.log('✓ Demo user created:', demoUser.email);
    
    // Create operator user
    const operatorPassword = await bcrypt.hash('operator123', 10);
    const operatorUser = await prisma.user.upsert({
      where: { email: 'operator@manufacturing.local' },
      update: {},
      create: {
        email: 'operator@manufacturing.local',
        name: 'Operator User',
        password: operatorPassword,
        role: 'OPERATOR',
        isActive: true,
      },
    });
    console.log('✓ Operator user created:', operatorUser.email);
    
    console.log('\nDatabase setup complete!');
    console.log('\nAvailable logins:');
    console.log('  Admin:    admin@manufacturing.local / admin123');
    console.log('  Demo:     demo@manufacturing.local / demo123');
    console.log('  Operator: operator@manufacturing.local / operator123');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();

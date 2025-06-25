const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5432/manufacturing?schema=public'
    }
  }
});

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✓ Connected to database');

    console.log('\nCreating users...');
    
    // Admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@manufacturing.local' },
      update: { 
        passwordHash: adminPassword,
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true 
      },
      create: {
        email: 'admin@manufacturing.local',
        name: 'Admin User',
        passwordHash: adminPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✓ Admin user created:', admin.email);

    // Demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    const demo = await prisma.user.upsert({
      where: { email: 'demo@manufacturing.local' },
      update: { 
        passwordHash: demoPassword,
        name: 'Demo User',
        role: 'USER',
        isActive: true 
      },
      create: {
        email: 'demo@manufacturing.local',
        name: 'Demo User',
        passwordHash: demoPassword,
        role: 'USER',
        isActive: true,
      },
    });
    console.log('✓ Demo user created:', demo.email);

    // Operator user
    const operatorPassword = await bcrypt.hash('operator123', 10);
    const operator = await prisma.user.upsert({
      where: { email: 'operator@manufacturing.local' },
      update: { 
        passwordHash: operatorPassword,
        name: 'Operator User',
        role: 'OPERATOR',
        isActive: true 
      },
      create: {
        email: 'operator@manufacturing.local',
        name: 'Operator User',
        passwordHash: operatorPassword,
        role: 'OPERATOR',
        isActive: true,
      },
    });
    console.log('✓ Operator user created:', operator.email);

    // List all users
    console.log('\n✓ Setup complete! All users in database:');
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true, isActive: true }
    });
    
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) ${user.isActive ? '✓' : '✗'}`);
    });

    console.log('\n========================================');
    console.log('Login Credentials:');
    console.log('========================================');
    console.log('Admin:    admin@manufacturing.local / admin123');
    console.log('Demo:     demo@manufacturing.local / demo123');
    console.log('Operator: operator@manufacturing.local / operator123');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
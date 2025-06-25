const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Use the correct database URL with password 'password'
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
        password: adminPassword,
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true 
      },
      create: {
        email: 'admin@manufacturing.local',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✓ Admin user ready:', admin.email);

    // Demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    const demo = await prisma.user.upsert({
      where: { email: 'demo@manufacturing.local' },
      update: { 
        password: demoPassword,
        name: 'Demo User',
        role: 'USER',
        isActive: true 
      },
      create: {
        email: 'demo@manufacturing.local',
        name: 'Demo User',
        password: demoPassword,
        role: 'USER',
        isActive: true,
      },
    });
    console.log('✓ Demo user ready:', demo.email);

    // Operator user
    const operatorPassword = await bcrypt.hash('operator123', 10);
    const operator = await prisma.user.upsert({
      where: { email: 'operator@manufacturing.local' },
      update: { 
        password: operatorPassword,
        name: 'Operator User',
        role: 'OPERATOR',
        isActive: true 
      },
      create: {
        email: 'operator@manufacturing.local',
        name: 'Operator User',
        password: operatorPassword,
        role: 'OPERATOR',
        isActive: true,
      },
    });
    console.log('✓ Operator user ready:', operator.email);

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
    if (error.code === 'P1000') {
      console.error('\n⚠️  Cannot connect to database!');
      console.error('Make sure PostgreSQL is running and accessible.');
      console.error('Check that docker container "manufacturing-postgres" is running.');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
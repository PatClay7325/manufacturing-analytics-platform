import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting simple hierarchical seed...');

  // Clean database
  console.log('Cleaning database...');
  
  // Delete in reverse order of foreign key dependencies
  await prisma.alert.deleteMany({});
  await prisma.qualityMetric.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.qualityCheck.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  
  // Delete Work Unit related data
  await prisma.workUnitKPISummary.deleteMany({});
  await prisma.workUnit.deleteMany({});
  
  // Delete Work Center related data
  await prisma.workCenterKPISummary.deleteMany({});
  await prisma.workCenter.deleteMany({});
  
  // Delete Area related data
  await prisma.areaKPISummary.deleteMany({});
  await prisma.area.deleteMany({});
  
  // Delete Site related data
  await prisma.siteKPISummary.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.site.deleteMany({});
  
  // Delete Enterprise related data
  await prisma.enterpriseKPISummary.deleteMany({});
  await prisma.enterprise.deleteMany({});
  
  // Delete other data
  await prisma.dashboard.deleteMany({});
  await prisma.setting.deleteMany({});
  
  console.log('Database cleaned.');
  
  // Create Enterprise
  const enterprise = await prisma.enterprise.create({
    data: {
      id: 'ent-001',
      name: 'AdaptiveFactory Global Manufacturing',
      code: 'AFGM',
      updatedAt: new Date()
    }
  });

  // Create Site
  const site = await prisma.site.create({
    data: {
      id: 'site-na001',
      enterpriseId: enterprise.id,
      name: 'North America Manufacturing',
      code: 'NA001',
      location: 'Detroit, USA',
      updatedAt: new Date()
    }
  });

  // Create Area
  const area = await prisma.area.create({
    data: {
      id: 'area-na001-aut',
      siteId: site.id,
      name: 'Automotive Assembly',
      code: 'NA001-AUT',
      updatedAt: new Date()
    }
  });

  // Create Work Center
  const workCenter = await prisma.workCenter.create({
    data: {
      id: 'wc-na001-aut-ba',
      areaId: area.id,
      name: 'Body Assembly',
      code: 'NA001-AUT-BA',
      updatedAt: new Date()
    }
  });

  // Create Work Unit
  const workUnit = await prisma.workUnit.create({
    data: {
      id: 'wu-na001-aut-ba-rw1',
      workCenterId: workCenter.id,
      name: 'Robotic Welding Cell 1',
      code: 'WU-NA001-AUT-BA-RW1',
      equipmentType: 'Robotic Welder',
      model: 'Fanuc R-2000iC',
      serialNumber: 'RW-12345',
      manufacturerCode: 'FANUC-2000',
      installationDate: new Date('2022-01-15'),
      status: 'operational',
      location: 'Bay 1, Position A',
      updatedAt: new Date()
    }
  });

  // Create User
  const passwordHash = await hash('Password123!', 10);
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      department: 'IT',
      passwordHash,
      siteId: site.id,
      lastLogin: new Date()
    }
  });

  // Create Settings
  await prisma.setting.createMany({
    data: [
      { key: 'oee_target', value: '85', category: 'system' },
      { key: 'ollama_host', value: 'http://localhost:11434', category: 'integration' }
    ]
  });

  console.log('Simple seed completed!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
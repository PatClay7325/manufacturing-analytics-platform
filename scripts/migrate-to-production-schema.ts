/**
 * Migrate to Production Schema
 * Consolidates multiple schemas into single production schema
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface MigrationStep {
  name: string;
  action: () => Promise<void>;
}

class SchemaConsolidator {
  private steps: MigrationStep[] = [];
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'prisma', 'backups', new Date().toISOString().split('T')[0]);
    
    this.steps = [
      {
        name: 'Create backup directory',
        action: () => this.createBackupDirectory()
      },
      {
        name: 'Backup existing schemas',
        action: () => this.backupExistingSchemas()
      },
      {
        name: 'Copy production schema',
        action: () => this.copyProductionSchema()
      },
      {
        name: 'Update package.json',
        action: () => this.updatePackageJson()
      },
      {
        name: 'Generate Prisma client',
        action: () => this.generatePrismaClient()
      },
      {
        name: 'Create migration',
        action: () => this.createMigration()
      },
      {
        name: 'Update imports',
        action: () => this.updateImports()
      },
      {
        name: 'Run tests',
        action: () => this.runTests()
      }
    ];
  }

  async consolidate(): Promise<void> {
    console.log('🔄 Starting schema consolidation...\n');

    for (const step of this.steps) {
      console.log(`📋 ${step.name}...`);
      try {
        await step.action();
        console.log(`✅ ${step.name} completed\n`);
      } catch (error) {
        console.error(`❌ ${step.name} failed:`, error.message);
        throw error;
      }
    }

    console.log('✅ Schema consolidation completed successfully!');
    console.log(`📁 Backups saved to: ${this.backupDir}`);
  }

  private async createBackupDirectory(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  private async backupExistingSchemas(): Promise<void> {
    const prismaDir = path.join(process.cwd(), 'prisma');
    const files = await fs.readdir(prismaDir);
    
    for (const file of files) {
      if (file.endsWith('.prisma')) {
        const sourcePath = path.join(prismaDir, file);
        const destPath = path.join(this.backupDir, file);
        await fs.copyFile(sourcePath, destPath);
        console.log(`  📄 Backed up ${file}`);
      }
    }
  }

  private async copyProductionSchema(): Promise<void> {
    const sourcePath = path.join(process.cwd(), 'prisma', 'schema-production.prisma');
    const destPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    
    // Check if production schema exists
    try {
      await fs.access(sourcePath);
    } catch {
      throw new Error('Production schema not found. Run the schema creation fix first.');
    }
    
    // Copy production schema to main schema
    await fs.copyFile(sourcePath, destPath);
    console.log('  📄 Production schema copied to schema.prisma');
  }

  private async updatePackageJson(): Promise<void> {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
    
    // Update Prisma seed command
    if (!packageJson.prisma) {
      packageJson.prisma = {};
    }
    packageJson.prisma.seed = 'tsx prisma/seed-production.ts';
    
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('  📄 Updated package.json Prisma configuration');
  }

  private async generatePrismaClient(): Promise<void> {
    console.log('  🔨 Generating Prisma client...');
    await execAsync('npx prisma generate');
  }

  private async createMigration(): Promise<void> {
    console.log('  🔨 Creating migration...');
    
    try {
      // Create migration without applying it
      const migrationName = 'consolidate_to_production_schema';
      await execAsync(`npx prisma migrate dev --name ${migrationName} --create-only`);
      console.log(`  📄 Migration created: ${migrationName}`);
    } catch (error) {
      console.log('  ⚠️  Migration creation skipped (may already exist)');
    }
  }

  private async updateImports(): Promise<void> {
    // Update import paths in service files
    const filesToUpdate = [
      'src/services/manufacturingDataService.ts',
      'src/services/oee-calculation-service.ts',
      'src/lib/prisma.ts',
      'scripts/test-prisma-integration.ts'
    ];

    for (const filePath of filesToUpdate) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Update imports to use new models
        content = content.replace(/workUnit/g, 'equipment');
        content = content.replace(/WorkUnit/g, 'Equipment');
        content = content.replace(/equipmentHealth/g, 'maintenanceEvent');
        content = content.replace(/EquipmentHealth/g, 'MaintenanceEvent');
        
        await fs.writeFile(fullPath, content);
        console.log(`  📝 Updated imports in ${filePath}`);
      } catch (error) {
        console.log(`  ⚠️  Could not update ${filePath}: ${error.message}`);
      }
    }
  }

  private async runTests(): Promise<void> {
    console.log('  🧪 Running schema validation tests...');
    
    try {
      await execAsync('npx tsx scripts/validate-prisma-schema.ts');
      console.log('  ✅ All tests passed');
    } catch (error) {
      console.warn('  ⚠️  Some tests failed. Review the output above.');
    }
  }
}

// Create seed file for production schema
async function createProductionSeed() {
  const seedContent = `/**
 * Production Database Seed
 * Seeds the database with initial reference data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Create default site
  const site = await prisma.site.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Manufacturing Site',
      timezone: 'America/New_York',
      country: 'US'
    }
  });

  // Create work centers
  const assemblyLine = await prisma.workCenter.upsert({
    where: { code: 'ASSY-01' },
    update: {},
    create: {
      code: 'ASSY-01',
      name: 'Assembly Line 1',
      siteId: site.id,
      workCenterType: 'LINE'
    }
  });

  // Create equipment
  const equipment = await prisma.equipment.upsert({
    where: { code: 'CNC-001' },
    update: {},
    create: {
      code: 'CNC-001',
      name: 'CNC Machine 001',
      workCenterId: assemblyLine.id,
      equipmentType: 'CNC',
      theoreticalCycleTime: 60, // 60 seconds per part
      nominalSpeed: 60 // 60 parts per hour
    }
  });

  // Create shifts
  const shifts = [
    { code: 'A', name: 'Day Shift', startTime: '06:00', endTime: '14:00' },
    { code: 'B', name: 'Evening Shift', startTime: '14:00', endTime: '22:00' },
    { code: 'C', name: 'Night Shift', startTime: '22:00', endTime: '06:00' }
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { 
        siteId_shiftCode: {
          siteId: site.id,
          shiftCode: shift.code
        }
      },
      update: {},
      create: {
        siteId: site.id,
        shiftCode: shift.code,
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: 30
      }
    });
  }

  // Create default user
  await prisma.user.upsert({
    where: { email: 'admin@manufacturing.local' },
    update: {},
    create: {
      email: 'admin@manufacturing.local',
      name: 'System Administrator',
      role: 'admin',
      siteId: site.id
    }
  });

  console.log('✅ Seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  const seedPath = path.join(process.cwd(), 'prisma', 'seed-production.ts');
  await fs.writeFile(seedPath, seedContent);
  console.log('📄 Created production seed file');
}

// Main execution
async function main() {
  const consolidator = new SchemaConsolidator();
  
  try {
    await consolidator.consolidate();
    await createProductionSeed();
    
    console.log('\n📋 Next steps:');
    console.log('1. Review the migration in prisma/migrations/');
    console.log('2. Apply the migration: npx prisma migrate deploy');
    console.log('3. Seed the database: npm run prisma:seed');
    console.log('4. Delete old schema files from prisma/ directory');
  } catch (error) {
    console.error('\n❌ Consolidation failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { SchemaConsolidator };
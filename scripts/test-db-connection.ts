#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testDatabaseConnection() {
  console.log('🔧 Testing Database Connection...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.log('\nPlease set DATABASE_URL in your .env.local file');
    process.exit(1);
  }
  
  // Mask password in connection string for display
  const maskedUrl = databaseUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`📍 Connection string: ${maskedUrl}\n`);
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    console.log('1. Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully!\n');
    
    console.log('2. Checking database version...');
    const result = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
    console.log(`✅ Database version: ${result[0].version}\n`);
    
    console.log('3. Checking tables...');
    const tables = await prisma.$queryRaw<[{ tablename: string }][]>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log('✅ Found tables:');
    tables.forEach(table => console.log(`   - ${table.tablename}`));
    console.log();
    
    console.log('4. Checking record counts...');
    try {
      const counts = await Promise.all([
        prisma.equipment.count(),
        prisma.metric.count(),
        prisma.alert.count(),
        prisma.maintenanceRecord.count(),
      ]);
      
      console.log('✅ Record counts:');
      console.log(`   - Equipment: ${counts[0]}`);
      console.log(`   - Metrics: ${counts[1]}`);
      console.log(`   - Alerts: ${counts[2]}`);
      console.log(`   - Maintenance Records: ${counts[3]}`);
    } catch (e) {
      console.error('⚠️ Error counting records:', e instanceof Error ? e.message : String(e));
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.message.includes('P1001')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if PostgreSQL is running:');
      console.log('   docker ps | grep postgres');
      console.log('\n2. Start PostgreSQL if needed:');
      console.log('   docker-compose -f docker-compose.db.yml up -d');
      console.log('\n3. Check PostgreSQL logs:');
      console.log('   docker-compose -f docker-compose.db.yml logs postgres');
      console.log('\n4. Verify connection details in .env.local:');
      console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/manufacturing"');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
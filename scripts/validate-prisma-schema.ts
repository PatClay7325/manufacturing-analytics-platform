/**
 * Prisma Schema Validation Script
 * Ensures Prisma schema matches database structure
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface ValidationResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class PrismaSchemaValidator {
  private results: ValidationResult[] = [];

  async runAllValidations(): Promise<void> {
    console.log('🔍 Running Prisma Schema Validation...\n');

    // Test 1: Check if schema file exists
    await this.testSchemaFileExists();

    // Test 2: Validate schema syntax
    await this.testSchemaSyntax();

    // Test 3: Check database connection
    await this.testDatabaseConnection();

    // Test 4: Validate schema against database
    await this.testSchemaAgainstDatabase();

    // Test 5: Test all model queries
    await this.testModelQueries();

    // Test 6: Validate TimescaleDB compatibility
    await this.testTimescaleDBCompatibility();

    // Test 7: Check for required indexes
    await this.testRequiredIndexes();

    // Print results
    this.printResults();
  }

  private async testSchemaFileExists(): Promise<void> {
    console.log('Testing schema file existence...');

    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    
    try {
      await fs.access(schemaPath);
      const stats = await fs.stat(schemaPath);
      
      this.results.push({
        test: 'Schema file exists',
        passed: true,
        message: `Found at ${schemaPath} (${stats.size} bytes)`
      });
    } catch (error) {
      this.results.push({
        test: 'Schema file exists',
        passed: false,
        message: `Schema file not found at ${schemaPath}`
      });
    }
  }

  private async testSchemaSyntax(): Promise<void> {
    console.log('Testing schema syntax...');

    try {
      const { stdout, stderr } = await execAsync('npx prisma validate');
      
      this.results.push({
        test: 'Schema syntax validation',
        passed: !stderr,
        message: stderr || 'Schema syntax is valid'
      });
    } catch (error) {
      this.results.push({
        test: 'Schema syntax validation',
        passed: false,
        message: `Schema validation failed: ${error.message}`
      });
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    console.log('Testing database connection...');

    try {
      await prisma.$connect();
      
      // Test with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      this.results.push({
        test: 'Database connection',
        passed: true,
        message: 'Successfully connected to database'
      });
    } catch (error) {
      this.results.push({
        test: 'Database connection',
        passed: false,
        message: `Connection failed: ${error.message}`
      });
    }
  }

  private async testSchemaAgainstDatabase(): Promise<void> {
    console.log('Testing schema against database...');

    try {
      // Use Prisma's db pull to check if schema matches
      const { stdout, stderr } = await execAsync('npx prisma db pull --force --schema=prisma/schema-test.prisma');
      
      // Compare the pulled schema with current schema
      const currentSchema = await fs.readFile('prisma/schema.prisma', 'utf-8');
      const pulledSchema = await fs.readFile('prisma/schema-test.prisma', 'utf-8');
      
      // Clean up test file
      await fs.unlink('prisma/schema-test.prisma').catch(() => {});
      
      const schemasMatch = this.normalizeSchema(currentSchema) === this.normalizeSchema(pulledSchema);
      
      this.results.push({
        test: 'Schema matches database',
        passed: schemasMatch,
        message: schemasMatch ? 'Schema matches database structure' : 'Schema differs from database'
      });
    } catch (error) {
      this.results.push({
        test: 'Schema matches database',
        passed: false,
        message: `Schema comparison failed: ${error.message}`
      });
    }
  }

  private normalizeSchema(schema: string): string {
    // Remove comments and normalize whitespace for comparison
    return schema
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async testModelQueries(): Promise<void> {
    console.log('Testing model queries...');

    const models = [
      { name: 'Site', query: () => prisma.site.findFirst() },
      { name: 'WorkCenter', query: () => prisma.workCenter.findFirst() },
      { name: 'Equipment', query: () => prisma.equipment.findFirst() },
      { name: 'Shift', query: () => prisma.shift.findFirst() },
      { name: 'Product', query: () => prisma.product.findFirst() },
      { name: 'EquipmentState', query: () => prisma.equipmentState.findFirst() },
      { name: 'ProductionCount', query: () => prisma.productionCount.findFirst() },
      { name: 'QualityEvent', query: () => prisma.qualityEvent.findFirst() },
      { name: 'ShiftInstance', query: () => prisma.shiftInstance.findFirst() },
      { name: 'ProductionOrder', query: () => prisma.productionOrder.findFirst() },
      { name: 'OEECalculation', query: () => prisma.oEECalculation.findFirst() },
      { name: 'MaintenanceEvent', query: () => prisma.maintenanceEvent.findFirst() },
      { name: 'User', query: () => prisma.user.findFirst() },
      { name: 'Session', query: () => prisma.session.findFirst() }
    ];

    for (const model of models) {
      try {
        await model.query();
        this.results.push({
          test: `Model query: ${model.name}`,
          passed: true,
          message: 'Query executed successfully'
        });
      } catch (error) {
        this.results.push({
          test: `Model query: ${model.name}`,
          passed: false,
          message: `Query failed: ${error.message}`
        });
      }
    }
  }

  private async testTimescaleDBCompatibility(): Promise<void> {
    console.log('Testing TimescaleDB compatibility...');

    // Check if time-series tables are hypertables
    const hypertables = ['equipment_states', 'production_counts', 'quality_events', 'oee_calculations'];
    
    for (const table of hypertables) {
      try {
        const result = await prisma.$queryRaw<any[]>`
          SELECT * FROM timescaledb_information.hypertables 
          WHERE hypertable_name = ${table}
        `;

        this.results.push({
          test: `Hypertable: ${table}`,
          passed: result.length > 0,
          message: result.length > 0 ? 'Table is a hypertable' : 'Table is not a hypertable'
        });
      } catch (error) {
        this.results.push({
          test: `Hypertable: ${table}`,
          passed: false,
          message: `Could not check hypertable: ${error.message}`
        });
      }
    }

    // Check composite primary keys for time-series tables
    const compositePKs = [
      { table: 'equipment_states', columns: ['timestamp', 'equipmentId', 'startTime'] },
      { table: 'production_counts', columns: ['timestamp', 'equipmentId'] },
      { table: 'quality_events', columns: ['timestamp', 'equipmentId', 'id'] },
      { table: 'oee_calculations', columns: ['timestamp', 'equipmentId', 'shiftInstanceId'] }
    ];

    for (const pk of compositePKs) {
      try {
        const result = await prisma.$queryRaw<any[]>`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = ${pk.table}::regclass AND i.indisprimary
        `;

        const pkColumns = result.map(r => r.attname);
        const hasCorrectPK = pk.columns.every(col => 
          pkColumns.some(pkCol => pkCol.toLowerCase() === col.toLowerCase())
        );

        this.results.push({
          test: `Composite PK: ${pk.table}`,
          passed: hasCorrectPK,
          message: hasCorrectPK ? 'Correct composite key' : `Missing columns: ${pk.columns.join(', ')}`
        });
      } catch (error) {
        this.results.push({
          test: `Composite PK: ${pk.table}`,
          passed: false,
          message: `Could not check primary key: ${error.message}`
        });
      }
    }
  }

  private async testRequiredIndexes(): Promise<void> {
    console.log('Testing required indexes...');

    const requiredIndexes = [
      { table: 'equipment_states', column: 'equipmentId' },
      { table: 'equipment_states', column: 'shiftInstanceId' },
      { table: 'production_counts', column: 'equipmentId' },
      { table: 'quality_events', column: 'equipmentId' },
      { table: 'oee_calculations', column: 'equipmentId' },
      { table: 'Equipment', column: 'workCenterId' },
      { table: 'WorkCenter', column: 'siteId' }
    ];

    for (const idx of requiredIndexes) {
      try {
        const result = await prisma.$queryRaw<any[]>`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = ${idx.table} 
          AND indexdef LIKE ${'%' + idx.column + '%'}
        `;

        this.results.push({
          test: `Index: ${idx.table}.${idx.column}`,
          passed: result.length > 0,
          message: result.length > 0 ? 'Index exists' : 'Index missing'
        });
      } catch (error) {
        this.results.push({
          test: `Index: ${idx.table}.${idx.column}`,
          passed: false,
          message: `Could not check index: ${error.message}`
        });
      }
    }
  }

  private printResults(): void {
    console.log('\n📊 Validation Results Summary\n');
    console.log('─'.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    // Group results by category
    const categories = {
      'Schema Files': this.results.filter(r => r.test.includes('Schema file') || r.test.includes('syntax')),
      'Database Connection': this.results.filter(r => r.test.includes('connection') || r.test.includes('matches database')),
      'Model Queries': this.results.filter(r => r.test.includes('Model query')),
      'TimescaleDB': this.results.filter(r => r.test.includes('Hypertable') || r.test.includes('Composite PK')),
      'Indexes': this.results.filter(r => r.test.includes('Index:'))
    };

    for (const [category, tests] of Object.entries(categories)) {
      if (tests.length === 0) continue;
      
      console.log(`\n${category}:`);
      for (const test of tests) {
        const icon = test.passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.test}: ${test.message}`);
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log('─'.repeat(80));

    if (failedTests > 0) {
      console.log('\n⚠️  Some validations failed. Please review and fix the issues above.');
      console.log('\nCommon fixes:');
      console.log('  - Run: npx prisma generate');
      console.log('  - Run: npx prisma db push');
      console.log('  - Check DATABASE_URL in .env');
    } else {
      console.log('\n✅ All validations passed! The schema is properly configured.');
    }
  }
}

// Run validation
async function main() {
  const validator = new PrismaSchemaValidator();
  
  try {
    await validator.runAllValidations();
  } catch (error) {
    console.error('❌ Fatal error during validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { PrismaSchemaValidator };
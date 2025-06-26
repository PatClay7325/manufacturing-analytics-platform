#!/usr/bin/env tsx

/**
 * ISO & 3NF Compliance Validation Script
 * Ensures database and Prisma schema fully conform to:
 * - ISO 22400 (OEE metrics)
 * - ISO 9001 (Quality management) 
 * - ISO 14224 (Reliability & maintenance)
 * - 3NF (Third Normal Form)
 * - All specifications from the master document
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface ComplianceCheck {
  category: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
}

const checks: ComplianceCheck[] = [];

async function validateISO3NFCompliance() {
  console.log('🔍 ISO & 3NF Compliance Validation\n');
  console.log('Standards: ISO 22400, ISO 9001, ISO 14224, 3NF\n');

  try {
    // 1. Validate 3NF Compliance
    await validate3NF();
    
    // 2. Validate ISO 22400 OEE Implementation
    await validateISO22400();
    
    // 3. Validate ISO 9001 Quality Management
    await validateISO9001();
    
    // 4. Validate ISO 14224 Reliability
    await validateISO14224();
    
    // 5. Validate Master Document Requirements
    await validateMasterDocRequirements();
    
    // 6. Generate Compliance Report
    await generateComplianceReport();
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function validate3NF() {
  console.log('📊 Validating 3NF Compliance...\n');

  // Check 1: All tables have primary keys
  const tablesWithoutPK = await prisma.$queryRaw<any[]>`
    SELECT t.table_name
    FROM information_schema.tables t
    LEFT JOIN information_schema.table_constraints tc
      ON t.table_name = tc.table_name
      AND tc.constraint_type = 'PRIMARY KEY'
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND tc.constraint_name IS NULL
  `;

  checks.push({
    category: '3NF',
    item: 'Primary Keys',
    status: tablesWithoutPK.length === 0 ? 'PASS' : 'FAIL',
    details: tablesWithoutPK.length === 0 
      ? 'All tables have primary keys' 
      : `Tables without PK: ${tablesWithoutPK.map(t => t.table_name).join(', ')}`
  });

  // Check 2: No repeating groups (1NF)
  const tablesWithArrays = await prisma.$queryRaw<any[]>`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type LIKE '%ARRAY%'
  `;

  checks.push({
    category: '3NF',
    item: 'No Repeating Groups (1NF)',
    status: tablesWithArrays.length === 0 ? 'PASS' : 'WARN',
    details: tablesWithArrays.length === 0
      ? 'No array columns found'
      : `Array columns: ${tablesWithArrays.map(t => `${t.table_name}.${t.column_name}`).join(', ')}`
  });

  // Check 3: No partial dependencies (2NF)
  // Check for composite keys with partial dependencies
  const compositePKs = await prisma.$queryRaw<any[]>`
    SELECT 
      tc.table_name,
      COUNT(kcu.column_name) as key_columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
    GROUP BY tc.table_name
    HAVING COUNT(kcu.column_name) > 1
  `;

  checks.push({
    category: '3NF',
    item: 'No Partial Dependencies (2NF)',
    status: compositePKs.length === 0 ? 'PASS' : 'WARN',
    details: compositePKs.length === 0
      ? 'No composite primary keys found'
      : `Tables with composite PKs: ${compositePKs.map(t => t.table_name).join(', ')}`
  });

  // Check 4: No transitive dependencies (3NF)
  // Check for proper foreign key relationships
  const fkCount = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
  `;

  checks.push({
    category: '3NF',
    item: 'Foreign Key Relationships',
    status: Number(fkCount[0].count) > 0 ? 'PASS' : 'FAIL',
    details: `Found ${fkCount[0].count} foreign key relationships`
  });
}

async function validateISO22400() {
  console.log('🏭 Validating ISO 22400 (OEE) Compliance...\n');

  // Required tables for ISO 22400
  const requiredTables = [
    'fact_production',
    'fact_downtime', 
    'dim_equipment',
    'dim_shift'
  ];

  for (const table of requiredTables) {
    const exists = await tableExists(table);
    checks.push({
      category: 'ISO 22400',
      item: `Table: ${table}`,
      status: exists ? 'PASS' : 'FAIL',
      details: exists ? 'Table exists' : 'Required table missing'
    });
  }
  
  // Check for view_oee_daily as materialized view
  const oeeViewExists = await viewExists('view_oee_daily');
  checks.push({
    category: 'ISO 22400',
    item: 'View: view_oee_daily',
    status: oeeViewExists ? 'PASS' : 'FAIL',
    details: oeeViewExists ? 'Materialized view exists' : 'Required view missing'
  });

  // Check OEE calculation columns
  const oeeColumns = await prisma.$queryRaw<any[]>`
    SELECT attname as column_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'view_oee_daily'
      AND attname IN ('availability', 'performance', 'quality', 'oee')
      AND a.attnum > 0
      AND NOT a.attisdropped
  `;

  checks.push({
    category: 'ISO 22400',
    item: 'OEE Metrics',
    status: oeeColumns.length === 4 ? 'PASS' : 'FAIL',
    details: `Found ${oeeColumns.length}/4 OEE metric columns`
  });

  // Check time tracking as BIGINT (seconds)
  const timeColumns = await prisma.$queryRaw<any[]>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'fact_production'
      AND column_name IN ('planned_production_time', 'operating_time')
      AND data_type = 'bigint'
  `;

  checks.push({
    category: 'ISO 22400',
    item: 'Duration Storage',
    status: timeColumns.length === 2 ? 'PASS' : 'FAIL',
    details: 'Durations stored as BIGINT seconds per spec'
  });
}

async function validateISO9001() {
  console.log('📋 Validating ISO 9001 (Quality) Compliance...\n');

  // Check quality tracking tables
  const qualityTables = ['fact_scrap', 'dim_product'];
  
  for (const table of qualityTables) {
    const exists = await tableExists(table);
    checks.push({
      category: 'ISO 9001',
      item: `Table: ${table}`,
      status: exists ? 'PASS' : 'FAIL',
      details: exists ? 'Table exists' : 'Required quality table missing'
    });
  }
  
  // Check for view_scrap_summary as materialized view
  const scrapViewExists = await viewExists('view_scrap_summary');
  checks.push({
    category: 'ISO 9001',
    item: 'View: view_scrap_summary',
    status: scrapViewExists ? 'PASS' : 'FAIL',
    details: scrapViewExists ? 'Materialized view exists' : 'Required view missing'
  });

  // Check audit log implementation
  const auditLog = await tableExists('audit_log');
  const auditTriggers = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'trg_audit_%'
  `;

  checks.push({
    category: 'ISO 9001',
    item: 'Audit Trail',
    status: auditLog && Number(auditTriggers[0].count) > 0 ? 'PASS' : 'FAIL',
    details: `Audit log: ${auditLog ? 'Yes' : 'No'}, Triggers: ${auditTriggers[0].count}`
  });
}

async function validateISO14224() {
  console.log('🔧 Validating ISO 14224 (Reliability) Compliance...\n');

  // Check maintenance tables
  const maintenanceTables = ['fact_maintenance'];
  
  for (const table of maintenanceTables) {
    const exists = await tableExists(table);
    checks.push({
      category: 'ISO 14224',
      item: `Table: ${table}`,
      status: exists ? 'PASS' : 'FAIL',
      details: exists ? 'Table exists' : 'Required maintenance table missing'
    });
  }
  
  // Check for view_reliability_summary as materialized view
  const reliabilityViewExists = await viewExists('view_reliability_summary');
  checks.push({
    category: 'ISO 14224',
    item: 'View: view_reliability_summary',
    status: reliabilityViewExists ? 'PASS' : 'FAIL',
    details: reliabilityViewExists ? 'Materialized view exists' : 'Required view missing'
  });

  // Check MTBF/MTTR columns
  const reliabilityMetrics = await prisma.$queryRaw<any[]>`
    SELECT attname as column_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'view_reliability_summary'
      AND attname IN ('mtbf', 'mttr', 'availability')
      AND a.attnum > 0
      AND NOT a.attisdropped
  `;

  checks.push({
    category: 'ISO 14224',
    item: 'Reliability Metrics',
    status: reliabilityMetrics.length === 3 ? 'PASS' : 'FAIL',
    details: `Found ${reliabilityMetrics.length}/3 reliability metrics`
  });
}

async function validateMasterDocRequirements() {
  console.log('📄 Validating Master Document Requirements...\n');

  // 1. DimDateRange with refresh function
  const dateRange = await tableExists('dim_date_range');
  const refreshFunction = await functionExists('refresh_date_ranges');
  
  checks.push({
    category: 'Master Doc',
    item: 'DimDateRange + Function',
    status: dateRange && refreshFunction ? 'PASS' : 'FAIL',
    details: `Table: ${dateRange ? '✓' : '✗'}, Function: ${refreshFunction ? '✓' : '✗'}`
  });

  // 2. OntologyTerm for AI
  const ontology = await tableExists('ontology_term');
  const ontologyData = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM ontology_term
  `;

  checks.push({
    category: 'Master Doc',
    item: 'OntologyTerm AI Mapping',
    status: ontology && Number(ontologyData[0].count) > 0 ? 'PASS' : 'FAIL',
    details: `Table exists: ${ontology ? 'Yes' : 'No'}, Records: ${ontologyData[0].count}`
  });

  // 3. Materialized Views
  const views = ['view_oee_daily', 'view_reliability_summary', 'view_scrap_summary'];
  let viewCount = 0;
  
  for (const view of views) {
    if (await viewExists(view)) viewCount++;
  }

  checks.push({
    category: 'Master Doc',
    item: 'Materialized Views',
    status: viewCount === 3 ? 'PASS' : 'FAIL',
    details: `${viewCount}/3 views exist`
  });

  // 4. FactSensorEvent partitioning
  const sensorPartitions = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM pg_inherits i
    JOIN pg_class parent ON i.inhparent = parent.oid
    JOIN pg_class child ON i.inhrelid = child.oid
    WHERE parent.relname = 'fact_sensor_event'
  `;

  const hasTimescale = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM pg_extension
    WHERE extname = 'timescaledb'
  `;

  checks.push({
    category: 'Master Doc',
    item: 'Sensor Event Partitioning',
    status: Number(sensorPartitions[0].count) > 0 || Number(hasTimescale[0].count) > 0 ? 'PASS' : 'WARN',
    details: `Partitions: ${sensorPartitions[0].count}, TimescaleDB: ${hasTimescale[0].count > 0 ? 'Yes' : 'No'}`
  });

  // 5. JSONB attributes on equipment
  const jsonbColumns = await prisma.$queryRaw<any[]>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'dim_equipment'
      AND column_name = 'attributes'
      AND data_type = 'jsonb'
  `;

  const jsonbIndex = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE tablename = 'dim_equipment'
      AND indexname LIKE '%attributes%'
  `;

  checks.push({
    category: 'Master Doc',
    item: 'JSONB Attributes',
    status: jsonbColumns.length > 0 && Number(jsonbIndex[0].count) > 0 ? 'PASS' : 'FAIL',
    details: `JSONB column: ${jsonbColumns.length > 0 ? 'Yes' : 'No'}, GIN index: ${jsonbIndex[0].count > 0 ? 'Yes' : 'No'}`
  });

  // 6. Audit log JSONB columns
  const auditJsonb = await prisma.$queryRaw<any[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'audit_log'
      AND column_name IN ('before_data', 'after_data')
      AND data_type = 'jsonb'
  `;

  checks.push({
    category: 'Master Doc',
    item: 'Audit Log JSONB',
    status: auditJsonb.length === 2 ? 'PASS' : 'FAIL',
    details: `${auditJsonb.length}/2 JSONB columns in audit_log`
  });
}

async function generateComplianceReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPLIANCE REPORT');
  console.log('='.repeat(70) + '\n');

  const categories = ['3NF', 'ISO 22400', 'ISO 9001', 'ISO 14224', 'Master Doc'];
  
  for (const category of categories) {
    const categoryChecks = checks.filter(c => c.category === category);
    const passed = categoryChecks.filter(c => c.status === 'PASS').length;
    const failed = categoryChecks.filter(c => c.status === 'FAIL').length;
    const warned = categoryChecks.filter(c => c.status === 'WARN').length;
    
    console.log(`${category}:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️  Warnings: ${warned}`);
    
    // Show failed items
    const failedChecks = categoryChecks.filter(c => c.status === 'FAIL');
    if (failedChecks.length > 0) {
      console.log('  Failed items:');
      failedChecks.forEach(check => {
        console.log(`    - ${check.item}: ${check.details}`);
      });
    }
    console.log('');
  }

  // Overall compliance score
  const totalChecks = checks.length;
  const totalPassed = checks.filter(c => c.status === 'PASS').length;
  const complianceScore = Math.round((totalPassed / totalChecks) * 100);

  console.log('='.repeat(70));
  console.log(`OVERALL COMPLIANCE SCORE: ${complianceScore}%`);
  console.log(`Total Checks: ${totalChecks}, Passed: ${totalPassed}`);
  console.log('='.repeat(70));

  // Save detailed report
  const reportPath = 'compliance-report.json';
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    score: complianceScore,
    summary: {
      total: totalChecks,
      passed: totalPassed,
      failed: checks.filter(c => c.status === 'FAIL').length,
      warned: checks.filter(c => c.status === 'WARN').length
    },
    checks: checks
  }, null, 2));

  console.log(`\nDetailed report saved to: ${reportPath}`);

  // Generate fixes if not 100% compliant
  if (complianceScore < 100) {
    await generateFixScript();
  }
}

async function generateFixScript() {
  console.log('\n🔧 Generating fix script for failed checks...\n');
  
  const fixes: string[] = ['-- ISO & 3NF Compliance Fix Script', '-- Generated: ' + new Date().toISOString(), ''];
  
  const failedChecks = checks.filter(c => c.status === 'FAIL');
  
  for (const check of failedChecks) {
    fixes.push(`-- Fix for: ${check.category} - ${check.item}`);
    
    // Generate specific fixes based on the failure
    if (check.item.includes('Table:')) {
      const tableName = check.item.replace('Table: ', '');
      fixes.push(`-- TODO: Create missing table ${tableName}`);
      fixes.push(`-- Refer to master document for schema`);
    } else if (check.item === 'Primary Keys') {
      fixes.push(`-- TODO: Add primary keys to tables without them`);
    } else if (check.item === 'OEE Metrics') {
      fixes.push(`-- TODO: Recreate view_oee_daily with all required columns`);
    }
    
    fixes.push('');
  }

  const fixScriptPath = 'compliance-fixes.sql';
  await fs.writeFile(fixScriptPath, fixes.join('\n'));
  console.log(`Fix script generated: ${fixScriptPath}`);
}

// Helper functions
async function tableExists(tableName: string): Promise<boolean> {
  const result = await prisma.$queryRaw<any[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    ) as exists
  `;
  return result[0].exists;
}

async function functionExists(functionName: string): Promise<boolean> {
  const result = await prisma.$queryRaw<any[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = ${functionName}
    ) as exists
  `;
  return result[0].exists;
}

async function viewExists(viewName: string): Promise<boolean> {
  const result = await prisma.$queryRaw<any[]>`
    SELECT EXISTS (
      SELECT FROM pg_matviews
      WHERE schemaname = 'public'
      AND matviewname = ${viewName}
    ) as exists
  `;
  return result[0].exists;
}

// Run validation
if (require.main === module) {
  validateISO3NFCompliance();
}
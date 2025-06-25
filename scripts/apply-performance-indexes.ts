#!/usr/bin/env ts-node

/**
 * Apply performance optimization indexes to the database
 */

import { prisma } from '../src/lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/lib/logger';

async function applyIndexes() {
  try {
    logger.info('Applying performance optimization indexes...');

    // Read the SQL file
    const sqlPath = join(__dirname, '../prisma/migrations/add_performance_indexes.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement + ';');
        logger.info(`✓ Applied: ${statement.substring(0, 50)}...`);
        successCount++;
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          logger.info(`↷ Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          logger.error(`✗ Failed: ${statement.substring(0, 50)}...`, error.message);
          errorCount++;
        }
      }
    }

    logger.info(`\nIndex application complete:`);
    logger.info(`✓ Successfully applied: ${successCount}`);
    logger.info(`✗ Failed: ${errorCount}`);

    // Verify indexes
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    logger.info(`\nTotal indexes in database: ${(indexes as any[]).length}`);

  } catch (error) {
    logger.error('Failed to apply indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  applyIndexes()
    .then(() => {
      logger.info('Index application completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Index application failed:', error);
      process.exit(1);
    });
}

export { applyIndexes };
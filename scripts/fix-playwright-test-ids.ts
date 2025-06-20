#!/usr/bin/env node

/**
 * Script to add missing test IDs to components for Playwright tests
 * This script analyzes failing tests and adds the required data-testid attributes
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface TestIdMapping {
  file: string;
  updates: Array<{
    search: string;
    replace: string;
    description: string;
  }>;
}

const testIdMappings: TestIdMapping[] = [
  // Alert List Component
  {
    file: 'src/components/alerts/AlertList.tsx',
    updates: [
      {
        search: '<div data-testid="alert-list">',
        replace: '<div data-testid="alerts-list">',
        description: 'Fix alert list container test ID'
      },
      {
        search: 'data-testid="alert-search"',
        replace: 'data-testid="alert-search-input"',
        description: 'Fix alert search input test ID'
      }
    ]
  },
  
  // Alert Card Component
  {
    file: 'src/components/alerts/AlertCard.tsx',
    updates: [
      {
        search: 'data-testid="alert-card"',
        replace: `data-testid={\`alert-item-\${alert?.id}\`}`,
        description: 'Add dynamic alert item test ID'
      },
      {
        search: '<AlertBadge type="severity" value={alert?.severity} />',
        replace: '<AlertBadge type="severity" value={alert?.severity} data-testid="alert-severity" />',
        description: 'Add severity badge test ID'
      },
      {
        search: '<AlertBadge type="status" value={alert?.status} />',
        replace: '<AlertBadge type="status" value={alert?.status} data-testid="alert-status" />',
        description: 'Add status badge test ID'
      },
      {
        search: '<span className="text-sm text-gray-500">',
        replace: '<span className="text-sm text-gray-500" data-testid="alert-timestamp">',
        description: 'Add timestamp test ID'
      },
      {
        search: '<span className="ml-1">{alert?.sourceName || alert?.source}</span>',
        replace: '<span className="ml-1" data-testid="alert-equipment">{alert?.sourceName || alert?.source}</span>',
        description: 'Add equipment/source test ID'
      },
      {
        search: '{"description" in alert && (\n          <p className="text-sm text-gray-600 mb-4">{alert?.description}</p>',
        replace: '{"description" in alert && (\n          <p className="text-sm text-gray-600 mb-4" data-testid="alert-description">{alert?.description}</p>',
        description: 'Add description test ID'
      }
    ]
  },

  // Alert Badge Component
  {
    file: 'src/components/alerts/AlertBadge.tsx',
    updates: [
      {
        search: 'return (',
        replace: 'const testId = props["data-testid"];\n  return (',
        description: 'Add support for data-testid prop'
      },
      {
        search: '<span className={`inline-flex',
        replace: '<span data-testid={testId} className={`inline-flex',
        description: 'Apply data-testid to badge span'
      }
    ]
  },

  // Alert Statistics Component
  {
    file: 'src/components/alerts/AlertStatistics.tsx',
    updates: [
      {
        search: '<div className="grid',
        replace: '<div data-testid="alert-statistics" className="grid',
        description: 'Add statistics container test ID'
      }
    ]
  },

  // Alert Page
  {
    file: 'src/app/alerts/page.tsx',
    updates: [
      {
        search: 'Manage Notifications',
        replace: 'Manage Notifications',
        description: 'Already has button - need to add specific test IDs later'
      }
    ]
  },

  // Dashboard Page and Components
  {
    file: 'src/app/dashboard/page.tsx',
    updates: [
      {
        search: '<div className="grid',
        replace: '<div data-testid="dashboard-grid" className="grid',
        description: 'Add dashboard grid test ID'
      }
    ]
  },

  // Equipment List Component
  {
    file: 'src/components/equipment/EquipmentList.tsx',
    updates: [
      {
        search: '<div className="grid',
        replace: '<div data-testid="equipment-grid" className="grid',
        description: 'Add equipment grid test ID'
      }
    ]
  },

  // Equipment Card Component
  {
    file: 'src/components/equipment/EquipmentCard.tsx',
    updates: [
      {
        search: '<div className="bg-white',
        replace: '<div data-testid={`equipment-item-${equipment?.id}`} className="bg-white',
        description: 'Add dynamic equipment item test ID'
      }
    ]
  }
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function updateFile(mapping: TestIdMapping): Promise<void> {
  const filePath = path.join(process.cwd(), mapping.file);
  
  if (!await fileExists(filePath)) {
    console.log(`⚠️  File not found: ${mapping.file}`);
    return;
  }

  let content = await fs.readFile(filePath, 'utf-8');
  let modified = false;

  for (const update of mapping.updates) {
    if (content.includes(update.search)) {
      content = content.replace(update.search, update.replace);
      modified = true;
      console.log(`✅ ${mapping.file}: ${update.description}`);
    } else {
      console.log(`⚠️  ${mapping.file}: Could not find "${update.search.substring(0, 50)}..."`);
    }
  }

  if (modified) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`💾 Saved ${mapping.file}\n`);
  }
}

async function main() {
  console.log('🔧 Adding missing test IDs for Playwright tests...\n');

  for (const mapping of testIdMappings) {
    await updateFile(mapping);
  }

  console.log('\n✨ Test ID updates complete!');
  console.log('\nNext steps:');
  console.log('1. Review the changes made to the components');
  console.log('2. Manually add any complex test IDs that require more context');
  console.log('3. Run: npm run test:e2e to verify the fixes');
}

main().catch(console.error);
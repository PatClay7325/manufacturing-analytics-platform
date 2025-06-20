const fs = require('fs');

const files = [
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/alerts/AlertStatistics.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/app/diagnostics/DiagnosticsPageContent.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/app/api/chat/route-intelligent.ts',
  '/mnt/d/Source/manufacturing-analytics-platform/src/core/api-gateway/middleware/TenantResolutionMiddleware.ts',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/dashboard/DashboardEditor.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/dashboard/VariableManager.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/diagnostics/DiagnosticCharts.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/equipment/EquipmentList.tsx'
];

let totalFixed = 0;

console.log('🔧 Fixing double parentheses in optional chaining...\n');

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Fix patterns like .((array || [])) -> .(array || [])
    content = content.replace(/\.\(\(([^)]+\|\|\s*\[[^\]]*\])\)\)/g, '.($1)');
    
    // Fix patterns like [...((array || []))] -> [...(array || [])]
    content = content.replace(/\[\.\.\.\(\(([^)]+\|\|\s*\[[^\]]*\])\)\)\]/g, '[...($1)]');
    
    // Fix patterns like ...((array || [])) -> ...(array || [])
    content = content.replace(/\.\.\.\(\(([^)]+\|\|\s*\[[^\]]*\])\)\)/g, '...($1)');
    
    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${file.split('/').pop()}`);
      totalFixed++;
    } else {
      console.log(`⏭️  No changes needed: ${file.split('/').pop()}`);
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}: ${error.message}`);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with double parentheses issues!`);
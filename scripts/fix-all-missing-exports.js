#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define components that need both default and named exports
const COMPONENTS_TO_FIX = [
  'src/components/layout/DashboardLayout.tsx',
  'src/components/layout/PageLayout.tsx', 
  'src/components/dashboard/ManufacturingDashboard.tsx',
  'src/components/common/LoadingSpinner.tsx',
  'src/components/common/TabNavigation.tsx',
  'src/components/panels/TimeSeriesPanel.tsx',
  'src/components/panels/StatPanel.tsx',
  'src/components/dashboard/panels/GaugePanel.tsx',
  'src/components/dashboard/panels/BarChartPanel.tsx',
  'src/components/dashboard/panels/TablePanel.tsx',
  'src/components/dashboard/panels/HeatmapPanel.tsx',
  'src/components/dashboard/panels/TextPanel.tsx',
  'src/components/dashboard/panels/TimeSeriesPanel.tsx',
  'src/components/dashboard/panels/StatPanel.tsx',
  'src/components/dashboard/panels/PieChartPanel.tsx',
  'src/components/explore/ExploreVisualization.tsx',
  'src/components/explore/QueryEditor.tsx',
  'src/components/dashboard/DashboardViewer.tsx'
];

function addExports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Extract component name from file path
    const fileName = path.basename(filePath, '.tsx');
    
    // Check if the file already has exports
    if (content.includes(`export default ${fileName}`) && content.includes(`export { ${fileName} }`)) {
      console.log(`✅ ${filePath} - Already has both exports`);
      return true;
    }
    
    // Look for function component declaration
    const functionMatch = content.match(new RegExp(`(function|const)\\s+${fileName}[^}]+`, 'm'));
    
    if (!functionMatch) {
      console.log(`⚠️  No function found for ${fileName} in ${filePath}`);
      return false;
    }
    
    // Add exports at the end if they don't exist
    if (!content.includes(`export default ${fileName}`)) {
      content += `\n\nexport default ${fileName};`;
    }
    
    if (!content.includes(`export { ${fileName} }`)) {
      content += `\nexport { ${fileName} };`;
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed exports for ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing missing component exports...\n');
  
  let fixed = 0;
  let total = COMPONENTS_TO_FIX.length;
  
  for (const componentPath of COMPONENTS_TO_FIX) {
    if (addExports(componentPath)) {
      fixed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed}/${total} components`);
  console.log(`   Remaining: ${total - fixed} components`);
  
  if (fixed === total) {
    console.log('\n🎉 All component exports fixed successfully!');
  } else {
    console.log('\n⚠️  Some components still need manual attention.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { addExports };
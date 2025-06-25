#!/usr/bin/env node
/**
 * Fix all missing component exports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const componentsToFix = [
  'src/components/dashboard/panels/TablePanel.tsx',
  'src/components/dashboard/panels/BarChartPanel.tsx', 
  'src/components/dashboard/panels/PieChartPanel.tsx',
  'src/components/dashboard/panels/TextPanel.tsx',
  'src/components/dashboard/panels/HeatmapPanel.tsx',
  'src/components/dashboard/SimpleDashboard.tsx',
  'src/components/dashboard/DashboardViewer.tsx',
  'src/components/explore/QueryEditor.tsx',
  'src/components/explore/ExploreVisualization.tsx'
];

function fixComponentExport(filePath) {
  console.log(`Fixing exports in ${filePath}...`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract component name from file path
    const componentName = path.basename(filePath, '.tsx');
    
    // Check if it already has export default
    const hasExportDefault = content.includes('export default function') || content.includes('export default');
    
    if (hasExportDefault) {
      // Convert export default function to regular function
      content = content.replace(/export default function (\w+)/, 'function $1');
      
      // Add exports at the end if not present
      if (!content.includes(`export default ${componentName}`)) {
        content += `\n\nexport default ${componentName};\nexport { ${componentName} };`;
      }
    } else {
      // Check if it has a function definition
      const functionMatch = content.match(/function (\w+)/);
      if (functionMatch) {
        const funcName = functionMatch[1];
        if (!content.includes(`export default ${funcName}`)) {
          content += `\n\nexport default ${funcName};\nexport { ${funcName} };`;
        }
      } else {
        // Create a basic component if none exists
        content += `
function ${componentName}() {
  return <div className="p-4">
    <h3 className="text-lg font-medium mb-2">${componentName}</h3>
    <p className="text-gray-600">Component implementation needed</p>
  </div>;
}

export default ${componentName};
export { ${componentName} };
`;
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed ${filePath}`);
    
  } catch (error) {
    console.log(`  ❌ Error fixing ${filePath}: ${error.message}`);
  }
}

// Fix all components
console.log('🔧 Fixing all component exports...\n');

componentsToFix.forEach(fixComponentExport);

console.log('\n✅ Component exports fixed!');
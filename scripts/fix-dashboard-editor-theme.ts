#!/usr/bin/env tsx

/**
 * Fix DashboardEditor component to use light theme
 */

import * as fs from 'fs';
import * as path from 'path';

const fixDashboardEditorTheme = () => {
  const filePath = path.join(process.cwd(), 'src/components/dashboard/DashboardEditor.tsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('DashboardEditor.tsx not found');
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Color replacements for light theme
  const replacements = [
    // Background colors
    { from: /bg-gray-900/g, to: 'bg-gray-50' },
    { from: /bg-gray-800/g, to: 'bg-white' },
    { from: /bg-gray-700/g, to: 'bg-gray-100' },
    { from: /bg-gray-600/g, to: 'bg-gray-200' },
    
    // Border colors
    { from: /border-gray-700/g, to: 'border-gray-200' },
    { from: /border-gray-600/g, to: 'border-gray-300' },
    
    // Text colors
    { from: /text-white/g, to: 'text-gray-900' },
    { from: /text-gray-300/g, to: 'text-gray-700' },
    { from: /text-gray-400/g, to: 'text-gray-600' },
    { from: /text-red-400/g, to: 'text-red-600' },
    
    // Hover states
    { from: /hover:bg-gray-700/g, to: 'hover:bg-gray-100' },
    { from: /hover:bg-gray-600/g, to: 'hover:bg-gray-200' },
    { from: /hover:bg-gray-800/g, to: 'hover:bg-gray-50' },
    
    // Focus states
    { from: /focus:bg-gray-700/g, to: 'focus:bg-gray-100' },
    { from: /focus:border-gray-500/g, to: 'focus:border-gray-400' },
    
    // Ring colors
    { from: /ring-gray-600/g, to: 'ring-gray-300' },
    { from: /ring-gray-700/g, to: 'ring-gray-200' }
  ];
  
  // Apply replacements
  replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅ Updated DashboardEditor.tsx to use light theme');
  
  // Also check and update related components
  const relatedComponents = [
    'src/components/dashboard/DashboardToolbar.tsx',
    'src/components/dashboard/GridLayout.tsx',
    'src/components/dashboard/PanelFrame.tsx',
    'src/components/dashboard/SaveDashboardModal.tsx'
  ];
  
  relatedComponents.forEach(componentPath => {
    const fullPath = path.join(process.cwd(), componentPath);
    if (fs.existsSync(fullPath)) {
      let componentContent = fs.readFileSync(fullPath, 'utf-8');
      let changed = false;
      
      replacements.forEach(({ from, to }) => {
        const originalContent = componentContent;
        componentContent = componentContent.replace(from, to);
        if (originalContent !== componentContent) {
          changed = true;
        }
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, componentContent, 'utf-8');
        console.log(`✅ Updated ${path.basename(componentPath)} to use light theme`);
      }
    }
  });
};

fixDashboardEditorTheme();
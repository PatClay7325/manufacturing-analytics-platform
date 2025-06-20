#!/usr/bin/env node

/**
 * Fix assignment to optional chaining expressions
 * This is a syntax error in TypeScript
 */

const fs = require('fs');
const path = require('path');

// Common patterns that need fixing
const patterns = [
  // Fix object?.property = value patterns
  {
    pattern: /(\w+)\?\.([\w.]+)\s*=(?!=)/g,
    replacement: (match, obj, prop) => {
      return `if (${obj}) { ${obj}.${prop} =`;
    },
    needsClosing: true
  },
  // Fix event handler patterns
  {
    pattern: /\be\?\.(target|currentTarget)\./g,
    replacement: 'e.$1.'
  },
  {
    pattern: /\bevent\?\.(target|currentTarget)\./g,
    replacement: 'event.$1.'
  },
  {
    pattern: /\bevt\?\.(target|currentTarget)\./g,
    replacement: 'evt.$1.'
  },
  {
    pattern: /\bev\?\.(target|currentTarget)\./g,
    replacement: 'ev.$1.'
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;
    
    // Apply simple patterns
    patterns.forEach(({ pattern, replacement, needsClosing }) => {
      if (!needsClosing) {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    });
    
    // Handle assignment to optional chaining more carefully
    // This requires analyzing the context
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for assignment to optional chaining
      const assignmentMatch = line.match(/(\w+)\?\.([\w.]+)\s*=(?!=)/);
      if (assignmentMatch && !line.includes('if (')) {
        const [fullMatch, obj, prop] = assignmentMatch;
        const indent = line.match(/^\s*/)[0];
        const afterAssignment = line.substring(line.indexOf(fullMatch) + fullMatch.length);
        
        // Check if it's a simple assignment
        if (afterAssignment.trim().endsWith(';')) {
          // Convert to if statement
          newLines.push(`${indent}if (${obj}) {`);
          newLines.push(`${indent}  ${obj}.${prop} =${afterAssignment}`);
          newLines.push(`${indent}}`);
          modified = true;
        } else {
          // For complex cases, just remove the optional chaining
          newLines.push(line.replace(/(\w+)\?\.([\w.]+)\s*=/, '$1.$2 ='));
          modified = true;
        }
      } else {
        newLines.push(line);
      }
    }
    
    if (modified) {
      content = newLines.join('\n');
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Files identified as having the issue
const filesToFix = [
  'src/app/explore/page.tsx',
  'src/components/chat/ChatInput.tsx',
  'src/components/dashboard/TimeRangePicker.tsx',
  'src/app/dashboards/edit/[id]/page.tsx',
  'src/app/alerts/[id]/page.tsx',
  'src/components/dashboard/panels/TablePanel.tsx',
  'src/components/dashboard/DashboardEditor.tsx',
  'src/components/dashboard/GridLayout.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/diagnostics/DiagnosticsPageContent.tsx',
  'src/components/dashboard/AlertRulesEditor.tsx',
  'src/components/dashboard/options/TextOptions.tsx',
  'src/components/panels/TablePanel.tsx',
  'src/components/dashboard/FieldConfigEditor.tsx',
  'src/components/diagnostics/MetricsTestPanel.tsx',
  'src/components/explore/QueryEditor.tsx',
  'src/components/dashboard/options/StatOptions.tsx',
  'src/components/dashboard/options/TimeSeriesOptions.tsx',
  'src/components/layout/DashboardLayout.tsx',
  'src/components/dashboards/DashboardSearch.tsx',
  'src/components/dashboards/DashboardFilters.tsx',
  'src/components/dashboard/TransformationsEditor.tsx',
  'src/components/dashboard/SaveDashboardModal.tsx',
  'src/components/dashboard/QueryEditor.tsx',
  'src/components/dashboard/PanelLibrary.tsx',
  'src/components/dashboard/options/TableOptions.tsx',
  'src/components/dashboard/options/GaugeOptions.tsx',
  'src/app/test-chat/page.tsx',
  'src/app/dashboards/Analytics/page.tsx'
];

console.log('🔧 Fixing optional chaining assignment errors...\n');

let fixedCount = 0;
const results = [];

filesToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    if (fixFile(fullPath)) {
      fixedCount++;
      results.push(`✅ ${file}`);
    }
  } else {
    results.push(`⚠️  ${file} - File not found`);
  }
});

console.log('\n📊 Results:\n');
results.forEach(result => console.log(result));
console.log(`\n✨ Fixed ${fixedCount} files`);
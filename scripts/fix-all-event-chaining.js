#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'src/app/alerts/[id]/page.tsx',
  'src/app/dashboards/browse/page.tsx',
  'src/app/diagnostics/DiagnosticsPageContent.tsx',
  'src/components/dashboard/AlertRulesEditor.tsx',
  'src/components/dashboard/options/TextOptions.tsx',
  'src/components/diagnostics/DiagnosticChartsEnhanced.tsx',
  'src/components/panels/TablePanel.tsx',
  'src/components/chat/ChatHistory.tsx',
  'src/components/chat/ChatInput.tsx',
  'src/components/dashboard/FieldConfigEditor.tsx',
  'src/components/diagnostics/MetricsTestPanel.tsx',
  'src/components/explore/QueryEditor.tsx',
  'src/components/dashboard/options/StatOptions.tsx',
  'src/components/dashboard/options/TimeSeriesOptions.tsx',
  'src/components/layout/DashboardLayout.tsx',
  'src/components/dashboards/DashboardSearch.tsx',
  'src/components/dashboards/DashboardFilters.tsx',
  'src/components/dashboard/TransformationsEditor.tsx',
  'src/components/dashboard/TimeRangePicker.tsx',
  'src/components/dashboard/SaveDashboardModal.tsx',
  'src/components/dashboard/QueryEditor.tsx',
  'src/components/dashboard/PanelLibrary.tsx',
  'src/components/dashboard/options/TableOptions.tsx',
  'src/components/dashboard/options/GaugeOptions.tsx',
  'src/app/test-chat/page.tsx',
  'src/app/dashboards/Analytics/page.tsx'
];

const fixFile = (filePath) => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Fix e?.target to e.target (and similar patterns)
  content = content.replace(/\be\?\.(target|currentTarget)/g, 'e.$1');
  content = content.replace(/\bevent\?\.(target|currentTarget)/g, 'event.$1');
  content = content.replace(/\bevt\?\.(target|currentTarget)/g, 'evt.$1');
  content = content.replace(/\bev\?\.(target|currentTarget)/g, 'ev.$1');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    return true;
  }
  
  return false;
};

console.log('🔧 Fixing unnecessary optional chaining on event targets...\n');

let fixedCount = 0;
const fixedFiles = [];

filesToFix.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
    fixedFiles.push(file);
  }
});

if (fixedCount > 0) {
  console.log(`✅ Fixed ${fixedCount} files:\n`);
  fixedFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
} else {
  console.log('✅ No files needed fixing!');
}
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to check
const filesToCheck = [
  'src/app/explore/page.tsx',
  'src/components/dashboard/TimeRangePicker.tsx',
  'src/components/chat/ChatInput.tsx'
];

console.log('🔍 Checking for syntax errors...\n');

filesToCheck.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    console.log(`\n📁 ${file}:`);
    
    lines.forEach((line, index) => {
      // Check for assignment to optional chaining
      if (line.match(/\?\.\w+\s*=(?!=)/) && !line.includes('==')) {
        console.log(`  Line ${index + 1}: Assignment to optional chaining`);
        console.log(`    ${line.trim()}`);
      }
      
      // Check for typeof with optional chaining
      if (line.match(/typeof\s+\w+\?\.\w+/)) {
        console.log(`  Line ${index + 1}: typeof with optional chaining`);
        console.log(`    ${line.trim()}`);
      }
      
      // Check for remaining e?.target patterns
      if (line.match(/e\?\.(target|currentTarget)/)) {
        console.log(`  Line ${index + 1}: Unnecessary optional chaining on event`);
        console.log(`    ${line.trim()}`);
      }
    });
  } else {
    console.log(`\n⚠️  ${file} - Not found`);
  }
});

console.log('\n✅ Check complete');
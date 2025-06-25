#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to convert kebab-case or lowercase to PascalCase
function toPascalCase(str) {
  return str.split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Find all page.tsx files
const files = glob.sync('src/app/**/page.tsx');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find lowercase function exports
  const regex = /export default function ([a-z][a-zA-Z0-9]*)\(\)/g;
  let match;
  let modified = false;
  let newContent = content;
  
  while ((match = regex.exec(content)) !== null) {
    const oldName = match[1];
    const newName = oldName.charAt(0).toUpperCase() + oldName.slice(1);
    
    // Replace the function name
    newContent = newContent.replace(
      `export default function ${oldName}()`,
      `export default function ${newName}()`
    );
    
    console.log(`${file}: ${oldName} -> ${newName}`);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(file, newContent);
  }
});

console.log('Component name fixing complete!');
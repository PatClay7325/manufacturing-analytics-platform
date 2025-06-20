#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Change to the project directory
process.chdir('/mnt/d/Source/manufacturing-Analytics-platform');

console.log('Running TypeScript compilation check...');
console.log('Working directory:', process.cwd());

// Run TypeScript compiler
exec('npx tsc --noEmit --skipLibCheck', (error, stdout, stderr) => {
  if (error) {
    console.error('TypeScript compilation errors found:');
    console.error(error.message);
    return;
  }
  
  if (stderr) {
    console.error('TypeScript compilation errors:');
    console.error(stderr);
    return;
  }
  
  if (stdout) {
    console.log('TypeScript output:');
    console.log(stdout);
  } else {
    console.log('✅ No TypeScript compilation errors found!');
  }
});
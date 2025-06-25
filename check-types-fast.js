#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running TypeScript type check...\n');

// Create a temporary tsconfig for faster checking
const tempConfig = {
  extends: './tsconfig.json',
  compilerOptions: {
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    incremental: true,
    tsBuildInfoFile: '.tsbuildinfo'
  },
  include: [
    'src/**/*.ts',
    'src/**/*.tsx'
  ],
  exclude: [
    'node_modules',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    'src/__tests__/**/*'
  ]
};

fs.writeFileSync('tsconfig.check.json', JSON.stringify(tempConfig, null, 2));

const tsc = spawn('npx', ['tsc', '--noEmit', '-p', 'tsconfig.check.json'], {
  stdio: 'pipe'
});

let output = '';
let errorCount = 0;
const errors = [];

tsc.stdout.on('data', (data) => {
  output += data.toString();
});

tsc.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.includes('error TS')) {
      errorCount++;
      errors.push(line);
      if (errors.length <= 20) {
        console.log(line);
      }
    }
  });
});

const timeout = setTimeout(() => {
  console.log('\n⏱️ Type check timeout - stopping');
  tsc.kill();
  cleanup();
}, 20000);

tsc.on('close', (code) => {
  clearTimeout(timeout);
  cleanup();
  
  if (errorCount > 0) {
    console.log(`\n❌ Found ${errorCount} TypeScript errors`);
    if (errors.length > 20) {
      console.log(`   (Showing first 20 errors)`);
    }
    process.exit(1);
  } else if (code === 0) {
    console.log('\n✅ No TypeScript errors found!');
    process.exit(0);
  } else {
    console.log(`\n⚠️ TypeScript check exited with code ${code}`);
    process.exit(code);
  }
});

function cleanup() {
  try {
    fs.unlinkSync('tsconfig.check.json');
  } catch (e) {
    // Ignore
  }
}
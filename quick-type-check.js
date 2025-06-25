#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 Quick TypeScript Error Scanner\n');

// Create minimal tsconfig for faster checking
const minimalConfig = {
  extends: './tsconfig.json',
  compilerOptions: {
    skipLibCheck: true,
    noEmit: true,
    incremental: false
  },
  include: [
    'src/app/**/*.tsx',
    'src/components/**/*.tsx',
    'src/lib/**/*.ts',
    'src/services/**/*.ts'
  ],
  exclude: [
    'node_modules',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx'
  ]
};

fs.writeFileSync('tsconfig.minimal.json', JSON.stringify(minimalConfig, null, 2));

const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.minimal.json'], {
  stdio: 'pipe'
});

let errorBuffer = '';
let errorCount = 0;
const errors = new Map();

tsc.stderr.on('data', (data) => {
  errorBuffer += data.toString();
});

tsc.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n');
  
  lines.forEach(line => {
    // Parse TypeScript errors
    const errorMatch = line.match(/(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/);
    if (errorMatch) {
      errorCount++;
      const [, file, line, col, code, message] = errorMatch;
      
      if (!errors.has(code)) {
        errors.set(code, []);
      }
      
      errors.get(code).push({
        file: file.replace(process.cwd() + '/', ''),
        line: parseInt(line),
        col: parseInt(col),
        message
      });
      
      // Show first occurrence of each error type
      if (errors.get(code).length === 1) {
        console.log(`\n❌ ${code}: ${message}`);
        console.log(`   📁 ${file}:${line}:${col}`);
      }
    }
  });
});

tsc.on('close', (code) => {
  // Clean up
  try {
    fs.unlinkSync('tsconfig.minimal.json');
  } catch (e) {}
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TypeScript Error Summary:');
  console.log('='.repeat(60));
  
  if (errorCount === 0) {
    console.log('✅ No TypeScript errors found!');
  } else {
    console.log(`Total errors: ${errorCount}\n`);
    
    // Group by error code
    const sortedErrors = Array.from(errors.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log('Most common errors:');
    sortedErrors.slice(0, 10).forEach(([code, instances]) => {
      console.log(`\n${code} (${instances.length} occurrences):`);
      console.log(`  ${instances[0].message}`);
      console.log(`  Example: ${instances[0].file}:${instances[0].line}`);
    });
    
    // Save detailed results
    const results = {
      totalErrors: errorCount,
      errorTypes: Object.fromEntries(errors),
      summary: sortedErrors.map(([code, instances]) => ({
        code,
        count: instances.length,
        message: instances[0].message
      }))
    };
    
    fs.writeFileSync('typescript-errors.json', JSON.stringify(results, null, 2));
    console.log('\n📝 Detailed results saved to: typescript-errors.json');
  }
  
  process.exit(code);
});
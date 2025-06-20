const { exec } = require('child_process');
const fs = require('fs');

console.log('Checking TypeScript syntax...');

// First, let's check if we can compile with TypeScript
exec('npx tsc --noEmit', { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
  if (error) {
    console.log('TypeScript compilation errors found:');
    console.log(stdout);
    console.log(stderr);
    
    // Extract and display the first few errors
    const lines = (stdout + stderr).split('\n');
    const errors = [];
    let currentError = '';
    
    for (const line of lines) {
      if (line.includes('error TS')) {
        if (currentError) errors.push(currentError);
        currentError = line;
      } else if (currentError && line.trim()) {
        currentError += '\n' + line;
      }
    }
    if (currentError) errors.push(currentError);
    
    console.log('\n=== First 10 errors ===');
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`\nError ${i + 1}:`);
      console.log(err);
    });
    
    console.log(`\nTotal errors found: ${errors.length}`);
  } else {
    console.log('✅ No TypeScript syntax errors found!');
    console.log('\nNow running Next.js build...');
    
    // If TypeScript passes, try the Next.js build
    exec('npm run build', { maxBuffer: 1024 * 1024 * 10 }, (buildError, buildStdout, buildStderr) => {
      if (buildError) {
        console.log('Build failed:');
        console.log(buildStdout);
        console.log(buildStderr);
      } else {
        console.log('✅ Build completed successfully!');
      }
    });
  }
});
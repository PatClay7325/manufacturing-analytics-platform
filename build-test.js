const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting build process...\n');

const build = spawn('npm', ['run', 'build'], {
  cwd: '/mnt/d/Source/manufacturing-analytics-platform',
  stdio: 'pipe'
});

let stdout = '';
let stderr = '';

build.stdout.on('data', (data) => {
  const text = data.toString();
  stdout += text;
  process.stdout.write(text);
});

build.stderr.on('data', (data) => {
  const text = data.toString();
  stderr += text;
  process.stderr.write(text);
});

build.on('close', (code) => {
  console.log(`\n📊 Build process completed with exit code: ${code}\n`);
  
  // Save output to file for analysis
  fs.writeFileSync('/mnt/d/Source/manufacturing-analytics-platform/build-output.log', 
    `Exit Code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
  
  if (code !== 0) {
    console.log('❌ Build failed. Errors captured in build-output.log');
    
    // Extract and display TypeScript errors
    const allOutput = stdout + stderr;
    const errorLines = allOutput.split('\n').filter(line => 
      line.includes('error TS') || 
      line.includes('Error:') ||
      line.includes('Failed to compile')
    );
    
    if (errorLines.length > 0) {
      console.log('\n🔍 Key errors found:');
      errorLines.slice(0, 10).forEach((line, i) => {
        console.log(`${i + 1}. ${line.trim()}`);
      });
    }
  } else {
    console.log('✅ Build completed successfully!');
  }
});

build.on('error', (error) => {
  console.error('❌ Failed to start build process:', error.message);
});
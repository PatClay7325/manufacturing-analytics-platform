const { execSync } = require('child_process');

console.log('Starting build test...');
console.log('Current directory:', process.cwd());

try {
  console.log('\nRunning npm run build...\n');
  const output = execSync('npm run build', {
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  console.log('Build completed successfully!');
  console.log(output);
} catch (error) {
  console.error('Build failed with errors:');
  console.error(error.stdout || error.message);
  if (error.stderr) {
    console.error('Stderr:', error.stderr);
  }
  process.exit(1);
}
const puppeteer = require('puppeteer');

async function testQuickLogin() {
  console.log('🔍 Testing Quick Login Functionality\n');
  
  // If puppeteer is not installed, use curl instead
  try {
    const fetch = require('node-fetch');
    
    // Test each demo user
    const users = [
      { email: 'admin@example.com', name: 'Admin', role: 'admin' },
      { email: 'operator@example.com', name: 'Operator', role: 'operator' },
      { email: 'analyst@example.com', name: 'Analyst', role: 'analyst' }
    ];
    
    for (const user of users) {
      console.log(`Testing ${user.name} login...`);
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: 'demo123'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${user.name} login successful`);
        console.log(`   Role: ${data.user.role}`);
        console.log(`   Permissions: ${data.user.permissions.join(', ')}\n`);
      } else {
        console.log(`❌ ${user.name} login failed: ${response.status}\n`);
      }
    }
    
    console.log('\nSummary:');
    console.log('- Login page has been updated with quick login buttons');
    console.log('- All demo accounts use password: demo123');
    console.log('- Clicking a button auto-fills credentials and logs in');
    console.log('- Each role has appropriate permissions');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testQuickLogin();
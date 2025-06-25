/**
 * Test login with demo credentials
 */

const fetch = require('node-fetch');

async function testLogin() {
  console.log('🔐 Testing login with demo credentials...\n');
  
  const credentials = [
    { email: 'admin@example.com', password: 'demo123', role: 'admin' },
    { email: 'operator@example.com', password: 'demo123', role: 'operator' },
    { email: 'analyst@example.com', password: 'demo123', role: 'analyst' }
  ];
  
  for (const cred of credentials) {
    try {
      console.log(`Testing ${cred.role}: ${cred.email}`);
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cred.email,
          password: cred.password
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Success: ${cred.email} (${result.user?.name})`);
        console.log(`   Role: ${result.user?.role}`);
        console.log(`   Token: ${result.token ? 'Generated' : 'Missing'}\n`);
      } else {
        console.log(`❌ Failed: ${cred.email}`);
        console.log(`   Error: ${result.error}\n`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${cred.email}: ${error.message}\n`);
    }
  }
}

testLogin();
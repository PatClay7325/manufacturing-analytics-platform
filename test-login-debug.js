const fetch = require('node-fetch');

async function debugLogin() {
  console.log('🔍 Debugging login issue...\n');
  
  try {
    // Test if server is running
    console.log('1. Testing server status...');
    const healthResponse = await fetch('http://localhost:3000/api/auth/me');
    console.log('   Server response:', healthResponse.status);
    
    // Test login endpoint
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'demo123'
      })
    });
    
    console.log('   Login response status:', loginResponse.status);
    const result = await loginResponse.json();
    console.log('   Login response:', result);
    
    if (loginResponse.ok) {
      console.log('✅ Login successful!');
      console.log('   User:', result.user);
      console.log('   Token:', result.token ? 'Present' : 'Missing');
    } else {
      console.log('❌ Login failed');
      console.log('   Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

debugLogin();
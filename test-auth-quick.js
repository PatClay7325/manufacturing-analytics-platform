const fetch = require('node-fetch');

async function testAuth() {
  console.log('🔍 Testing Authentication System\n');
  
  try {
    // Test login
    console.log('1. Testing login endpoint...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'demo123'
      })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log(`   User: ${data.user.name} (${data.user.role})`);
      console.log(`   Token: ${data.token ? 'Generated' : 'Missing'}\n`);
      
      // Test /me endpoint
      console.log('2. Testing /api/auth/me endpoint...');
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      
      if (meResponse.ok) {
        console.log('✅ Authentication verified!');
      } else {
        console.log('❌ /me endpoint failed:', meResponse.status);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.status);
      const error = await loginResponse.text();
      console.log('   Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('\nMake sure to:');
    console.log('1. Stop the server (Ctrl+C)');
    console.log('2. Start it again: npm run dev');
    console.log('3. Wait for "Ready" message');
    console.log('4. Run this test again');
  }
}

testAuth();
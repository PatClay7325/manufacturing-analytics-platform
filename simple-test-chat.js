const fetch = require('node-fetch');

async function testChat() {
  try {
    console.log('Testing chat API...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What equipment do we have in the production floor?' }
        ]
      })
    });

    if (!response.ok) {
      console.error('Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('\n=== Chat Response ===');
    console.log('Message:', data.message?.content || data.message);
    console.log('\n=== Context Data ===');
    console.log('Patterns detected:', data.debug?.patternsDetected);
    console.log('Data fetched:', data.debug?.dataFetched);
    
    if (data.context?.sites) {
      console.log('\n=== Sites Found ===');
      data.context.sites.forEach(site => {
        console.log(`- ${site.siteName} (${site.siteCode})`);
      });
    }
    
    if (data.context?.equipment) {
      console.log('\n=== Equipment Found ===');
      data.context.equipment.forEach(eq => {
        console.log(`- ${eq.equipmentName} (${eq.equipmentType})`);
      });
    }
    
  } catch (error) {
    console.error('Failed to test chat:', error.message);
  }
}

// Check if server is ready first
async function waitForServer() {
  console.log('Waiting for server to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/health-check');
      if (response.ok) {
        console.log('Server is ready!');
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.error('Server did not start in time');
  return false;
}

async function main() {
  const ready = await waitForServer();
  if (ready) {
    await testChat();
  }
}

main();
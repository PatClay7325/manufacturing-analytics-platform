/**
 * Fix demo user passwords and provide demo credentials
 */

const bcrypt = require('bcrypt');

async function generateDemoPasswords() {
  console.log('🔐 Generating demo user credentials...\n');
  
  // Demo password: "demo123"
  const demoPassword = 'demo123';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(demoPassword, saltRounds);
    
    console.log('Demo Credentials:');
    console.log('================');
    console.log('Email: admin@example.com');
    console.log('Password: demo123');
    console.log('Role: Admin\n');
    console.log('Email: operator@example.com');
    console.log('Password: demo123'); 
    console.log('Role: Operator\n');
    console.log('Email: analyst@example.com');
    console.log('Password: demo123');
    console.log('Role: Analyst\n');
    
    console.log('Password Hash for database:');
    console.log(hash);
    console.log('\nRun this SQL to update demo users:');
    console.log(`UPDATE "User" SET "passwordHash" = '${hash}' WHERE email IN ('admin@example.com', 'operator@example.com', 'analyst@example.com');`);
    
  } catch (error) {
    console.error('Error generating password hash:', error);
  }
}

generateDemoPasswords();
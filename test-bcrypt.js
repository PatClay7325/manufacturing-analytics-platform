const bcrypt = require('bcrypt');

async function testBcrypt() {
  const password = 'demo123';
  const hash = '$2b$10$Bpp5yjBSzJMTOOtmGVc2CufykVaChHs46mv/jveKzcmkRn/q8bs9a';
  
  console.log('Testing bcrypt verification...');
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  try {
    const isValid = await bcrypt.compare(password, hash);
    console.log('Password verification result:', isValid);
    
    if (isValid) {
      console.log('✅ Password verification SUCCESSFUL');
    } else {
      console.log('❌ Password verification FAILED');
    }
  } catch (error) {
    console.error('❌ Bcrypt error:', error);
  }
}

testBcrypt();
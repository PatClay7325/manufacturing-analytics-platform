
const { PrismaClient } = require('@prisma/client');

async function testDb() {
  // Try different connection strings
  const connectionStrings = [
    'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public',
    'postgresql://postgres:password@localhost:5432/manufacturing?schema=public',
    'postgresql://postgres:postgres@127.0.0.1:5432/manufacturing?schema=public',
  ];
  
  for (const url of connectionStrings) {
    console.log('\nTrying connection:', url);
    const prisma = new PrismaClient({
      datasources: { db: { url } }
    });
    
    try {
      await prisma.$connect();
      console.log('✅ SUCCESS! This connection string works:', url);
      
      // Update the .env file
      require('fs').writeFileSync(
        require('path').join('/mnt/d/Source/manufacturing-analytics-platform', '.env'),
        'DATABASE_URL="' + url + '"\n'
      );
      
      await prisma.$disconnect();
      return url;
    } catch (e) {
      console.log('❌ Failed:', e.message);
      await prisma.$disconnect();
    }
  }
  return null;
}

testDb().then(url => {
  if (url) {
    console.log('\n✅ Fixed! Now run: node setup-users.js');
  } else {
    console.log('\n❌ Could not connect to database. Check if PostgreSQL is running.');
  }
});

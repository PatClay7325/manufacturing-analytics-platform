const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// Force correct DATABASE_URL
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public";

const prisma = new PrismaClient();

async function fixPasswords() {
  console.log('Updating manufacturing user passwords...\n');
  
  try {
    // Generate hash for demo123
    const passwordHash = await bcrypt.hash('demo123', 10);
    console.log('Generated hash for demo123');
    
    // Update all manufacturing users
    const users = [
      'admin@manufacturing.com',
      'operator@manufacturing.com', 
      'analyst@manufacturing.com'
    ];
    
    for (const email of users) {
      const result = await prisma.user.update({
        where: { email },
        data: { passwordHash },
        select: { id: true, email: true, name: true, role: true }
      });
      
      console.log(`✅ Updated ${result.name} (${result.email}) - Role: ${result.role}`);
    }
    
    console.log('\n✅ All passwords updated to "demo123"');
    console.log('\nYou can now login with:');
    console.log('- admin@manufacturing.com / demo123');
    console.log('- operator@manufacturing.com / demo123');
    console.log('- analyst@manufacturing.com / demo123');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswords();
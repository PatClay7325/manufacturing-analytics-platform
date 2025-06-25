const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/manufacturing?schema=public'
    }
  }
});

async function updateDemoPasswords() {
  console.log('Updating demo user passwords...\n');
  
  try {
    // Generate hash for demo123
    const passwordHash = await bcrypt.hash('demo123', 10);
    console.log('Generated hash for demo123:', passwordHash);
    
    // Update all demo users
    const demoEmails = ['admin@example.com', 'operator@example.com', 'analyst@example.com'];
    
    for (const email of demoEmails) {
      const result = await prisma.user.update({
        where: { email },
        data: { passwordHash },
        select: { id: true, email: true, name: true, role: true }
      });
      
      console.log(`✅ Updated ${result.name} (${result.email}) - Role: ${result.role}`);
    }
    
    console.log('\n✅ All demo passwords updated to "demo123"');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDemoPasswords();
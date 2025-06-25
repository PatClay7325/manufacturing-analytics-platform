import { PrismaClient } from '@prisma/client';
import { defaultTemplates } from '../src/lib/email/templates';

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...');

  try {
    // Check if templates already exist
    const existingTemplates = await prisma.emailTemplate.count();
    
    if (existingTemplates > 0) {
      console.log(`✅ Email templates already exist (${existingTemplates} templates found)`);
      return;
    }

    // Create default templates
    for (const template of defaultTemplates) {
      await prisma.emailTemplate.create({
        data: {
          id: template.id,
          name: template.name,
          subject: template.subject,
          html: template.html,
          text: template.text,
          variables: template.variables,
          category: template.category,
          customizable: template.customizable,
        },
      });
      
      console.log(`✅ Created template: ${template.name}`);
    }

    console.log(`✅ Successfully seeded ${defaultTemplates.length} email templates`);
  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedEmailTemplates()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedEmailTemplates };
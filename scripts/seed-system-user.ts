/**
 * Seed System User
 * Creates a system user for automated processes
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedSystemUser() {
  console.log('👤 Creating system user...');

  try {
    // Check if system user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'system@manufacturing.local' }
    });

    if (existingUser) {
      console.log('ℹ️ System user already exists');
      return existingUser;
    }

    // Create system user
    const hashedPassword = await bcrypt.hash('system-password-2024', 10);
    
    const systemUser = await prisma.user.create({
      data: {
        id: 'system',
        email: 'system@manufacturing.local',
        name: 'System',
        username: 'system',
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
      }
    });

    console.log('✅ System user created successfully');
    return systemUser;

  } catch (error) {
    console.error('❌ Error creating system user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedSystemUser()
  .catch(console.error)
  .finally(() => process.exit());
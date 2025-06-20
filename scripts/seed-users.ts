import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding users...');

  const users = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      department: 'IT',
      password: 'admin123',
    },
    {
      email: 'operator@example.com',
      name: 'John Operator',
      role: 'operator',
      department: 'Production',
      password: 'operator123',
    },
    {
      email: 'analyst@example.com',
      name: 'Jane Analyst',
      role: 'analyst',
      department: 'Quality',
      password: 'analyst123',
    },
    {
      email: 'viewer@example.com',
      name: 'Bob Viewer',
      role: 'viewer',
      department: 'Management',
      password: 'viewer123',
    },
  ];

  for (const userData of users) {
    const { password, ...userInfo } = userData;
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (existing) {
      console.log(`User ${userInfo.email} already exists, skipping...`);
      continue;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...userInfo,
        passwordHash,
      },
    });

    console.log(`Created user: ${user.email} with role: ${user.role}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    
    // Test user query
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    // Test specific user
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    console.log('Test user found:', testUser ? 'YES' : 'NO');
    
    return NextResponse.json({
      database: 'connected',
      userCount,
      testUser: testUser ? { id: testUser.id, email: testUser.email, role: testUser.role } : null
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { error: 'Database test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

// Create a fresh Prisma client with the correct URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

export async function POST(request: NextRequest) {
  console.log('Test login endpoint called');
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('Login attempt:', email);
    
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connected');
    
    // Find user
    console.log('Finding user...');
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('User not found');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    console.log('User found:', user.id, user.email);
    
    // Verify password
    console.log('Verifying password...');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      'your-secret-key',
      { expiresIn: '24h' }
    );
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60
    });
    
    console.log('Login successful');
    return response;
    
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
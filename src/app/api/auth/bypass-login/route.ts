import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Hardcoded demo users for emergency bypass
const DEMO_USERS = {
  'admin@manufacturing.com': {
    id: 'admin-id',
    name: 'System Administrator',
    role: 'admin',
    passwordHash: '$2b$10$EfuPEnwcM547PYzfomg30.ONcShibWEbXEEolhs1jk33PDN.oPAAa' // demo123
  },
  'operator@manufacturing.com': {
    id: 'operator-id',
    name: 'Machine Operator',
    role: 'operator',
    passwordHash: '$2b$10$EfuPEnwcM547PYzfomg30.ONcShibWEbXEEolhs1jk33PDN.oPAAa' // demo123
  },
  'analyst@manufacturing.com': {
    id: 'analyst-id', 
    name: 'Data Analyst',
    role: 'analyst',
    passwordHash: '$2b$10$EfuPEnwcM547PYzfomg30.ONcShibWEbXEEolhs1jk33PDN.oPAAa' // demo123
  }
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('Bypass login attempt:', email);
    
    // Check if user exists in hardcoded list
    const user = DEMO_USERS[email as keyof typeof DEMO_USERS];
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // For bypass, just check if password is demo123
    if (password !== 'demo123') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: email, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Create response
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: email,
        name: user.name,
        role: user.role
      },
      token
    });
    
    // Set cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 86400 // 24 hours
    });
    
    console.log('Bypass login successful for:', email);
    return response;
    
  } catch (error) {
    console.error('Bypass login error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
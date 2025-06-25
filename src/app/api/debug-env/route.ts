import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'not set';
  const masked = dbUrl.replace(/postgres:([^@]+)@/, 'postgres:***@');
  
  // Extract just the password part
  const passwordMatch = dbUrl.match(/postgres:([^@]+)@/);
  const password = passwordMatch ? passwordMatch[1] : 'no password found';
  
  return NextResponse.json({
    DATABASE_URL: masked,
    password_length: password.length,
    password_starts_with: password.substring(0, 3),
    NODE_ENV: process.env.NODE_ENV,
    env_files_loaded: ['.env.local', '.env.development', '.env']
  });
}